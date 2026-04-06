import { useState, useEffect, useRef, useCallback } from 'react'
import { useClient } from '../../context/ClientContext'
import { calcAge } from '../../types'
import {
  calcProjection,
  fmt,
  fmtShort,
  type ProjectionResult,
  type IllustrationData,
} from './calcProjection'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

// ─── PDF Parser (ported from HTML) ────────────────────────────────────────────

async function parsePDF(file: File): Promise<{ extracted: IllustrationData }> {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      // @ts-ignore
      const pdfjsLib = window['pdfjs-dist/build/pdf']
      if (!pdfjsLib) {
        reject(new Error('PDF.js not loaded'))
        return
      }
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      const allItems: Array<{ str: string; x: number; y: number; page: number }> = []
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p)
        const content = await page.getTextContent()
        const viewport = page.getViewport({ scale: 1 })
        for (const item of content.items as Array<{ str: string; transform: number[] }>) {
          if (!item.str.trim()) continue
          allItems.push({
            str: item.str.trim(),
            x: Math.round(item.transform[4]),
            y: Math.round(viewport.height - item.transform[5]),
            page: p,
          })
        }
      }

      const extracted = extractStructured(allItems)
      resolve({ extracted })
    } catch (err) {
      reject(err)
    }
  })
}

// extractStructured — exact port from financial_shield_calculator.html
function extractStructured(
  items: Array<{ str: string; x: number; y: number; page: number }>
): IllustrationData {
  const result: IllustrationData = {}
  const fullText = items.map(i => i.str).join(' ')

  // ── Header fields ──
  const faceMatch = fullText.match(/Face\s*Amount[:\s]*\$?([\d,]+)/i)
  if (faceMatch) result.faceAmount = parseFloat(faceMatch[1].replace(/,/g, ''))

  const ageMatch = fullText.match(/Male\s+(\d{2})|Female\s+(\d{2})|Age\s+(\d{2})/i)
  if (ageMatch) result.issueAge = parseInt(ageMatch[1] || ageMatch[2] || ageMatch[3])

  const premMatch = fullText.match(/Initial\s*Premium[:\s]*\$?([\d,]+\.?\d*)\s*Monthly/i)
  if (premMatch) result.annualPremiumRef = parseFloat(premMatch[1].replace(/,/g, '')) * 12

  const apbMatch = fullText.match(/Additional\s*Protection\s*Benefit[:\s]*\$?([\d,]+)/i)
  if (apbMatch) result.apb = parseFloat(apbMatch[1].replace(/,/g, ''))

  // ── Detect DB Option B ──
  result.dbOptionB = /Death\s*Benefit\s*Option[:\s]*B/i.test(fullText)

  // ── Extract current illustrated crediting rate ──
  // Look for the higher of two weighted average rates shown
  const rateMatches = fullText.match(/(\d+\.\d+)\s*%/g)
  if (rateMatches) {
    const rates = rateMatches
      .map(r => parseFloat(r))
      .filter(r => r > 2 && r < 15) // plausible crediting rates
    if (rates.length >= 2) {
      result.currentCreditingRate = Math.max(...rates).toFixed(2)
    }
  }

  // ── Group items into rows by Y coordinate per page ──
  // Use 6px tolerance to handle slight vertical misalignment within a row
  // but reset grouping per page so page breaks don't merge rows
  const pageGroups: Record<number, Record<number, typeof items>> = {}
  for (const item of items) {
    const pageKey = item.page
    if (!pageGroups[pageKey]) pageGroups[pageKey] = {}
    const yKey = Math.round(item.y / 6) * 6
    if (!pageGroups[pageKey][yKey]) pageGroups[pageKey][yKey] = []
    pageGroups[pageKey][yKey].push(item)
  }

  // Flatten into sorted rows (page order, then Y order within page)
  const rows: Array<{ cells: string[]; page: number }> = []
  for (const page of Object.keys(pageGroups).map(Number).sort((a, b) => a - b)) {
    const yMap = pageGroups[page]
    for (const y of Object.keys(yMap).map(Number).sort((a, b) => a - b)) {
      const sorted = yMap[y].sort((a, b) => a.x - b.x)
      rows.push({ cells: sorted.map(i => i.str), page })
    }
  }

  // ── Extract ledger data rows ──
  // Strategy: find rows where first token is policy year (1-96)
  // and second token is age (18-120), then extract numeric columns.
  // We want the CURRENT illustrated values (higher crediting rate side).
  // For LSW FlexLife dual-column format: last 3 large numbers = current AV, CSV, Net DB.
  const ledgerRowsRaw: IllustrationData['ledgerRows'] = []

  for (const row of rows) {
    const cells = row.cells.filter(c => c.trim().length > 0)
    if (cells.length < 4) continue

    const yr = parseInt(cells[0])
    if (isNaN(yr) || yr < 1 || yr > 96) continue

    const rowAge = parseInt(cells[1])
    if (isNaN(rowAge) || rowAge < 18 || rowAge > 120) continue

    // Pull all dollar/numeric values from this row
    const nums = cells.slice(2)
      .map(c => c.replace(/[$,%\s]/g, '').replace(/,/g, ''))
      .filter(c => /^\d+(\.\d+)?$/.test(c) && c.length > 0)
      .map(Number)
      .filter(n => n > 0)

    // Only policy values (>= 1000)
    const policyNums = nums.filter(n => n >= 1000)
    if (policyNums.length < 3) continue

    // Last 3 policy values = current AV, CSV, Net DB
    const av    = policyNums[policyNums.length - 3]
    const csv   = policyNums[policyNums.length - 2]
    const netDB = policyNums[policyNums.length - 1]

    if (isNaN(av) || isNaN(csv) || isNaN(netDB)) continue

    // Validate: DB must exceed face amount floor
    const minDB = result.faceAmount ? result.faceAmount * 0.5 : 50000
    if (netDB < minDB) continue

    // Validate: DB must be larger than AV (Option B — DB includes AV)
    if (netDB <= av) continue

    ledgerRowsRaw.push({ year: yr, age: rowAge, av, csv, netDB })
  }

  // Deduplicate: same year can appear across pages — keep largest DB (current side)
  const deduped: Record<number, NonNullable<IllustrationData['ledgerRows']>[0]> = {}
  for (const r of ledgerRowsRaw) {
    if (!deduped[r.year] || r.netDB > deduped[r.year].netDB) {
      deduped[r.year] = r
    }
  }
  result.ledgerRows = Object.values(deduped).sort((a, b) => a.year - b.year)

  return result
}

// ─── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-navy rounded-xl border border-gold/15 p-4">
      <div className="text-dim text-xs uppercase tracking-widest mb-2">{label}</div>
      <div className="font-display text-gold text-xl leading-tight">{value}</div>
      {sub && <div className="text-dim text-xs mt-1">{sub}</div>}
    </div>
  )
}

// ─── Print Report ─────────────────────────────────────────────────────────────

function PrintReport({
  rows, age, monthlyExpenses, faceAmount, annualPremium,
  growthRate, loanInterestRate, hasIllustration,
}: {
  rows: ProjectionRow[]
  age: number
  monthlyExpenses: number
  faceAmount: number
  annualPremium: number
  growthRate: number
  loanInterestRate: number
  hasIllustration: boolean
}) {
  if (!rows || rows.length === 0) return null
  const lastRow = rows[rows.length - 1]
  const yr7 = rows[Math.min(6, rows.length - 1)]
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const spread = ((growthRate - loanInterestRate) * 100).toFixed(2)
  let bepMarked = false

  return (
    <div className="print-report">
      {/* ── Header ── */}
      <div className="pr-header">
        <div className="pr-header-inner">
          <div>
            <div className="pr-eyebrow">Financial Shield Banking Strategy</div>
            <div className="pr-title">Your Capital Recapture Illustration</div>
            <div className="pr-subtitle">Privately Placed Life Insurance — Internal Banking Design</div>
            <div style={{ marginTop: 12 }}>
              <span className="pr-badge">{hasIllustration ? '✦ Reference-Calibrated Model' : '✦ Estimated Mock — Fallback Formula'}</span>
            </div>
          </div>
        </div>
        <div className="pr-meta">
          <div className="pr-meta-item"><label>Client Age</label><span>{age}</span></div>
          <div className="pr-meta-item"><label>Monthly Expenses</label><span>{fmt(monthlyExpenses)}</span></div>
          <div className="pr-meta-item"><label>Annual Premium</label><span>{fmt(annualPremium)}</span></div>
          <div className="pr-meta-item"><label>Illustration Date</label><span>{today}</span></div>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="pr-cards">
        {[
          { label: 'Face Amount',        value: fmtShort(faceAmount) },
          { label: 'Annual Premium',     value: fmt(annualPremium) },
          { label: 'Phase I Total OOP',  value: fmt(yr7.totalOutOfPocket) },
          { label: `Year ${lastRow.year} Net DB`, value: fmtShort(lastRow.netDeathBenefit) },
        ].map((c, i) => (
          <div key={i} className="pr-card">
            <div className="pr-card-label">{c.label}</div>
            <div className="pr-card-value">{c.value}</div>
          </div>
        ))}
      </div>

      {/* ── Strategy Overview ── */}
      <div className="pr-strategy">
        <div className="pr-strategy-title">ⓘ Strategy Overview</div>
        <div className="pr-tags">
          {[
            'Phase I (Yrs 1–7): 80% premium financed via policy loan',
            'Out of pocket: 20% premium in Phase I only',
            'Phase II (Yr 8+): 100% premium financed — zero out of pocket',
            `Growth rate: ${(growthRate * 100).toFixed(2)}% crediting | Loan interest: ${(loanInterestRate * 100).toFixed(2)}%`,
            `Arbitrage spread: ${spread}% per year`,
          ].map((t, i) => <span key={i} className="pr-tag">{t}</span>)}
        </div>
      </div>

      {/* ── Table ── */}
      <table className="pr-table">
        <thead>
          <tr>
            {['Year','Age','Premium','Loan','Out of Pocket','Total OOP','Accumulated Value','Cash Value','Gross DB','Net DB'].map(h => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isBep = !bepMarked && r.cashValue >= r.totalOutOfPocket && r.totalOutOfPocket > 0
            if (isBep) bepMarked = true
            return (
              <tr key={r.year} className={isBep ? 'pr-bep-row' : ''}>
                <td>
                  {isBep ? (
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                      {r.year}<span className="pr-bep-badge">✦ BEP</span>
                    </span>
                  ) : r.year}
                </td>
                <td style={{ color:'#6b7c93' }}>{r.age}</td>
                <td>{fmt(r.premium)}</td>
                <td className="pr-gold">{fmt(r.loan)}</td>
                <td>{r.outOfPocket > 0 ? fmt(r.outOfPocket) : '—'}</td>
                <td>{fmt(r.totalOutOfPocket)}</td>
                <td className="pr-gold">{fmt(r.accumulatedValue)}</td>
                <td className="pr-green">{fmt(r.cashValue)}</td>
                <td>{fmt(r.grossDeathBenefit)}</td>
                <td style={{ fontWeight:600 }}>{fmt(r.netDeathBenefit)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* ── Disclaimer ── */}
      <div className="pr-disclaimer">
        <strong>IMPORTANT DISCLAIMER: </strong>
        This is a mock illustration generated by the Financial Shield Banking Calculator for internal planning and educational purposes only.
        It is not an actual insurance contract, policy guarantee, or binding offer. All values shown are hypothetical projections based on assumed
        growth rates and internal banking rules. Actual policy performance will depend on the specific carrier, product design, underwriting, and
        prevailing interest rates.{' '}
        {hasIllustration
          ? 'This illustration was calibrated using a reference policy structure. The structural patterns from that reference are used to estimate behavioral relationships only — no direct carrier data is reproduced.'
          : 'This illustration uses the Financial Shield fallback formula and should be considered an estimate only.'}
        {' '}This output should not be presented as a carrier-issued ledger without explicit disclosure.
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function BankingPage() {
  const { activeClient, saveToolData } = useClient()

  // Inputs
  const [age, setAge] = useState('')
  const [monthlyExpenses, setMonthlyExpenses] = useState('')
  const [creditingRate, setCreditingRate] = useState('6.84')
  const [loanRate, setLoanRate] = useState('5.00')
  const [years, setYears] = useState('30')
  const [illustration, setIllustration] = useState<IllustrationData | null>(null)
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle')
  const [pdfFileName, setPdfFileName] = useState('')
  const [result, setResult] = useState<ProjectionResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Pre-fill from client profile
  useEffect(() => {
    if (activeClient) {
      const clientAge = calcAge(activeClient.date_of_birth)
      if (clientAge) setAge(String(clientAge))
      if (activeClient.monthly_expenses) setMonthlyExpenses(String(activeClient.monthly_expenses))

      // Restore saved data
      const saved = activeClient.banking_calculator_data as Record<string, unknown>
      if (saved && saved.result) {
        setResult(saved.result as ProjectionResult)
      }
      if (saved && saved.creditingRate) setCreditingRate(saved.creditingRate as string)
      if (saved && saved.loanRate) setLoanRate(saved.loanRate as string)
      if (saved && saved.years) setYears(saved.years as string)
    }
  }, [activeClient?.id])

  // runCalc — used by sliders for live recalc, accepts explicit values to avoid stale closure
  const runCalc = useCallback((
    a: number, exp: number, yrs: number,
    cr: number, lr: number,
    illData: typeof illustration
  ) => {
    if (!a || !exp || a < 18 || a > 100 || exp <= 0 || !illData) return
    const r = calcProjection(a, exp, illData, yrs, cr / 100, lr / 100)
    setResult(r)
  }, [])

  const calculate = useCallback(() => {
    const a = parseInt(age)
    const exp = parseFloat(monthlyExpenses)
    const yrs = Math.min(Math.max(1, parseInt(years) || 30), 120)
    const cr = parseFloat(creditingRate)
    const lr = parseFloat(loanRate)
    if (!a || !exp || a < 18 || a > 100 || !illustration) return
    const r = calcProjection(a, exp, illustration, yrs, cr / 100, lr / 100)
    setResult(r)
    scheduleSave(r)
  }, [age, monthlyExpenses, creditingRate, loanRate, years, illustration, activeClient])

  function scheduleSave(r: ProjectionResult) {
    if (!activeClient) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveToolData('banking_calculator_data', {
        result: r,
        creditingRate,
        loanRate,
        years,
        savedAt: new Date().toISOString(),
      })
    }, 2000)
  }

  async function handlePdfFile(file: File) {
    if (file.type !== 'application/pdf') { setPdfStatus('error'); return }
    setPdfFileName(file.name)
    setPdfStatus('parsing')
    try {
      const { extracted } = await parsePDF(file)
      setIllustration(extracted)
      setPdfStatus('done')
      // Auto-fill from illustration
      if (extracted.issueAge) setAge(String(extracted.issueAge))
      if (extracted.annualPremiumRef) {
        const impliedMonthly = Math.round(extracted.annualPremiumRef / 15)
        setMonthlyExpenses(String(impliedMonthly))
      }
      if (extracted.ledgerRows && extracted.ledgerRows.length > 0) {
        setYears(String(Math.min(extracted.ledgerRows.length, 120)))
      }
      if (extracted.currentCreditingRate) {
        setCreditingRate(String(extracted.currentCreditingRate))
      }
    } catch {
      setPdfStatus('error')
    }
  }

  // const annualPremium = result?.annualPremium
  const lastRow = result?.rows[result.rows.length - 1]
  const yr7Row = result?.rows[6]
  // const yr8Row = result?.rows[7]

  // Break-even point — first year where cashValue >= totalOutOfPocket
  const bepRow = result?.rows.find(r => r.cashValue >= r.totalOutOfPocket && r.totalOutOfPocket > 0)

  // Chart data
  const chartLabels = result?.rows.map(r => `Yr ${r.year}`) || []
  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Accumulated Value',
        data: result?.rows.map(r => r.accumulatedValue) || [],
        borderColor: '#c9a84c',
        backgroundColor: 'rgba(201,168,76,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Cash Value',
        data: result?.rows.map(r => r.cashValue) || [],
        borderColor: '#4ade80',
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Net Death Benefit',
        data: result?.rows.map(r => r.netDeathBenefit) || [],
        borderColor: '#60a5fa',
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 0,
        borderDash: [4, 4],
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#6b7c93', font: { size: 11 } } },
      tooltip: { callbacks: { label: (ctx: { dataset: { label: string }; parsed: { y: number } }) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } },
    },
    scales: {
      x: { ticks: { color: '#6b7c93', font: { size: 10 } }, grid: { color: 'rgba(201,168,76,0.05)' } },
      y: {
        ticks: {
          color: '#6b7c93',
          font: { size: 10 },
          callback: (v: number) => fmtShort(v),
        },
        grid: { color: 'rgba(201,168,76,0.05)' },
      },
    },
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="screen-content">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-cream">Banking Calculator</h1>
        <p className="text-dim text-sm mt-1">Financial Shield Banking Strategy — {years}-Year Projection</p>
      </div>

      {/* No client warning */}
      {!activeClient && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl px-5 py-4 text-yellow-300 text-sm mb-6">
          No client selected. Go to Dashboard to select or create a client — inputs will auto-fill.
        </div>
      )}

      {/* Inputs */}
      <div className="bg-navy-mid rounded-xl border border-gold/15 p-5 mb-6 card-gold-top">
        <h2 className="text-cream font-medium text-sm mb-4 uppercase tracking-widest text-dim">Client Inputs</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-dim mb-2">Client Age</label>
            <input
              type="number"
              min="18" max="100"
              value={age}
              onChange={e => setAge(e.target.value)}
              className="input-gold w-full bg-white/5 border border-gold/25 rounded-lg px-3 py-2.5 text-cream text-sm"
              placeholder="e.g. 45"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-dim mb-2">Monthly Expenses</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold text-sm">$</span>
              <input
                type="number"
                value={monthlyExpenses}
                onChange={e => setMonthlyExpenses(e.target.value)}
                className="input-gold w-full bg-white/5 border border-gold/25 rounded-lg pl-7 pr-3 py-2.5 text-cream text-sm"
                placeholder="e.g. 4000"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-dim mb-2">Projection Years</label>
            <input
              type="number"
              min="1" max="120"
              value={years}
              onChange={e => setYears(e.target.value)}
              className="input-gold w-full bg-white/5 border border-gold/25 rounded-lg px-3 py-2.5 text-cream text-sm"
              placeholder="30"
            />
          </div>
        </div>

        {/* Rate Assumptions */}
        <div className="border-t border-gold/15 pt-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-widest text-dim">Rate Assumptions</span>
            {illustration?.currentCreditingRate && (
              <button
                onClick={() => {
                  const cr = parseFloat(illustration.currentCreditingRate!)
                  setCreditingRate(String(cr))
                  const a = parseInt(age), exp = parseFloat(monthlyExpenses)
                  const yrs = Math.min(Math.max(1, parseInt(years) || 30), 120)
                  runCalc(a, exp, yrs, cr, parseFloat(loanRate), illustration)
                }}
                className="text-gold text-xs border border-gold/30 rounded px-2 py-1 hover:bg-gold/10 transition-colors"
              >
                Match illustration {illustration.currentCreditingRate}%
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs uppercase tracking-widest text-dim mb-2">
                Crediting Rate — <span className="text-gold">{parseFloat(creditingRate).toFixed(2)}%</span>
              </label>
              <input
                type="range" min="2" max="12" step="0.1"
                value={creditingRate}
                onChange={e => {
                  const cr = parseFloat(e.target.value)
                  setCreditingRate(String(cr))
                  const a = parseInt(age), exp = parseFloat(monthlyExpenses)
                  const yrs = Math.min(Math.max(1, parseInt(years) || 30), 120)
                  runCalc(a, exp, yrs, cr, parseFloat(loanRate), illustration)
                }}
                className="w-full accent-gold"
              />
              <div className="flex justify-between text-xs text-dim mt-1">
                <span>Conservative 2%</span><span>Aggressive 12%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-dim mb-2">
                Loan Interest Rate — <span className="text-gold">{parseFloat(loanRate).toFixed(2)}%</span>
              </label>
              <input
                type="range" min="3" max="8" step="0.1"
                value={loanRate}
                onChange={e => {
                  const lr = parseFloat(e.target.value)
                  setLoanRate(String(lr))
                  const a = parseInt(age), exp = parseFloat(monthlyExpenses)
                  const yrs = Math.min(Math.max(1, parseInt(years) || 30), 120)
                  runCalc(a, exp, yrs, parseFloat(creditingRate), lr, illustration)
                }}
                className="w-full accent-gold"
              />
              <div className="flex justify-between text-xs text-dim mt-1">
                <span>3%</span><span>8%</span>
              </div>
            </div>
          </div>

          {/* Spread display */}
          <div className="mt-3 bg-gold/8 border border-gold/20 rounded-lg px-4 py-2 text-sm">
            <span className="text-gold font-semibold">
              Spread: +{(parseFloat(creditingRate) - parseFloat(loanRate)).toFixed(2)}%
            </span>
            <span className="text-dim ml-1">arbitrage per year</span>
          </div>
        </div>

        <button
          onClick={calculate}
          disabled={!illustration}
          className="w-full mt-4 bg-gold hover:bg-gold-light text-navy font-semibold rounded-lg py-2.5 text-sm tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {illustration ? 'Calculate Projection' : 'Upload Illustration to Calculate'}
        </button>
      </div>

      {/* PDF Upload */}
      <div className="bg-navy-mid rounded-xl border border-gold/15 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-cream text-sm font-medium">Carrier Illustration (Optional PDF)</h2>
          {pdfStatus === 'done' && (
            <span className="text-green-400 text-xs">✓ {illustration?.ledgerRows?.length || 0} years extracted</span>
          )}
        </div>

        {pdfStatus === 'idle' || pdfStatus === 'error' ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gold/25 rounded-xl py-8 text-center cursor-pointer hover:border-gold/50 hover:bg-gold/5 transition-all"
          >
            <div className="text-dim text-sm">Drop PDF illustration here or click to browse</div>
            <div className="text-dim/50 text-xs mt-1">Accepts life insurance ledger PDFs — optional, improves accuracy</div>
            {pdfStatus === 'error' && (
              <div className="text-red-400 text-xs mt-2">Could not parse file. Please use a valid carrier illustration PDF.</div>
            )}
          </div>
        ) : pdfStatus === 'parsing' ? (
          <div className="text-center py-8 text-dim text-sm">Parsing illustration PDF…</div>
        ) : (
          <div className="flex items-center justify-between bg-green-900/20 border border-green-500/25 rounded-xl px-4 py-3">
            <div>
              <div className="text-green-400 text-sm font-medium">{illustration?.ledgerRows?.length} policy years extracted</div>
              <div className="text-dim text-xs mt-0.5">{pdfFileName}</div>
              {illustration?.issueAge && <div className="text-dim text-xs">Issue Age: {illustration.issueAge} · Face: {illustration.faceAmount ? fmtShort(illustration.faceAmount) : '—'}</div>}
            </div>
            <button
              onClick={() => { setIllustration(null); setPdfStatus('idle'); }}
              className="text-dim hover:text-cream text-xs border border-gold/15 rounded px-3 py-1.5"
            >
              Remove
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => e.target.files?.[0] && handlePdfFile(e.target.files[0])} />
      </div>

      {/* Results — only shown once an illustration is loaded and Calculate has been run */}
      {result && illustration && (
        <>
          {/* Print bar */}
          <div className="flex items-center justify-between mb-4 no-print">
            <span className="text-dim text-xs uppercase tracking-widest">Projection Results</span>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-gold hover:bg-gold-light text-navy font-semibold rounded-lg px-4 py-2 text-sm transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print / Save PDF
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <SummaryCard label="Annual Premium" value={fmt(result.annualPremium)} />
            <SummaryCard label="Annual Loan (Yr 1–7)" value={fmt(result.annualPremium * 0.8)} sub="80% of premium" />
            <SummaryCard label="Annual Loan (Yr 8+)" value={fmt(result.annualPremium)} sub="100% of premium" />
            <SummaryCard label="OOP (Yr 1–7)" value={fmt(result.annualPremium * 0.2)} sub="20% of premium" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              label="Total OOP (7 yrs)"
              value={yr7Row ? fmt(yr7Row.totalOutOfPocket) : '—'}
            />
            <SummaryCard
              label="Break-Even Point"
              value={bepRow ? `Year ${bepRow.year}` : 'Not reached'}
              sub={bepRow ? `Age ${bepRow.age} · Cash Value exceeds OOP` : undefined}
            />
            <SummaryCard
              label="Ending Cash Value"
              value={lastRow ? fmt(lastRow.cashValue) : '—'}
              sub={`Year ${lastRow?.year}`}
            />
            <SummaryCard
              label="Total Loan Balance"
              value={lastRow ? fmt(lastRow.accumulatedLoan) : '—'}
              sub={`At year ${lastRow?.year ?? '—'}`}
            />
          </div>

          {/* Chart */}
          <div className="bg-navy-mid rounded-xl border border-gold/15 p-5 mb-6">
            <h2 className="text-cream text-sm font-medium mb-4">{years}-Year Growth Projection</h2>
            <div className="h-64">
              <Line data={chartData} options={{ ...chartOptions, maintainAspectRatio: false } as Parameters<typeof Line>[0]['options']} />
            </div>
          </div>

          {/* Table */}
          <div className="bg-navy-mid rounded-xl border border-gold/15 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gold/10">
              <h2 className="text-cream text-sm font-medium">{years}-Year Projection Table</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="fs-table">
                <thead>
                  <tr>
                    <th className="text-center">Year</th>
                    <th className="text-center">Age</th>
                    <th>Premium</th>
                    <th>Loan</th>
                    <th>Out of Pocket</th>
                    <th>Total OOP</th>
                    <th>Accumulated Value</th>
                    <th>Cash Value</th>
                    <th>Gross DB</th>
                    <th>Net DB</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let bepMarked = false
                    return result.rows.map(r => {
                      const isBep = !bepMarked && r.cashValue >= r.totalOutOfPocket && r.totalOutOfPocket > 0
                      if (isBep) bepMarked = true
                      return (
                    <tr key={r.year} className={isBep ? 'bep-row bg-gold/8 outline outline-2 outline-gold/30' : ''}>
                      <td className="text-center font-semibold text-gold">
                        {isBep ? (
                          <div className="flex items-center justify-center gap-1">
                            <span>{r.year}</span>
                            <span className="text-xs bg-gold text-navy rounded-full px-1.5 py-0.5 font-bold leading-none">✦ BEP</span>
                          </div>
                        ) : r.year}
                      </td>
                      <td className="text-center text-dim">{r.age}</td>
                      <td>{fmt(r.premium)}</td>
                      <td className="text-gold font-semibold">{fmt(r.loan)}</td>
                      <td>{r.outOfPocket > 0 ? fmt(r.outOfPocket) : '—'}</td>
                      <td>{fmt(r.totalOutOfPocket)}</td>
                      <td className="text-gold font-semibold">{fmt(r.accumulatedValue)}</td>
                      <td className="text-green-400 font-semibold">{fmt(r.cashValue)}</td>
                      <td>{fmt(r.grossDeathBenefit)}</td>
                      <td className="text-cream font-semibold">{fmt(r.netDeathBenefit)}</td>
                    </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      </div>{/* end screen-content */}

      {/* Print-only illustration report */}
      {result && illustration && (
        <PrintReport
          rows={result.rows}
          age={parseInt(age)}
          monthlyExpenses={parseFloat(monthlyExpenses)}
          faceAmount={result.faceAmount}
          annualPremium={result.annualPremium}
          growthRate={result.growthRate}
          loanInterestRate={result.loanInterestRate}
          hasIllustration={result.hasIllustration}
        />
      )}
    </div>
  )
}
