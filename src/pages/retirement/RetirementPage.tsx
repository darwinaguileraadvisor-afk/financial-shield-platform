import { useState, useRef, useEffect, useCallback } from 'react'
import { Chart, registerables } from 'chart.js'
import { useClient } from '../../context/ClientContext'
import { calcAge } from '../../types'
Chart.register(...registerables)

// ─── Scoped CSS (matches retirement_projection_tool (8).html exactly) ─────────
const RT_CSS = `
.rt-wrap {
  --rt-navy: #0d1b2a;
  --rt-gold: #c9a84c;
  --rt-gold-light: #e8c86d;
  --rt-cream: #f5f0e8;
  --rt-green: #2e7d52;
  --rt-red: #b83232;
  --rt-text: #1a1a2e;
  --rt-muted: #6b7a8d;
  --rt-border: #ddd8cc;
  --rt-shadow: 0 4px 24px rgba(13,27,42,0.10);
  font-family: 'DM Sans', sans-serif;
  background: var(--rt-cream);
  color: var(--rt-text);
  min-height: 100%;
}

/* ── Tab bar ── */
.rt-tab-bar {
  background: #fff;
  border-bottom: 2px solid var(--rt-border);
  display: flex;
  padding: 0 24px;
  overflow-x: auto;
  position: sticky;
  top: 0;
  z-index: 50;
}
.rt-tab-btn {
  padding: 14px 18px;
  font-size: 13px;
  font-weight: 500;
  color: var(--rt-muted);
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  white-space: nowrap;
  font-family: 'DM Sans', sans-serif;
  transition: color 0.2s;
}
.rt-tab-btn:hover { color: var(--rt-navy); }
.rt-tab-btn.rt-active {
  color: var(--rt-navy);
  border-bottom-color: var(--rt-gold);
  font-weight: 600;
}

/* ── Panel ── */
.rt-panel { padding: 24px 28px; max-width: 1200px; }

/* ── Cards ── */
.rt-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--rt-shadow);
  margin-bottom: 20px;
}
.rt-card h2 {
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  color: var(--rt-navy);
  margin-bottom: 18px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--rt-border);
}
.rt-card h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--rt-navy);
  margin-bottom: 14px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Form ── */
.rt-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
}
.rt-form-group { display: flex; flex-direction: column; gap: 5px; }
.rt-form-group label {
  font-size: 11px;
  font-weight: 600;
  color: var(--rt-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.rt-form-group input,
.rt-form-group select {
  padding: 9px 11px;
  border: 1.5px solid var(--rt-border);
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  outline: none;
  transition: border 0.2s;
  background: var(--rt-cream);
}
.rt-form-group input:focus,
.rt-form-group select:focus {
  border-color: var(--rt-gold);
  background: #fff;
}
.rt-form-group input[readonly] {
  background: #f0faf5;
  border-color: var(--rt-green);
  cursor: default;
}

/* ── Stat boxes ── */
.rt-stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.rt-stat-box {
  background: #fff;
  border-radius: 10px;
  padding: 16px 18px;
  box-shadow: var(--rt-shadow);
  border-left: 4px solid var(--rt-gold);
}
.rt-stat-box.green  { border-left-color: var(--rt-green); }
.rt-stat-box.red    { border-left-color: var(--rt-red); }
.rt-stat-box.navy   { border-left-color: var(--rt-navy); }
.rt-stat-box.gold   { border-left-color: var(--rt-gold); }
.rt-stat-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--rt-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}
.rt-stat-value {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  color: var(--rt-navy);
}
.rt-stat-sub { font-size: 11px; color: var(--rt-muted); margin-top: 2px; }

/* ── Table ── */
.rt-tbl-wrap {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid var(--rt-border);
}
.rt-tbl-wrap table { width: 100%; border-collapse: collapse; font-size: 13px; }
.rt-tbl-wrap th {
  background: var(--rt-navy);
  color: #fff;
  padding: 9px 12px;
  text-align: left;
  font-weight: 500;
  font-size: 11px;
  white-space: nowrap;
}
.rt-tbl-wrap td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--rt-border);
  color: var(--rt-text);
}
.rt-tbl-wrap tr:last-child td { border-bottom: none; }
.rt-tbl-wrap tr:nth-child(even) td { background: #f9f7f3; }
.rt-highlight-row td { background: #fffbe6 !important; font-weight: 600; }

/* ── Badges ── */
.rt-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}
.rt-badge-green { background: #e6f4ed; color: var(--rt-green); }
.rt-badge-red   { background: #fce8e8; color: var(--rt-red); }
.rt-badge-gold  { background: #fdf6e3; color: #a07a1e; }

/* ── Chart wrap ── */
.rt-chart-wrap { position: relative; height: 300px; margin-top: 14px; }
.rt-chart-wrap.tall { height: 320px; }

/* ── Buttons ── */
.rt-calc-btn {
  background: var(--rt-gold);
  color: var(--rt-navy);
  border: none;
  padding: 11px 28px;
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 8px;
}
.rt-calc-btn:hover { background: var(--rt-gold-light); }
.rt-add-btn {
  background: none;
  border: 1.5px dashed var(--rt-gold);
  color: var(--rt-gold);
  padding: 5px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}
.rt-add-btn:hover { background: #fffbe6; }
.rt-remove-btn {
  background: none;
  border: none;
  color: var(--rt-muted);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
  align-self: end;
  line-height: 1;
}
.rt-remove-btn:hover { color: var(--rt-red); background: #fce8e8; }
.rt-preset-btn {
  padding: 5px 12px;
  border: 1px solid var(--rt-border);
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}
.rt-preset-btn:hover { background: #f9f7f3; }

/* ── Account rows ── */
.rt-acct-row {
  display: grid;
  gap: 10px;
  align-items: end;
  background: #fafaf8;
  border: 1px solid var(--rt-border);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 10px;
}
.rt-acct-row.qual-row {
  grid-template-columns: 100px 1fr 100px 80px 80px 80px 100px auto;
}
.rt-acct-row.nq-row {
  grid-template-columns: 120px 1fr 105px 115px auto;
}
.rt-acct-row.pension-row {
  grid-template-columns: 1fr 110px 90px 110px 90px auto;
}
.rt-acct-row.inactive-acct { opacity: 0.6; background: #f5f5f2; }

/* ── Misc helpers ── */
.rt-calc-note { font-size: 11px; color: var(--rt-green); margin-top: 3px; font-weight: 600; }
.rt-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
}
.rt-divider { height: 1px; background: var(--rt-border); margin: 16px 0; }

/* ── Income gap bar ── */
.rt-income-gap-bar { margin-top: 12px; }
.rt-gap-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 13px;
}
.rt-gap-label { width: 200px; color: var(--rt-muted); }
.rt-gap-track {
  flex: 1;
  height: 10px;
  background: var(--rt-border);
  border-radius: 5px;
  overflow: hidden;
}
.rt-gap-fill { height: 100%; border-radius: 5px; transition: width 0.5s; }
.rt-gap-amount { width: 110px; text-align: right; font-weight: 600; }

/* ── Alert boxes ── */
.rt-alert {
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 13px;
  margin-bottom: 12px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.rt-alert.warning { background: #fff8e6; border-left: 4px solid var(--rt-gold); }
.rt-alert.info    { background: #e8f4fd; border-left: 4px solid #3a9bd5; }
.rt-alert.danger  { background: #fce8e8; border-left: 4px solid var(--rt-red); }

/* ── Downturn event box ── */
.rt-dt-box {
  background: #fff8f8;
  border: 1.5px solid #f5c5c5;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 10px;
}
.rt-dt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.rt-dt-grid {
  display: grid;
  grid-template-columns: 105px 105px 115px 125px 1fr;
  gap: 10px;
  align-items: end;
}

/* ── Comparison table ── */
.rt-comparison th:first-child { background: #f0ede8; color: var(--rt-navy); }
.rt-comparison td:first-child { font-weight: 500; background: #fafaf8; }
.rt-comparison td.good { color: var(--rt-green); font-weight: 600; }
.rt-comparison td.bad  { color: var(--rt-red); }

/* ── Print ── */
@media print {
  .rt-tab-bar,
  .rt-calc-btn,
  .rt-add-btn,
  .rt-print-btn { display: none !important; }
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .rt-acct-row.qual-row,
  .rt-acct-row.nq-row,
  .rt-acct-row.pension-row,
  .rt-dt-grid { grid-template-columns: 1fr 1fr; }
  .rt-panel { padding: 14px; }
}
`

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId       = 'profile' | 'projection' | 'downturn' | 'solution' | 'historical' | 'report'
type FilingStatus = 'Single' | 'Married' | 'Head of Household'

export interface QualAccount {
  id: number; type: string; label: string; balance: number
  empPct: number; matchPct: number; matchUpTo: number; active: boolean
}
export interface NQAccount {
  id: number; type: string; label: string; balance: number; monthly: number
}
export interface Pension {
  id: number; employer: string; monthly: number
  startAge: number; cola: number; survivor: number
}

export interface ProjRow {
  age: number; qual: number; nq: number; total: number
  income: number; bracket: number
}

export interface DownturnEvent {
  id: number; age: number; drop: number
  recYears: number; recRate: number; label: string
}

export interface DtRow {
  age: number; retired: boolean
  events: string[]; evStr: string
  baseBal: number; dtBal: number
  baseWithdrawal: number; dtWithdrawal: number   // portfolio-only (no SS)
  baseInc: number; dtInc: number; dtAT: number   // total (portfolio + SS)
  ssInc: number
  growthRate: number
}

export interface SolRow {
  age: number; year: number; retired: boolean; events: string[]
  rothBal: number; sqBal: number; fiaBal: number; total: number
  rothInc: number; sqInc: number; fiaInc: number; ssInc: number; totalInc: number
  afterTax: number; bracket: number
  mktRet: number; fiaRet: number
  // Parallel no-floor FIA simulation: FIA follows market (no 0% floor)
  fiaIncNF: number   // FIA income in this year if no floor protection
  fiaBal_NF: number  // FIA balance tracking in the no-floor scenario
}

export interface HistRow {
  year: number; mr: number; sqBal: number; rBal: number
  sqW: number; rW: number; pr: number
}

// ─── Tax constants (exact from HTML) ─────────────────────────────────────────
const BRACKETS: Record<FilingStatus, number[][]> = {
  'Single':           [[0,0.10],[12400,0.12],[50400,0.22],[105700,0.24],[201775,0.32],[256225,0.35],[640600,0.37]],
  'Married':          [[0,0.10],[24800,0.12],[100800,0.22],[211400,0.24],[403550,0.32],[512450,0.35],[768700,0.37]],
  'Head of Household':[[0,0.10],[17050,0.12],[64850,0.22],[109650,0.24],[203000,0.32],[258700,0.35],[640600,0.37]],
}
const STD_DED: Record<FilingStatus, number> = {
  'Single': 16100, 'Married': 32200, 'Head of Household': 24150,
}

// ─── Constants ────────────────────────────────────────────────────────────────
// ─── Historical S&P 500 returns 2000-2023 (exact from HTML) ──────────────────
const HIST: Record<number, number> = {
  2000:-0.091, 2001:-0.119, 2002:-0.221, 2003:0.287, 2004:0.109,
  2005:0.049,  2006:0.158,  2007:0.054,  2008:-0.37, 2009:0.265,
  2010:0.151,  2011:0.021,  2012:0.16,   2013:0.324, 2014:0.137,
  2015:0.014,  2016:0.12,   2017:0.217,  2018:-0.043,2019:0.315,
  2020:0.184,  2021:0.287,  2022:-0.181, 2023:0.263,
}

const DT_PRESETS: Record<string, { drop: number; recYears: number; recRate: number }> = {
  '2008 Financial Crisis': { drop: 37, recYears: 3, recRate: 15 },
  '2000 Dot-Com Crash':    { drop: 49, recYears: 4, recRate: 12 },
  '2020 COVID Crash':      { drop: 34, recYears: 1, recRate: 68 },
  'Mild Correction':       { drop: 15, recYears: 1, recRate: 10 },
  'Severe Bear Market':    { drop: 45, recYears: 5, recRate: 12 },
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'profile',    label: 'Client Profile' },
  { id: 'projection', label: '7% Projection' },
  { id: 'downturn',   label: 'Market Downturn' },
  { id: 'solution',   label: 'Solution / Rescue' },
  { id: 'historical', label: 'Historical' },
  { id: 'report',     label: 'Client Report' },
]

const US_STATES = ['CA','TX','FL','NY','WA','NV','AZ','CO','GA','IL','NC','OH','PA','VA','Other']
const FILING_OPTS: FilingStatus[] = ['Single', 'Married', 'Head of Household']
const QUAL_TYPES  = ['401(k)', '403(b)', 'TSP', 'IRA', 'SEP IRA', 'SIMPLE IRA']
const NQ_TYPES    = ['Roth IRA', 'Roth 401k', 'Brokerage']

const IRS_BASE: Record<string, number> = {
  '401(k)': 23500, '403(b)': 23500, 'TSP': 23500, 'SIMPLE IRA': 16500,
  'IRA': 7000, 'SEP IRA': 70000, 'Roth IRA': 7000, 'Roth 401k': 23500,
}
const IRS_CATCHUP: Record<string, number> = {
  '401(k)': 7500, '403(b)': 7500, 'TSP': 7500, 'IRA': 1000,
  'Roth IRA': 1000, 'Roth 401k': 7500, 'SIMPLE IRA': 3500, 'SEP IRA': 0,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number) { return '$' + Math.round(v).toLocaleString() }

function irsLimit(type: string, age: number): number | null {
  const base = IRS_BASE[type]
  if (base == null) return null
  let cu = age >= 50 ? (IRS_CATCHUP[type] ?? 0) : 0
  if (age >= 60 && age <= 63 && ['401(k)', '403(b)', 'TSP'].includes(type)) cu = 11250
  return base + cu
}

function computeContrib(a: QualAccount, age: number, salary: number): number {
  if (!a.active) return 0
  const lim = irsLimit(a.type, age)
  if (!lim) return 0
  const empAmt      = salary * a.empPct
  const capAmt      = salary * a.matchUpTo
  const matchedEmp  = Math.min(empAmt, capAmt)
  const employerAmt = matchedEmp * a.matchPct
  return Math.min(empAmt + employerAmt, lim)
}

function getBracket(taxable: number, filing: FilingStatus): number {
  const b = BRACKETS[filing] ?? BRACKETS['Single']
  let rate = 0.10
  for (const [floor, r] of b) { if (taxable >= floor) rate = r; else break }
  return rate
}

function estimateTax(taxable: number, filing: FilingStatus): number {
  const b = BRACKETS[filing] ?? BRACKETS['Single']
  let tax = 0
  for (let i = 0; i < b.length; i++) {
    const fl   = b[i][0], rate = b[i][1]
    const ceil = i + 1 < b.length ? b[i + 1][0] : 1e9
    if (taxable <= fl) break
    tax += (Math.min(taxable, ceil) - fl) * rate
  }
  return tax
}

function fmtPct(v: number) { return (v * 100).toFixed(1) + '%' }

// ─── Default accounts (mirrors initDefaultAccounts in the HTML) ───────────────
function defaultQual(): QualAccount[] {
  return [{ id: 1, type: 'TSP', label: 'TSP', balance: 327000, empPct: 0.05, matchPct: 1.0, matchUpTo: 0.05, active: true }]
}
function defaultNQ(): NQAccount[] {
  return [{ id: 2, type: 'Roth IRA', label: 'Roth IRA', balance: 250000, monthly: 260 }]
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RetirementPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  // ── Profile state ────────────────────────────────────────────────────────
  const [pState,      setPState]      = useState('CA')
  const [filing,      setFiling]      = useState<FilingStatus>('Single')
  const [age,         setAge]         = useState(65)
  const [retAge,      setRetAge]      = useState(76)
  const [salary,      setSalary]      = useState(250000)
  const [otherIncome, setOtherIncome] = useState(0)
  const [ss,          setSs]          = useState(0)
  const [ssAge,       setSsAge]       = useState(67)
  const [expenses,    setExpenses]    = useState(5000)

  // ── Accounts ─────────────────────────────────────────────────────────────
  const [qualAccounts, setQualAccounts] = useState<QualAccount[]>(defaultQual)
  const [nqAccounts,   setNqAccounts]   = useState<NQAccount[]>(defaultNQ)
  const [pensions,     setPensions]     = useState<Pension[]>([])
  const nextId = useRef(3)

  // ── Projection results ────────────────────────────────────────────────────
  const [projData,   setProjData]   = useState<ProjRow[]>([])
  // Single source of truth for the projection growth rate (annual effective rate).
  // UI label and all compounding math both read from this value — no hardcoded fallbacks.
  const [projRate,   setProjRate]   = useState(0.07)

  // ── Downturn state ────────────────────────────────────────────────────────
  const [downturnEvents, setDownturnEvents] = useState<DownturnEvent[]>([])
  const [dtNormalRate,   setDtNormalRate]   = useState(7.3)
  const [dtData,         setDtData]         = useState<DtRow[]>([])

  // ── Solution state ────────────────────────────────────────────────────────
  const [solPool,            setSolPool]            = useState('Q')
  const [solScenario,        setSolScenario]        = useState('Max Partial')
  const [solCustomPct,       setSolCustomPct]       = useState(0.7)
  const [solRescueRet,       setSolRescueRet]       = useState(0.06)
  const [solMktRet,          setSolMktRet]          = useState(0.07)
  const [solSwrSQ,           setSolSwrSQ]           = useState(0.04)
  const [solSwrFIA,          setSolSwrFIA]           = useState(0.04)
  const [solSwrRoth,         setSolSwrRoth]         = useState(0.04)
  const [solDownturnEvents,  setSolDownturnEvents]  = useState<DownturnEvent[]>([])
  const [solData,            setSolData]            = useState<SolRow[]>([])

  // ── Historical state ──────────────────────────────────────────────────────
  const [histStart, setHistStart] = useState(500000)
  const [histWr,    setHistWr]    = useState(0.04)
  const [histPart,  setHistPart]  = useState(0.6)
  const [histData,  setHistData]  = useState<HistRow[]>([])

  // ── Supabase client context ───────────────────────────────────────────────
  const { activeClient, saveToolData } = useClient()

  // ── Load client data whenever the active client changes ──────────────────
  // Priority: saved retirement_tool_data fields override demographics defaults.
  // Demographics (dob → age, annual_income_p1 → salary, monthly_expenses →
  // expenses) are applied first, then overwritten by any persisted tool state.
  useEffect(() => {
    if (!activeClient) return

    // 1. Pre-fill demographics
    const clientAge = calcAge(activeClient.date_of_birth)
    if (clientAge)                        setAge(clientAge)
    if (activeClient.annual_income_p1)    setSalary(activeClient.annual_income_p1)
    if (activeClient.monthly_expenses)    setExpenses(activeClient.monthly_expenses)

    // 2. Restore previously saved tool state (overrides demographics where present)
    const saved = activeClient.retirement_tool_data as Record<string, unknown>
    if (!saved || Object.keys(saved).length === 0) return

    if (saved.pState      != null) setPState(saved.pState      as string)
    if (saved.filing      != null) setFiling(saved.filing      as FilingStatus)
    if (saved.age         != null) setAge(saved.age            as number)
    if (saved.retAge      != null) setRetAge(saved.retAge      as number)
    if (saved.salary      != null) setSalary(saved.salary      as number)
    if (saved.otherIncome != null) setOtherIncome(saved.otherIncome as number)
    if (saved.ss          != null) setSs(saved.ss              as number)
    if (saved.ssAge       != null) setSsAge(saved.ssAge        as number)
    if (saved.expenses    != null) setExpenses(saved.expenses  as number)

    if (saved.qualAccounts != null) {
      const qa = saved.qualAccounts as QualAccount[]
      setQualAccounts(qa)
      nextId.current = Math.max(nextId.current, ...qa.map(a => a.id + 1))
    }
    if (saved.nqAccounts != null) {
      const na = saved.nqAccounts as NQAccount[]
      setNqAccounts(na)
      nextId.current = Math.max(nextId.current, ...na.map(a => a.id + 1))
    }
    if (saved.pensions != null) {
      const pa = saved.pensions as Pension[]
      setPensions(pa)
      nextId.current = Math.max(nextId.current, ...pa.map(p => p.id + 1))
    }

    if (saved.downturnEvents != null) {
      const de = saved.downturnEvents as DownturnEvent[]
      setDownturnEvents(de)
      nextId.current = Math.max(nextId.current, ...de.map(d => d.id + 1))
    }
    if (saved.dtNormalRate   != null) setDtNormalRate(saved.dtNormalRate   as number)

    if (saved.solPool         != null) setSolPool(saved.solPool           as string)
    if (saved.solScenario     != null) setSolScenario(saved.solScenario   as string)
    if (saved.solCustomPct    != null) setSolCustomPct(saved.solCustomPct as number)
    if (saved.solRescueRet    != null) setSolRescueRet(saved.solRescueRet as number)
    if (saved.solMktRet       != null) setSolMktRet(saved.solMktRet       as number)
    if (saved.solSwrSQ        != null) setSolSwrSQ(saved.solSwrSQ         as number)
    if (saved.solSwrFIA       != null) setSolSwrFIA(saved.solSwrFIA       as number)
    if (saved.solSwrRoth      != null) setSolSwrRoth(saved.solSwrRoth     as number)
    if (saved.solDownturnEvents != null) {
      const sde = saved.solDownturnEvents as DownturnEvent[]
      setSolDownturnEvents(sde)
      nextId.current = Math.max(nextId.current, ...sde.map(d => d.id + 1))
    }

    if (saved.histStart != null) setHistStart(saved.histStart as number)
    if (saved.histWr    != null) setHistWr(saved.histWr       as number)
    if (saved.histPart  != null) setHistPart(saved.histPart   as number)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClient?.id])

  // ── Auto-save to Supabase (debounced 1.5s after any state change) ─────────
  useEffect(() => {
    if (!activeClient) return
    const timer = setTimeout(() => {
      saveToolData('retirement_tool_data', {
        pState, filing, age, retAge, salary, otherIncome, ss, ssAge, expenses,
        qualAccounts, nqAccounts, pensions,
        downturnEvents, dtNormalRate,
        solPool, solScenario, solCustomPct, solRescueRet, solMktRet,
        solSwrSQ, solSwrFIA, solSwrRoth, solDownturnEvents,
        histStart, histWr, histPart,
      })
    }, 1500)
    return () => clearTimeout(timer)
  }, [
    activeClient, saveToolData,
    pState, filing, age, retAge, salary, otherIncome, ss, ssAge, expenses,
    qualAccounts, nqAccounts, pensions,
    downturnEvents, dtNormalRate,
    solPool, solScenario, solCustomPct, solRescueRet, solMktRet,
    solSwrSQ, solSwrFIA, solSwrRoth, solDownturnEvents,
    histStart, histWr, histPart,
  ])

  // ── Account helpers ───────────────────────────────────────────────────────
  function addQual() {
    setQualAccounts(prev => [...prev, {
      id: nextId.current++, type: '401(k)', label: '', balance: 0,
      empPct: 0.05, matchPct: 1.0, matchUpTo: 0.05, active: true,
    }])
  }
  function removeQual(id: number) {
    setQualAccounts(prev => prev.filter(a => a.id !== id))
  }
  function updateQual(id: number, patch: Partial<QualAccount>) {
    setQualAccounts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
  }

  function addNQ() {
    setNqAccounts(prev => [...prev, {
      id: nextId.current++, type: 'Roth IRA', label: '', balance: 0, monthly: 0,
    }])
  }
  function removeNQ(id: number) {
    setNqAccounts(prev => prev.filter(a => a.id !== id))
  }
  function updateNQ(id: number, patch: Partial<NQAccount>) {
    setNqAccounts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
  }

  function addPension() {
    setPensions(prev => [...prev, {
      id: nextId.current++, employer: '', monthly: 0, startAge: 65, cola: 0, survivor: 0,
    }])
  }
  function removePension(id: number) {
    setPensions(prev => prev.filter(p => p.id !== id))
  }
  function updatePension(id: number, patch: Partial<Pension>) {
    setPensions(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  // ── Downturn event helpers ────────────────────────────────────────────────
  function addDownturn() {
    const defAge = downturnEvents.length === 0
      ? retAge + 2
      : downturnEvents[downturnEvents.length - 1].age + 8
    setDownturnEvents(prev => [...prev, {
      id: nextId.current++, age: defAge, drop: 30, recYears: 3, recRate: 10, label: '',
    }])
  }
  function removeDownturn(id: number) {
    setDownturnEvents(prev => prev.filter(d => d.id !== id))
  }
  function updateDownturn(id: number, patch: Partial<DownturnEvent>) {
    setDownturnEvents(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
  }
  function loadDtPreset(name: string, id: number) {
    const p = DT_PRESETS[name]
    if (!p) return
    setDownturnEvents(prev => prev.map(d =>
      d.id === id ? { ...d, drop: p.drop, recYears: p.recYears, recRate: p.recRate, label: name } : d
    ))
  }

  // ── Sol downturn helpers (independent array from Downturn tab) ───────────
  function addSolDownturn() {
    const defAge = solDownturnEvents.length === 0
      ? retAge + 2
      : solDownturnEvents[solDownturnEvents.length - 1].age + 8
    setSolDownturnEvents(prev => [...prev, {
      id: nextId.current++, age: defAge, drop: 30, recYears: 3, recRate: 10, label: '',
    }])
  }
  function removeSolDownturn(id: number) {
    setSolDownturnEvents(prev => prev.filter(d => d.id !== id))
  }
  function updateSolDownturn(id: number, patch: Partial<DownturnEvent>) {
    setSolDownturnEvents(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
  }
  function loadSolPreset(name: string) {
    const p = DT_PRESETS[name]
    if (!p) return
    const defAge = solDownturnEvents.length === 0
      ? retAge + 2
      : solDownturnEvents[solDownturnEvents.length - 1].age + 8
    setSolDownturnEvents(prev => [...prev, {
      id: nextId.current++, age: defAge, drop: p.drop, recYears: p.recYears, recRate: p.recRate, label: name,
    }])
  }

  // ── calcSolution (exact logic from HTML — auto-runs via useEffect) ────────
  const calcSolution = useCallback(() => {
    if (!projData.length) return
    const stdDed        = STD_DED[filing] ?? 16100
    const ssMonthlySOL  = ss * 12
    const fiaRate       = solRescueRet || 0.06
    const mktRet        = solMktRet    || 0.07
    const swrSQ         = solSwrSQ     || 0.04
    const swrFIA        = solSwrFIA    || 0.04
    const swrRoth       = solSwrRoth   || 0.04
    const pool          = solPool
    const scenario      = solScenario

    let qBal = 0, nqBal = 0, qContrib = 0, nqAnnual = 0
    for (const a of qualAccounts) {
      qBal += a.balance || 0
      if (a.active) qContrib += computeContrib(a, age, salary)
    }
    for (const a of nqAccounts) {
      nqBal    += a.balance  || 0
      nqAnnual += (a.monthly || 0) * 12
    }

    const totalAssets    = qBal + nqBal
    const annualContrib  = qContrib + nqAnnual
    const ruleOf110      = Math.min((110 - age) / 100, 1)

    let fiaPct: number
    if      (scenario === 'Full Rescue') fiaPct = 1.0
    else if (scenario === 'Partial 50')  fiaPct = 0.5
    else if (scenario === 'Custom')      fiaPct = Math.min(1, Math.max(0, solCustomPct))
    else                                 fiaPct = ruleOf110   // 'Max Partial'
    const mktPct = 1 - fiaPct

    // Bucket allocation (exact from HTML)
    let rothStart: number, sqStart: number, fiaStart: number
    if (pool === 'Q') {
      fiaStart  = qBal * fiaPct
      sqStart   = qBal * mktPct
      rothStart = nqBal
    } else if (pool === 'NQ') {
      fiaStart  = nqBal * fiaPct
      rothStart = nqBal * mktPct
      sqStart   = qBal
    } else {                               // BOTH
      const totalFIA = totalAssets * fiaPct
      fiaStart       = Math.min(qBal, totalFIA)
      const fiaFromNQ = Math.max(0, totalFIA - fiaStart)
      sqStart        = qBal  - fiaStart
      rothStart      = nqBal - fiaFromNQ
    }

    // Sol-specific crash / recovery maps
    const solDtByAge: Record<number, DownturnEvent[]> = {}
    for (const d of solDownturnEvents) {
      if (!solDtByAge[d.age]) solDtByAge[d.age] = []
      solDtByAge[d.age].push(d)
    }
    const solRecMap: Record<number, number> = {}
    for (const d of solDownturnEvents) {
      for (let y = 1; y <= d.recYears; y++) {
        const ra = d.age + y
        if (solRecMap[ra] == null) solRecMap[ra] = d.recRate / 100
      }
    }

    let rothBal    = rothStart
    let sqBal      = sqStart
    let fiaBal     = fiaStart
    let nfFiaBal   = fiaStart   // parallel no-floor FIA balance
    const startYear = new Date().getFullYear()
    const rows: SolRow[] = []

    for (let a = age; a <= 95; a++) {
      const retired = a >= retAge

      // Market return this year
      let thisMkt = mktRet
      if (solDtByAge[a]) {
        let drop = 0
        for (const d of solDtByAge[a]) drop += d.drop / 100
        thisMkt = -drop
      } else if (solRecMap[a] != null) {
        thisMkt = solRecMap[a]
      }
      // FIA with 0% floor: credits fiaRate on up years, 0% on down years
      const thisFIA = thisMkt > 0 ? fiaRate : 0.0
      // No-floor FIA: always follows full market return (no protection)
      const thisFIA_nf = thisMkt

      const events: string[] = []
      if (solDtByAge[a]) {
        for (const d of solDtByAge[a]) events.push(`-${d.drop}% ${d.label || 'Crash'}`)
      }

      const ssInc = retired && a >= ssAge ? ssMonthlySOL : 0

      if (!retired) {
        // ACCUMULATION: record start-of-year, then grow both scenarios
        rows.push({
          age: a, year: startYear + (a - age), retired: false, events,
          rothBal, sqBal, fiaBal, total: rothBal + sqBal + fiaBal,
          rothInc: 0, sqInc: 0, fiaInc: 0, ssInc: 0, totalInc: 0, afterTax: 0, bracket: 0,
          mktRet: thisMkt, fiaRet: thisFIA,
          fiaIncNF: 0, fiaBal_NF: nfFiaBal,
        })
        rothBal = Math.max(0, rothBal * (1 + thisMkt)) + nqAnnual * (pool === 'NQ' || pool === 'BOTH' ? mktPct : 1)
        sqBal   = Math.max(0, sqBal   * (1 + thisMkt)) + qContrib * (pool === 'Q'  || pool === 'BOTH' ? mktPct : 1)
        // FIA with floor
        fiaBal  = Math.max(0, fiaBal * (1 + thisFIA))
        if      (pool === 'Q')  fiaBal += qContrib    * fiaPct
        else if (pool === 'NQ') fiaBal += nqAnnual    * fiaPct
        else                    fiaBal += annualContrib * fiaPct
        // No-floor FIA follows full market
        nfFiaBal = Math.max(0, nfFiaBal * (1 + thisFIA_nf))
        if      (pool === 'Q')  nfFiaBal += qContrib    * fiaPct
        else if (pool === 'NQ') nfFiaBal += nqAnnual    * fiaPct
        else                    nfFiaBal += annualContrib * fiaPct
      } else {
        // DISTRIBUTION: apply returns, then withdraw each bucket at its own SWR
        const rothAfter   = Math.max(0, rothBal  * (1 + thisMkt))
        const sqAfter     = Math.max(0, sqBal    * (1 + thisMkt))
        const fiaAfter    = Math.max(0, fiaBal   * (1 + thisFIA))
        const nfFiaAfter  = Math.max(0, nfFiaBal * (1 + thisFIA_nf))  // no-floor

        const rothInc  = rothAfter   * swrRoth
        const sqInc    = sqAfter     * swrSQ
        const fiaInc   = fiaAfter    * swrFIA
        const fiaIncNF = nfFiaAfter  * swrFIA  // no-floor FIA income
        const totalInc = rothInc + sqInc + fiaInc + ssInc

        // Tax: SQ + FIA + SS are taxable; Roth is tax-free
        const taxableInc = sqInc + fiaInc + ssInc
        const taxable    = Math.max(0, taxableInc - stdDed)
        const bracket    = getBracket(taxable, filing)
        const tax        = estimateTax(taxable, filing)
        const afterTax   = totalInc - tax

        rothBal  = Math.max(0, rothAfter  - rothInc)
        sqBal    = Math.max(0, sqAfter    - sqInc)
        fiaBal   = Math.max(0, fiaAfter   - fiaInc)
        nfFiaBal = Math.max(0, nfFiaAfter - fiaIncNF)

        rows.push({
          age: a, year: startYear + (a - age), retired: true, events,
          rothBal, sqBal, fiaBal, total: rothBal + sqBal + fiaBal,
          rothInc, sqInc, fiaInc, ssInc, totalInc, afterTax, bracket,
          mktRet: thisMkt, fiaRet: thisFIA,
          fiaIncNF, fiaBal_NF: nfFiaBal,
        })
      }
    }
    setSolData(rows)
  }, [projData, age, retAge, filing, salary, otherIncome, qualAccounts, nqAccounts,
      solPool, solScenario, solCustomPct, solRescueRet, solMktRet,
      solSwrSQ, solSwrFIA, solSwrRoth, solDownturnEvents, ss, ssAge])

  useEffect(() => { calcSolution() }, [calcSolution])

  // ── calcHistorical (exact logic from HTML — auto-runs via useEffect) ──────
  const calcHistorical = useCallback(() => {
    const years = Object.keys(HIST).map(Number).sort((a, b) => a - b)
    let sqBal = histStart, rBal = histStart
    const sqW = histStart * histWr, rW = histStart * histWr
    const hData: HistRow[] = []
    for (const yr of years) {
      const mr = HIST[yr]
      const pr = mr < 0 ? 0 : mr * histPart
      sqBal = Math.max(0, (sqBal - sqW) * (1 + mr))
      rBal  = Math.max(0, (rBal  - rW)  * (1 + pr))
      hData.push({ year: yr, mr, sqBal, rBal, sqW, rW, pr })
    }
    setHistData(hData)
  }, [histStart, histWr, histPart])

  useEffect(() => { calcHistorical() }, [calcHistorical])

  // ── calcDownturn (exact logic from HTML — auto-runs via useEffect) ────────
  const calcDownturn = useCallback(() => {
    if (!projData.length) return
    const MKT          = dtNormalRate / 100 || 0.073
    const SWR          = 0.04
    const stdDed       = STD_DED[filing] ?? 16100
    const ssMonthlyDT  = ss * 12
    const startRow = projData.find(r => r.age === age) ?? projData[0]
    if (!startRow) return

    let qContrib = 0, nqAnnual = 0
    for (const a of qualAccounts) {
      if (a.active) qContrib += computeContrib(a, age, salary)
    }
    for (const a of nqAccounts) nqAnnual += (a.monthly || 0) * 12

    let baseBal = startRow.total  // clean baseline — NO crashes ever
    let dtBal   = startRow.total  // downturn portfolio — crashes applied

    // Build crash lookup: age → events
    const dtByAge: Record<number, DownturnEvent[]> = {}
    for (const d of downturnEvents) {
      if (!dtByAge[d.age]) dtByAge[d.age] = []
      dtByAge[d.age].push(d)
    }
    // Build recovery lookup: age → recovery rate
    const recMap: Record<number, number> = {}
    for (const d of downturnEvents) {
      for (let y = 1; y <= d.recYears; y++) {
        const ra = d.age + y
        if (recMap[ra] == null) recMap[ra] = d.recRate / 100
      }
    }

    const rows: DtRow[] = []
    for (let a = age; a <= 95; a++) {
      const retired = a >= retAge
      const ssInc   = a >= ssAge ? ssMonthlyDT : 0
      const events: string[] = []

      // Step 1: apply crashes to dtBal FIRST (before recording)
      if (dtByAge[a]) {
        for (const d of dtByAge[a]) {
          dtBal = Math.max(0, dtBal * (1 - d.drop / 100))
          events.push(`-${d.drop}% ${d.label || 'Crash'}`)
        }
      }

      // Recovery rate applies to dt portfolio regardless of retirement status
      const growthRate = recMap[a] != null ? recMap[a] : MKT
      // Only annotate recovery rows in the table when retired (withdrawals visible)
      const evStr = (recMap[a] != null && retired && !events.length)
        ? `Recovery (${Math.round(growthRate * 100)}%)`
        : ''

      if (!retired) {
        // Accumulation: record AFTER crash applied
        rows.push({ age: a, retired: false, events, evStr: '', baseBal, dtBal, baseWithdrawal: 0, dtWithdrawal: 0, baseInc: 0, dtInc: 0, dtAT: 0, ssInc: 0, growthRate })
        baseBal = baseBal * (1 + MKT) + (qContrib + nqAnnual)
        // Apply recovery rate to dt portfolio during accumulation too (pre-retirement crashes can recover)
        dtBal   = Math.max(0, dtBal * (1 + growthRate) + (qContrib + nqAnnual))
      } else {
        // Distribution: withdraw SWR% from portfolio, add SS on top
        const baseWithdrawal = baseBal * SWR
        const dtWithdrawal   = dtBal   * SWR
        const baseInc = baseWithdrawal + ssInc
        const dtInc   = dtWithdrawal   + ssInc
        const taxable = Math.max(0, dtInc - stdDed)
        const dtAT    = dtInc - estimateTax(taxable, filing)
        rows.push({ age: a, retired: true, events, evStr, baseBal, dtBal, baseWithdrawal, dtWithdrawal, baseInc, dtInc, dtAT, ssInc, growthRate })
        // Only portfolio withdrawal depletes balances — SS comes externally
        baseBal = Math.max(0, (baseBal - baseWithdrawal) * (1 + MKT))
        dtBal   = Math.max(0, (dtBal   - dtWithdrawal)   * (1 + growthRate))
      }
    }
    setDtData(rows)
  }, [projData, age, retAge, filing, salary, qualAccounts, nqAccounts, downturnEvents, dtNormalRate, ss, ssAge])

  // Auto-run whenever the calc or any of its inputs changes
  useEffect(() => { calcDownturn() }, [calcDownturn])

  // ── calculateAll ──────────────────────────────────────────────────────────
  // The UI percentage (projRate) is treated as the true annual effective return.
  // Annual compounding: nextBalance = currentBalance * (1 + projRate).
  // Both qualified and non-qualified accounts use the same projRate so the
  // displayed label and the actual math are always in sync.
  function handleCalculate() {
    const totalSalary = salary + otherIncome
    const ssMonthly   = ss * 12
    // Single growth rate for all buckets — reads from projRate state (no hardcoded fallback)
    const MKT = projRate
    const SWR = 0.04
    const stdDed = STD_DED[filing] ?? 16100

    let qB = 0, nqB = 0, qContrib = 0, nqAnnual = 0
    for (const a of qualAccounts) {
      qB += a.balance || 0
      if (a.active) qContrib += computeContrib(a, age, salary)
    }
    for (const a of nqAccounts) {
      nqB     += a.balance  || 0
      nqAnnual += (a.monthly || 0) * 12
    }

    const rows: ProjRow[] = []

    for (let a = age; a <= 120; a++) {
      const retired = a >= retAge
      const ssInc   = a >= ssAge ? ssMonthly : 0
      let pension   = 0
      for (const pen of pensions) {
        if (a >= pen.startAge)
          pension += pen.monthly * 12 * Math.pow(1 + (pen.cola || 0), a - pen.startAge)
      }
      const total = qB + nqB

      if (!retired) {
        // Accumulation: record balance BEFORE growth, then grow at projRate
        const taxInc  = Math.max(0, totalSalary - stdDed)
        const bracket = getBracket(taxInc, filing)
        rows.push({ age: a, qual: qB, nq: nqB, total, income: 0, bracket })
        qB  = qB  * (1 + MKT) + qContrib   // annual effective growth at projRate
        nqB = nqB * (1 + MKT) + nqAnnual   // same rate — one source of truth
      } else {
        if (total > 0) {
          // Distribution: withdraw SWR%, add SS and pension
          const drawdown = total * SWR
          const income   = drawdown + ssInc + pension
          const taxInc   = Math.max(0, income - stdDed)
          const bracket  = getBracket(taxInc, filing)
          rows.push({ age: a, qual: qB, nq: nqB, total, income, bracket })
          // Each bucket shrinks proportionally then grows at projRate
          qB  = Math.max(0, (qB  - drawdown * (qB  / total)) * (1 + MKT))
          nqB = Math.max(0, (nqB - drawdown * (nqB / total)) * (1 + MKT))
        } else {
          // Portfolio exhausted — only SS + pension remain
          const income  = ssInc + pension
          const bracket = getBracket(Math.max(0, income - stdDed), filing)
          rows.push({ age: a, qual: 0, nq: 0, total: 0, income, bracket })
        }
      }
    }

    setProjData(rows)
  }

  return (
    <>
      <style>{RT_CSS}</style>
      <div className="rt-wrap">

        {/* ── No-client warning ──────────────────────────────────────────── */}
        {!activeClient && (
          <div style={{ padding: '10px 24px' }}>
            <div className="rt-alert warning">
              <span>⚠️</span>
              <span>
                No client selected. Go to the{' '}
                <strong style={{ color: 'var(--rt-navy)' }}>Dashboard</strong> to select
                or create a client — profile fields will auto-fill from their record and
                all changes will be saved automatically.
              </span>
            </div>
          </div>
        )}

        {/* ── Active client banner ────────────────────────────────────────── */}
        {activeClient && (
          <div style={{
            background: 'var(--rt-navy)', color: '#fff',
            padding: '8px 24px', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ color: 'var(--rt-gold)', fontWeight: 700 }}>
              {activeClient.first_name} {activeClient.last_name}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>
              {activeClient.email ?? activeClient.phone ?? ''}
            </span>
            <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
              Changes save automatically
            </span>
          </div>
        )}

        {/* Tab bar */}
        <div className="rt-tab-bar">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`rt-tab-btn${activeTab === t.id ? ' rt-active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          <button
            className="rt-tab-btn rt-print-btn"
            style={{ marginLeft: 'auto', color: '#0d1b2a', fontWeight: 600 }}
            onClick={() => window.print()}
          >
            Print / PDF
          </button>
        </div>

        {/* Panels */}
        {activeTab === 'profile' && (
          <ProfilePanel
            pState={pState} setPState={setPState}
            filing={filing} setFiling={setFiling}
            age={age} setAge={setAge}
            retAge={retAge} setRetAge={setRetAge}
            salary={salary} setSalary={setSalary}
            otherIncome={otherIncome} setOtherIncome={setOtherIncome}
            ss={ss} setSs={setSs}
            ssAge={ssAge} setSsAge={setSsAge}
            expenses={expenses} setExpenses={setExpenses}
            projRate={projRate} setProjRate={setProjRate}
            qualAccounts={qualAccounts}
            addQual={addQual} removeQual={removeQual} updateQual={updateQual}
            nqAccounts={nqAccounts}
            addNQ={addNQ} removeNQ={removeNQ} updateNQ={updateNQ}
            pensions={pensions}
            addPension={addPension} removePension={removePension} updatePension={updatePension}
            onCalculate={handleCalculate}
          />
        )}
        {activeTab === 'projection' && (
          <ProjectionPanel
            projData={projData}
            projRate={projRate}
            age={age} retAge={retAge}
            filing={filing}
            salary={salary} otherIncome={otherIncome}
            ss={ss} ssAge={ssAge}
          />
        )}
        {activeTab === 'downturn' && (
          <DownturnPanel
            projData={projData}
            age={age} retAge={retAge} filing={filing}
            ss={ss} ssAge={ssAge}
            downturnEvents={downturnEvents}
            addDownturn={addDownturn} removeDownturn={removeDownturn}
            updateDownturn={updateDownturn} loadDtPreset={loadDtPreset}
            dtNormalRate={dtNormalRate} setDtNormalRate={setDtNormalRate}
            dtData={dtData} onCalcDownturn={calcDownturn}
          />
        )}
        {activeTab === 'solution' && (
          <SolutionPanel
            projData={projData}
            age={age} retAge={retAge} filing={filing}
            salary={salary} otherIncome={otherIncome}
            ss={ss} ssAge={ssAge}
            qualAccounts={qualAccounts} nqAccounts={nqAccounts}
            solPool={solPool}           setSolPool={setSolPool}
            solScenario={solScenario}   setSolScenario={setSolScenario}
            solCustomPct={solCustomPct} setSolCustomPct={setSolCustomPct}
            solRescueRet={solRescueRet} setSolRescueRet={setSolRescueRet}
            solMktRet={solMktRet}       setSolMktRet={setSolMktRet}
            solSwrSQ={solSwrSQ}         setSolSwrSQ={setSolSwrSQ}
            solSwrFIA={solSwrFIA}       setSolSwrFIA={setSolSwrFIA}
            solSwrRoth={solSwrRoth}     setSolSwrRoth={setSolSwrRoth}
            solDownturnEvents={solDownturnEvents}
            addSolDownturn={addSolDownturn}
            removeSolDownturn={removeSolDownturn}
            updateSolDownturn={updateSolDownturn}
            loadSolPreset={loadSolPreset}
            solData={solData}
            onCalcSolution={calcSolution}
          />
        )}
        {activeTab === 'historical' && (
          <HistoricalPanel
            histStart={histStart} setHistStart={setHistStart}
            histWr={histWr}       setHistWr={setHistWr}
            histPart={histPart}   setHistPart={setHistPart}
            histData={histData}   onCalcHistorical={calcHistorical}
          />
        )}
        {activeTab === 'report' && (
          <ReportPanel
            projData={projData}
            age={age} retAge={retAge} filing={filing} pState={pState}
            salary={salary} otherIncome={otherIncome} ss={ss} ssAge={ssAge}
            qualAccounts={qualAccounts} nqAccounts={nqAccounts} pensions={pensions}
            solPool={solPool} solScenario={solScenario} solCustomPct={solCustomPct}
            solRescueRet={solRescueRet} solMktRet={solMktRet}
            solSwrFIA={solSwrFIA} solSwrSQ={solSwrSQ}
            solDownturnEvents={solDownturnEvents}
          />
        )}
      </div>
    </>
  )
}

// ─── Profile Panel ────────────────────────────────────────────────────────────
interface ProfilePanelProps {
  pState: string; setPState: (v: string) => void
  filing: FilingStatus; setFiling: (v: FilingStatus) => void
  age: number; setAge: (v: number) => void
  retAge: number; setRetAge: (v: number) => void
  salary: number; setSalary: (v: number) => void
  otherIncome: number; setOtherIncome: (v: number) => void
  ss: number; setSs: (v: number) => void
  ssAge: number; setSsAge: (v: number) => void
  expenses: number; setExpenses: (v: number) => void
  projRate: number; setProjRate: (v: number) => void
  qualAccounts: QualAccount[]
  addQual: () => void; removeQual: (id: number) => void; updateQual: (id: number, p: Partial<QualAccount>) => void
  nqAccounts: NQAccount[]
  addNQ: () => void; removeNQ: (id: number) => void; updateNQ: (id: number, p: Partial<NQAccount>) => void
  pensions: Pension[]
  addPension: () => void; removePension: (id: number) => void; updatePension: (id: number, p: Partial<Pension>) => void
  onCalculate: () => void
}

function ProfilePanel(p: ProfilePanelProps) {
  // ── Derived totals ──────────────────────────────────────────────────────
  const qualTotalBal  = p.qualAccounts.reduce((s, a) => s + (a.balance || 0), 0)
  const qualTotalCont = p.qualAccounts.reduce((s, a) => s + (a.active ? computeContrib(a, p.age, p.salary) : 0), 0)
  const nqTotalBal    = p.nqAccounts.reduce((s, a) => s + (a.balance || 0), 0)
  const nqTotalMo     = p.nqAccounts.reduce((s, a) => s + (a.monthly || 0), 0)

  return (
    <div className="rt-panel">

      {/* ── Basic Info ───────────────────────────────────────────────────── */}
      <div className="rt-card">
        <h2>Client Profile</h2>
        <div className="rt-form-grid">

          <div className="rt-form-group">
            <label>State</label>
            <select value={p.pState} onChange={e => p.setPState(e.target.value)}>
              {US_STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="rt-form-group">
            <label>Filing Status</label>
            <select value={p.filing} onChange={e => p.setFiling(e.target.value as FilingStatus)}>
              {FILING_OPTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="rt-form-group">
            <label>Current Age</label>
            <input
              type="number" value={p.age}
              onFocus={e => e.target.select()}
              onChange={e => p.setAge(parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="rt-form-group">
            <label>Target Retirement Age</label>
            <input
              type="number" value={p.retAge}
              onFocus={e => e.target.select()}
              onChange={e => p.setRetAge(parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="rt-form-group">
            <label>Base Salary ($)</label>
            <input
              type="number" value={p.salary}
              onFocus={e => e.target.select()}
              onChange={e => p.setSalary(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="rt-form-group">
            <label>Other Income ($)</label>
            <input
              type="number" value={p.otherIncome}
              onFocus={e => e.target.select()}
              onChange={e => p.setOtherIncome(parseFloat(e.target.value) || 0)}
            />
          </div>

        </div>
      </div>

      {/* ── Qualified Accounts ───────────────────────────────────────────── */}
      <div className="rt-card">
        <div className="rt-section-header">
          <h2 style={{ border: 'none', margin: 0, padding: 0 }}>
            Qualified Accounts (Tax-Deferred)
          </h2>
          <button className="rt-add-btn" onClick={p.addQual}>+ Add Account</button>
        </div>

        {p.qualAccounts.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--rt-muted)', padding: '8px 0' }}>
            No qualified accounts. Click "+ Add Account".
          </p>
        ) : (
          p.qualAccounts.map(a => {
            const lim      = irsLimit(a.type, p.age)
            const contrib  = computeContrib(a, p.age, p.salary)
            const note     = lim
              ? `IRS limit: ${fmt(lim)} | Auto: ${fmt(contrib)}/yr`
              : 'No IRS limit'
            const dimStyle = a.active ? {} : { opacity: 0.4, pointerEvents: 'none' as const }

            // ── Contribution breakdown bar math ──────────────────────────
            // Show whenever the account has an employer match defined.
            const hasMatchBar = a.matchPct > 0 && lim && p.salary > 0
            let matchedEmpAmt = 0, employerMatchAmt = 0, overageAmt = 0, gapAmt = 0
            let matchedEmpBarPct = 0, matchBarPct = 0, overageBarPct = 0, gapBarPct = 0
            let leavingMoneyOnTable = false
            let empSummaryPct = 0, employerSummaryPct = 0, totalSummaryPct = 0
            if (hasMatchBar && lim) {
              const empAmt     = p.salary * a.empPct
              const capAmt     = p.salary * a.matchUpTo
              const mEmp       = Math.min(empAmt, capAmt)   // matched employee portion
              const employer   = mEmp * a.matchPct           // employer match received
              const overage    = Math.max(0, empAmt - capAmt) // employee above cap
              const totalUsed  = mEmp + employer + overage
              const scale      = totalUsed > lim ? lim / totalUsed : 1
              matchedEmpAmt    = mEmp     * scale
              employerMatchAmt = employer * scale
              overageAmt       = overage  * scale
              gapAmt           = Math.max(0, lim - matchedEmpAmt - employerMatchAmt - overageAmt)
              matchedEmpBarPct = (matchedEmpAmt   / lim) * 100
              matchBarPct      = (employerMatchAmt / lim) * 100
              overageBarPct    = (overageAmt       / lim) * 100
              gapBarPct        = (gapAmt           / lim) * 100
              empSummaryPct    = Math.round(a.empPct * 100)
              employerSummaryPct = p.salary > 0 ? Math.round(employerMatchAmt / p.salary * 100 * 10) / 10 : 0
              totalSummaryPct  = p.salary > 0 ? Math.round((matchedEmpAmt + overageAmt + employerMatchAmt) / p.salary * 100 * 10) / 10 : 0
              leavingMoneyOnTable = a.empPct === 0 && a.matchPct > 0
            }

            return (
              <div key={a.id}>
                {/* Account input row */}
                <div className={`rt-acct-row qual-row${a.active ? '' : ' inactive-acct'}`}>

                  {/* Type */}
                  <div className="rt-form-group">
                    <label>Type</label>
                    <select value={a.type}
                      onChange={e => p.updateQual(a.id, { type: e.target.value })}>
                      {QUAL_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Label + Active badge */}
                  <div className="rt-form-group">
                    <label>
                      Label&nbsp;
                      {a.active
                        ? <span style={{ background:'#e6f4ed', color:'#2e7d52', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10 }}>Active</span>
                        : <span style={{ background:'#fce8e8', color:'#b83232', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10 }}>Frozen</span>
                      }
                    </label>
                    <input type="text" value={a.label} placeholder="e.g. My TSP"
                      onChange={e => p.updateQual(a.id, { label: e.target.value })}
                    />
                  </div>

                  {/* Balance */}
                  <div className="rt-form-group">
                    <label>Balance ($)</label>
                    <input type="number" value={a.balance}
                      onFocus={e => e.target.select()}
                      onChange={e => p.updateQual(a.id, { balance: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Employee Contributes % */}
                  <div className="rt-form-group" style={dimStyle}>
                    <label>Employee Contributes %</label>
                    <input type="number" step="1" min="0" max="100"
                      value={Math.round(a.empPct * 100)}
                      onFocus={e => e.target.select()}
                      onChange={e => p.updateQual(a.id, { empPct: (parseFloat(e.target.value) || 0) / 100 })}
                    />
                  </div>

                  {/* Employer Matches % */}
                  <div className="rt-form-group" style={dimStyle}>
                    <label>Employer Matches %</label>
                    <input type="number" step="1" min="0" max="200"
                      value={Math.round(a.matchPct * 100)}
                      onFocus={e => e.target.select()}
                      onChange={e => p.updateQual(a.id, { matchPct: (parseFloat(e.target.value) || 0) / 100 })}
                    />
                  </div>

                  {/* Match Cap % of Salary */}
                  <div className="rt-form-group" style={dimStyle}>
                    <label>Match Cap % of Salary</label>
                    <input type="number" step="1" min="0" max="100"
                      value={Math.round(a.matchUpTo * 100)}
                      onFocus={e => e.target.select()}
                      onChange={e => p.updateQual(a.id, { matchUpTo: (parseFloat(e.target.value) || 0) / 100 })}
                    />
                  </div>

                  {/* Auto contrib (read-only) */}
                  <div className="rt-form-group" style={dimStyle}>
                    <label>
                      Annual Contrib&nbsp;
                      <span style={{ fontSize:10, color:'var(--rt-green)' }}>Auto</span>
                    </label>
                    <input type="number" readOnly value={Math.round(contrib)}
                      onFocus={e => e.target.select()}
                    />
                    <div className="rt-calc-note">{note}</div>
                  </div>

                  {/* Contributing? */}
                  <div className="rt-form-group">
                    <label>Contributing?</label>
                    <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', marginTop:6 }}>
                      <input type="checkbox" checked={a.active}
                        onChange={e => p.updateQual(a.id, { active: e.target.checked })}
                      />
                      <span style={{ fontSize: 12 }}>{a.active ? 'Yes' : 'Frozen'}</span>
                    </label>
                  </div>

                  {/* Remove */}
                  <button className="rt-remove-btn" title="Remove"
                    onClick={() => p.removeQual(a.id)}>×</button>
                </div>

                {/* ── Contribution breakdown bar ──────────────────────────── */}
                {hasMatchBar && (
                  <div style={{
                    margin: '-6px 0 12px 0',
                    padding: '11px 14px 13px',
                    background: '#f4faf7',
                    border: '1px solid #c8e6d4',
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    opacity: a.active ? 1 : 0.65,
                  }}>

                    {/* Bar label */}
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--rt-navy)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:7, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span>Annual Contribution Breakdown — vs IRS Limit ({fmt(lim!)})</span>
                      {leavingMoneyOnTable && (
                        <span style={{ background:'#fce8e8', color:'#b83232', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, letterSpacing:0, textTransform:'none' }}>
                          ⚠️ Not capturing employer match
                        </span>
                      )}
                    </div>

                    {/* Stacked bar — green: matched employee, gold: employer match, red: overage above cap, gray: IRS gap */}
                    <div style={{ display:'flex', height:18, borderRadius:6, overflow:'hidden', background:'#e8e8e3', width:'100%' }}>
                      {matchedEmpBarPct > 0 && (
                        <div
                          title={`Matched employee contribution: ${fmt(matchedEmpAmt)}/yr (eligible for employer match)`}
                          style={{ width:`${matchedEmpBarPct}%`, background:'#2e7d52', transition:'width .3s' }}
                        />
                      )}
                      {matchBarPct > 0 && (
                        <div
                          title={`Employer match received: ${fmt(employerMatchAmt)}/yr`}
                          style={{ width:`${matchBarPct}%`, background:'#c9a84c', transition:'width .3s' }}
                        />
                      )}
                      {overageBarPct > 0 && (
                        <div
                          title={`Unmatched overage above match cap: ${fmt(overageAmt)}/yr (no employer match on this portion)`}
                          style={{ width:`${overageBarPct}%`, background:'#b83232', transition:'width .3s' }}
                        />
                      )}
                      {gapBarPct > 0 && (
                        <div
                          title={`Room left before IRS limit: ${fmt(gapAmt)}/yr`}
                          style={{ width:`${gapBarPct}%`, background:'#deded8', transition:'width .3s' }}
                        />
                      )}
                    </div>

                    {/* Legend dots + dollar amounts */}
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 20px', marginTop:8 }}>
                      <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--rt-navy)' }}>
                        <span style={{ width:10, height:10, borderRadius:2, background:'#2e7d52', display:'inline-block', flexShrink:0 }} />
                        <span>Matched contribution: <strong>{fmt(matchedEmpAmt)}/yr</strong></span>
                      </span>
                      <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--rt-navy)' }}>
                        <span style={{ width:10, height:10, borderRadius:2, background:'#c9a84c', display:'inline-block', flexShrink:0 }} />
                        <span>Employer adds: <strong style={{ color:'var(--rt-gold)' }}>{fmt(employerMatchAmt)}/yr</strong></span>
                      </span>
                      {overageAmt > 0 && (
                        <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--rt-navy)' }}>
                          <span style={{ width:10, height:10, borderRadius:2, background:'#b83232', display:'inline-block', flexShrink:0 }} />
                          <span>Above cap (unmatched): <strong style={{ color:'var(--rt-red)' }}>{fmt(overageAmt)}/yr</strong></span>
                        </span>
                      )}
                      {gapAmt > 0 && (
                        <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--rt-navy)' }}>
                          <span style={{ width:10, height:10, borderRadius:2, background:'#deded8', border:'1px solid #bbb', display:'inline-block', flexShrink:0 }} />
                          <span>You could add more: <strong style={{ color:'#888' }}>{fmt(gapAmt)}/yr</strong> <span style={{ color:'var(--rt-muted)', fontWeight:400 }}>(up to IRS limit)</span></span>
                        </span>
                      )}
                    </div>

                    {/* Plain English summary */}
                    <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(13,27,42,0.04)', borderRadius:8, fontSize:12, color:'var(--rt-navy)', fontWeight:500 }}>
                      You put in <strong>{empSummaryPct}%</strong> → Employer adds <strong style={{ color:'var(--rt-green)' }}>{employerSummaryPct}%</strong> → Total: <strong style={{ color:'var(--rt-navy)' }}>{totalSummaryPct}% of salary</strong> going to retirement
                    </div>

                  </div>
                )}
              </div>
            )
          })
        )}

        <div className="rt-divider" />
        <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, fontSize:13, color:'var(--rt-muted)' }}>
          <span>Total Balance: <strong style={{ color:'var(--rt-navy)', fontSize:15 }}>{fmt(qualTotalBal)}</strong></span>
          <span>Active Contributions: <strong style={{ color:'var(--rt-green)', fontSize:15 }}>{fmt(qualTotalCont)}/yr</strong></span>
        </div>
      </div>

      {/* ── Non-Qualified Accounts ───────────────────────────────────────── */}
      <div className="rt-card">
        <div className="rt-section-header">
          <h2 style={{ border:'none', margin:0, padding:0 }}>
            Non-Qualified Accounts (Roth / Tax-Free)
          </h2>
          <button className="rt-add-btn" onClick={p.addNQ}>+ Add Account</button>
        </div>

        {p.nqAccounts.length === 0 ? (
          <p style={{ fontSize:13, color:'var(--rt-muted)', padding:'8px 0' }}>
            No non-qualified accounts. Click "+ Add Account".
          </p>
        ) : (
          p.nqAccounts.map(a => (
            <div key={a.id} className="rt-acct-row nq-row">
              <div className="rt-form-group">
                <label>Type</label>
                <select value={a.type}
                  onChange={e => p.updateNQ(a.id, { type: e.target.value })}>
                  {NQ_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div className="rt-form-group">
                <label>Label</label>
                <input type="text" value={a.label} placeholder="e.g. Roth IRA"
                  onChange={e => p.updateNQ(a.id, { label: e.target.value })}
                />
              </div>

              <div className="rt-form-group">
                <label>Balance ($)</label>
                <input type="number" value={a.balance}
                  onFocus={e => e.target.select()}
                  onChange={e => p.updateNQ(a.id, { balance: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="rt-form-group">
                <label>Monthly Contribution ($)</label>
                <input type="number" value={a.monthly}
                  onFocus={e => e.target.select()}
                  onChange={e => p.updateNQ(a.id, { monthly: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <button className="rt-remove-btn" title="Remove"
                onClick={() => p.removeNQ(a.id)}>×</button>
            </div>
          ))
        )}

        <div className="rt-divider" />
        <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, fontSize:13, color:'var(--rt-muted)' }}>
          <span>Total Balance: <strong style={{ color:'var(--rt-navy)', fontSize:15 }}>{fmt(nqTotalBal)}</strong></span>
          <span>Monthly Contributions: <strong style={{ color:'var(--rt-green)', fontSize:15 }}>{fmt(nqTotalMo)}/mo</strong></span>
        </div>
      </div>

      {/* ── Pensions ─────────────────────────────────────────────────────── */}
      <div className="rt-card">
        <div className="rt-section-header">
          <h2 style={{ border:'none', margin:0, padding:0 }}>Pensions</h2>
          <button className="rt-add-btn" onClick={p.addPension}>+ Add Pension</button>
        </div>

        {p.pensions.length === 0 ? (
          <p style={{ fontSize:13, color:'var(--rt-muted)', padding:'8px 0' }}>No pensions added.</p>
        ) : (
          p.pensions.map(pen => (
            <div key={pen.id} className="rt-acct-row pension-row">
              <div className="rt-form-group">
                <label>Employer / Plan</label>
                <input type="text" value={pen.employer} placeholder="e.g. FERS"
                  onChange={e => p.updatePension(pen.id, { employer: e.target.value })}
                />
              </div>

              <div className="rt-form-group">
                <label>Monthly Benefit ($)</label>
                <input type="number" value={pen.monthly}
                  onFocus={e => e.target.select()}
                  onChange={e => p.updatePension(pen.id, { monthly: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="rt-form-group">
                <label>Start Age</label>
                <input type="number" value={pen.startAge}
                  onFocus={e => e.target.select()}
                  onChange={e => p.updatePension(pen.id, { startAge: parseInt(e.target.value) || 65 })}
                />
              </div>

              <div className="rt-form-group">
                <label>Annual COLA %</label>
                <input type="number" step="0.5" min="0" max="20"
                  value={+(pen.cola * 100).toFixed(1)}
                  onFocus={e => e.target.select()}
                  onChange={e => p.updatePension(pen.id, { cola: (parseFloat(e.target.value) || 0) / 100 })}
                />
              </div>

              <div className="rt-form-group">
                <label>Survivor %</label>
                <input type="number" step="1" min="0" max="100"
                  value={Math.round(pen.survivor * 100)}
                  onFocus={e => e.target.select()}
                  onChange={e => p.updatePension(pen.id, { survivor: (parseFloat(e.target.value) || 0) / 100 })}
                />
              </div>

              <button className="rt-remove-btn" title="Remove"
                onClick={() => p.removePension(pen.id)}>×</button>
            </div>
          ))
        )}
      </div>

      {/* ── Social Security & Expenses ───────────────────────────────────── */}
      <div className="rt-card">
        <h3>Social Security &amp; Expenses</h3>
        <div className="rt-form-grid">
          <div className="rt-form-group">
            <label>Est. SS Monthly ($)</label>
            <input type="number" value={p.ss}
              onFocus={e => e.target.select()}
              onChange={e => p.setSs(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="rt-form-group">
            <label>SS Start Age</label>
            <input type="number" value={p.ssAge}
              onFocus={e => e.target.select()}
              onChange={e => p.setSsAge(parseInt(e.target.value) || 67)}
            />
          </div>
          <div className="rt-form-group">
            <label>Monthly Expenses ($)</label>
            <input type="number" value={p.expenses}
              onFocus={e => e.target.select()}
              onChange={e => p.setExpenses(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      {/* ── Projection rate + Calculate button ──────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', marginTop:8 }}>
        <div className="rt-form-group" style={{ minWidth:200 }}>
          <label>Projection Growth Rate (%)</label>
          <input
            type="number" step="0.5" min="0" max="20"
            value={+(p.projRate * 100).toFixed(1)}
            onFocus={e => e.target.select()}
            onChange={e => p.setProjRate((parseFloat(e.target.value) || 0) / 100)}
          />
        </div>
        <button className="rt-calc-btn" style={{ marginTop:20 }} onClick={p.onCalculate}>
          Calculate Projections
        </button>
      </div>

    </div>
  )
}

// ─── Placeholder panels (replaced in subsequent parts) ───────────────────────

// ─── 7% Projection Panel ─────────────────────────────────────────────────────
interface ProjectionPanelProps {
  projData: ProjRow[]
  projRate: number
  age: number; retAge: number
  filing: FilingStatus; salary: number; otherIncome: number
  ss: number; ssAge: number
}

function ProjectionPanel({ projData, projRate, retAge, filing, salary, otherIncome, ss, ssAge }: ProjectionPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef  = useRef<InstanceType<typeof Chart> | null>(null)

  // Build / rebuild chart whenever projection data changes (hooks before any early return)
  useEffect(() => {
    if (!canvasRef.current || !projData.length) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

    const disp    = projData.filter(r => r.age <= 100)
    const labels  = disp.map(r => r.age)
    const quals   = disp.map(r => r.qual  / 1e6)
    const nqs     = disp.map(r => r.nq    / 1e6)
    const tots    = disp.map(r => r.total / 1e6)
    const incomes = disp.map(r => r.age >= retAge ? r.income : null)

    chartRef.current = new Chart(canvasRef.current!, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label:'Total Balance',  data:tots,    borderColor:'#c9a84c', fill:true,  backgroundColor:'rgba(201,168,76,0.08)', tension:0.4, pointRadius:0, borderWidth:2.5, yAxisID:'y' },
          { label:'Qualified',      data:quals,   borderColor:'#0d1b2a', fill:false, tension:0.4, pointRadius:0, borderWidth:1.5, yAxisID:'y' },
          { label:'Non-Qualified',  data:nqs,     borderColor:'#2e7d52', fill:false, tension:0.4, pointRadius:0, borderWidth:1.5, yAxisID:'y' },
          { label:'Annual Income',  data:incomes, borderColor:'#b83232', fill:false, tension:0.3, pointRadius:0, borderWidth:2,   yAxisID:'y2', spanGaps:false },
        ] as any,
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y:  { type:'linear', position:'left',  ticks:{ callback:(v:any) => `$${Number(v).toFixed(1)}M` },       title:{ display:true, text:'Portfolio Balance' } },
          y2: { type:'linear', position:'right', grid:{ drawOnChartArea:false }, ticks:{ callback:(v:any) => `$${(Number(v)/1000).toFixed(0)}k` }, title:{ display:true, text:'Annual Income' } },
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: { callbacks: { label: (ctx: any) => {
            if (ctx.datasetIndex < 3) return `${ctx.dataset.label}: $${Number(ctx.raw).toFixed(2)}M`
            return `${ctx.dataset.label}: ${fmt(ctx.raw)}`
          }}},
        },
      },
    } as any)

    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [projData, retAge])

  // ── Empty state (shown before first calculation) ──────────────────────────
  if (!projData.length) {
    return (
      <div className="rt-panel">
        <div className="rt-card" style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>📊</div>
          <p style={{ fontSize:14, color:'var(--rt-muted)' }}>
            Click <strong style={{ color:'var(--rt-navy)' }}>Calculate Projections</strong> on the{' '}
            <strong style={{ color:'var(--rt-navy)' }}>Client Profile</strong> tab to see results.
          </p>
        </div>
      </div>
    )
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const totalSalary  = salary + otherIncome
  const ssMonthly    = ss * 12
  const stdDed       = STD_DED[filing] ?? 16100
  const dispData     = projData.filter(r => r.age <= 100)
  const retRow       = projData.find(r => r.age === retAge) ?? projData[0]
  const row100       = projData.find(r => r.age === 100)    ?? projData[projData.length - 1]
  const curBrk       = getBracket(Math.max(0, totalSalary - stdDed), filing)
  const retBrk       = getBracket(Math.max(0, retRow.income - stdDed), filing)
  const gap          = totalSalary - retRow.income
  const maxV         = Math.max(totalSalary, retRow.income, 1)
  const retAfterTax  = retRow.income - estimateTax(Math.max(0, retRow.income - stdDed), filing)
  const ssNote       = ssMonthly > 0 ? ` (incl. $${Math.round(ss).toLocaleString()}/mo SS)` : ''
  const retSsInc     = retAge >= ssAge ? ssMonthly : 0
  const retWithdrawal = retRow.income - retSsInc

  return (
    <div className="rt-panel">

      {/* Header */}
      <div className="rt-section-header">
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'var(--rt-navy)' }}>
          {(projRate * 100 % 1 === 0 ? (projRate * 100).toFixed(0) : (projRate * 100).toFixed(1))}% Annual Return Projection
        </h2>
        <span style={{ fontSize:12, color:'var(--rt-muted)', background:'#fffbe6', padding:'5px 12px', borderRadius:20, border:'1px solid var(--rt-gold)' }}>
          Hypothetical — No Market Losses
        </span>
      </div>

      {/* Stats row */}
      <div className="rt-stats-row">
        <div className="rt-stat-box">
          <div className="rt-stat-label">Portfolio at Retirement</div>
          <div className="rt-stat-value">{fmt(retRow.total)}</div>
          <div className="rt-stat-sub">Age {retAge}</div>
        </div>
        {ss > 0 && (
          <div className="rt-stat-box gold">
            <div className="rt-stat-label">SS Income</div>
            <div className="rt-stat-value">{fmt(ssMonthly)}/yr</div>
            <div className="rt-stat-sub">Starting age {ssAge}</div>
          </div>
        )}
        <div className="rt-stat-box green">
          <div className="rt-stat-label">Gross Retirement Income</div>
          <div className="rt-stat-value">{fmt(retRow.income)}</div>
          {retSsInc > 0 ? (
            <div className="rt-stat-sub" style={{ fontSize: 10, lineHeight: 1.4 }}>
              Portfolio {fmt(retWithdrawal)} + SS {fmt(retSsInc)}{ssNote && ' = ' + fmt(retRow.income)}<br/>
              Based on 4% withdrawal rate
            </div>
          ) : (
            <div className="rt-stat-sub">Based on 4% withdrawal rate{ssNote}</div>
          )}
        </div>
        <div className="rt-stat-box green">
          <div className="rt-stat-label">After-Tax Retirement Income</div>
          <div className="rt-stat-value">{fmt(retAfterTax)}</div>
          <div className="rt-stat-sub">Net of {fmtPct(retBrk)} bracket</div>
        </div>
        <div className={`rt-stat-box ${gap > 0 ? 'red' : 'green'}`}>
          <div className="rt-stat-label">Income Gap</div>
          <div className="rt-stat-value">{fmt(Math.abs(gap))}</div>
          <div className="rt-stat-sub">{gap > 0 ? 'Shortfall vs salary' : 'Exceeds salary'}</div>
        </div>
        <div className={`rt-stat-box ${retBrk < curBrk ? 'green' : retBrk > curBrk ? 'red' : ''}`}>
          <div className="rt-stat-label">Tax Bracket Change</div>
          <div className="rt-stat-value">{fmtPct(curBrk)} → {fmtPct(retBrk)}</div>
          <div className="rt-stat-sub">
            {retBrk < curBrk ? 'Lower in retirement' : retBrk > curBrk ? 'Higher in retirement' : 'Same bracket in retirement'}
          </div>
        </div>
        <div className="rt-stat-box navy">
          <div className="rt-stat-label">Balance at Age 100</div>
          <div className="rt-stat-value">{fmt(row100.total)}</div>
          <div className="rt-stat-sub">{(projRate * 100 % 1 === 0 ? (projRate * 100).toFixed(0) : (projRate * 100).toFixed(1))}% hypothetical growth</div>
        </div>
      </div>

      {/* Income Gap Analysis */}
      <div className="rt-card">
        <h2>Income Gap Analysis</h2>
        <div className="rt-income-gap-bar">
          {[
            { label: 'Current Working Income',    val: totalSalary,   color: 'var(--rt-navy)',    textColor: undefined },
            { label: 'Gross Retirement Income',   val: retRow.income, color: 'var(--rt-green)',   textColor: 'var(--rt-green)' },
            { label: 'After-Tax Retirement Income', val: retAfterTax, color: '#2e7d52aa',         textColor: 'var(--rt-green)' },
            { label: 'Income Gap (Gross)',         val: Math.abs(gap), color: 'var(--rt-red)',     textColor: 'var(--rt-red)' },
          ].map(row => (
            <div key={row.label} className="rt-gap-row">
              <div className="rt-gap-label">{row.label}</div>
              <div className="rt-gap-track">
                <div className="rt-gap-fill" style={{ width: `${(row.val / maxV * 100).toFixed(1)}%`, background: row.color }} />
              </div>
              <div className="rt-gap-amount" style={{ color: row.textColor }}>{fmt(row.val)}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:14, padding:12, background:'#f9f7f3', borderRadius:8, fontSize:13 }}>
          <strong>Tax Bracket:</strong>{' '}
          Working = <span style={{ color:'var(--rt-navy)', fontWeight:700 }}>{fmtPct(curBrk)}</span>
          {' '}→{' '}
          Retirement = <span style={{ color: retBrk < curBrk ? 'var(--rt-green)' : 'var(--rt-red)', fontWeight:700 }}>{fmtPct(retBrk)}</span>
          &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>Est. After-Tax Income:</strong>{' '}
          <span style={{ color:'var(--rt-navy)', fontWeight:700 }}>{fmt(retAfterTax)}/yr</span>
          {ssMonthly > 0 && (
            <>&nbsp;&nbsp;|&nbsp;&nbsp;
              <strong>SS Income:</strong>{' '}
              <span style={{ color:'var(--rt-green)', fontWeight:700 }}>{fmt(ssMonthly)}/yr</span>
              {' '}starting age {ssAge}
            </>
          )}
        </div>
      </div>

      {/* Portfolio Growth Chart */}
      <div className="rt-card">
        <h2>Portfolio Growth Chart</h2>
        <div className="rt-chart-wrap">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Year-by-Year Table */}
      <div className="rt-card">
        <h2>Year-by-Year Projection</h2>
        <div className="rt-tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Age</th><th>Qualified</th><th>Non-Qual</th>
                <th>Total Balance</th><th>SS Income</th><th>Portfolio Withdrawal</th>
                <th>Gross Income</th><th>After-Tax Income</th><th>Tax Bracket</th>
              </tr>
            </thead>
            <tbody>
              {dispData.map(r => {
                const inRet    = r.age >= retAge
                const rowSsInc = r.age >= ssAge ? ssMonthly : 0
                const rowWithdrawal = r.income - rowSsInc
                const taxable  = Math.max(0, r.income - stdDed)
                const afterTax = r.income - estimateTax(taxable, filing)
                const bc = r.bracket >= 0.32 ? 'rt-badge-red' : r.bracket >= 0.22 ? 'rt-badge-gold' : 'rt-badge-green'
                return (
                  <tr key={r.age} className={r.age === retAge ? 'rt-highlight-row' : ''}>
                    <td>
                      {r.age}
                      {r.age === retAge && <>&nbsp;<span className="rt-badge rt-badge-gold">Ret.</span></>}
                      {r.age === ssAge && ss > 0 && <>&nbsp;<span className="rt-badge rt-badge-green">SS</span></>}
                    </td>
                    <td>{fmt(r.qual)}</td>
                    <td>{fmt(r.nq)}</td>
                    <td><strong>{fmt(r.total)}</strong></td>
                    <td>
                      {inRet
                        ? rowSsInc > 0
                          ? <span style={{ color:'var(--rt-green)', fontWeight:600 }}>{fmt(rowSsInc)}</span>
                          : <span style={{ color:'var(--rt-muted)', fontSize:11 }}>$0</span>
                        : '--'}
                    </td>
                    <td>{inRet ? fmt(rowWithdrawal) : <span style={{ color:'var(--rt-muted)', fontSize:11 }}>Accumulating</span>}</td>
                    <td><strong>{inRet ? fmt(r.income) : <span style={{ color:'var(--rt-muted)', fontSize:11 }}>—</span>}</strong></td>
                    <td>{inRet ? fmt(afterTax) : '--'}</td>
                    <td><span className={`rt-badge ${bc}`}>{fmtPct(r.bracket)}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

// ─── Market Downturn Panel ────────────────────────────────────────────────────
interface DownturnPanelProps {
  projData: ProjRow[]
  age: number; retAge: number; filing: FilingStatus
  ss: number; ssAge: number
  downturnEvents: DownturnEvent[]
  addDownturn: () => void
  removeDownturn: (id: number) => void
  updateDownturn: (id: number, patch: Partial<DownturnEvent>) => void
  loadDtPreset: (name: string, id: number) => void
  dtNormalRate: number; setDtNormalRate: (v: number) => void
  dtData: DtRow[]
  onCalcDownturn: () => void
}

function DownturnPanel({
  projData, retAge, ss, ssAge,
  downturnEvents, addDownturn, removeDownturn, updateDownturn, loadDtPreset,
  dtNormalRate, setDtNormalRate, dtData, onCalcDownturn,
}: DownturnPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef  = useRef<InstanceType<typeof Chart> | null>(null)

  // Rebuild chart whenever dtData changes (hook before any early return)
  useEffect(() => {
    if (!canvasRef.current || !dtData.length) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

    const labels   = dtData.map(r => r.age)
    const dtBals   = dtData.map(r => r.dtBal   / 1e6)
    const baseBals = dtData.map(r => r.baseBal  / 1e6)
    const dtIncs   = dtData.map(r => r.retired ? r.dtInc   : null)
    const baseIncs = dtData.map(r => r.retired ? r.baseInc : null)

    chartRef.current = new Chart(canvasRef.current!, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label:'Base (No Crashes)',  data:baseBals, borderColor:'#2e7d52', fill:false, tension:0.4, pointRadius:0, borderWidth:2,   yAxisID:'y' },
          { label:'With Downturns',     data:dtBals,   borderColor:'#b83232', fill:true,  backgroundColor:'rgba(184,50,50,0.07)', tension:0.2, pointRadius:0, borderWidth:2.5, yAxisID:'y' },
          { label:'Income (Downturns)', data:dtIncs,   borderColor:'#e07b00', fill:false, tension:0.3, pointRadius:0, borderWidth:1.5, yAxisID:'y2', spanGaps:false },
          { label:'Income (Base)',      data:baseIncs, borderColor:'#c9a84c', fill:false, tension:0.3, pointRadius:0, borderWidth:1.5, yAxisID:'y2', spanGaps:false },
        ] as any,
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y:  { type:'linear', position:'left',  ticks:{ callback:(v:any) => `$${Number(v).toFixed(1)}M` },       title:{ display:true, text:'Balance' } },
          y2: { type:'linear', position:'right', grid:{ drawOnChartArea:false }, ticks:{ callback:(v:any) => `$${(Number(v)/1000).toFixed(0)}k` }, title:{ display:true, text:'Annual Income' } },
        },
        plugins: { legend: { position: 'top' } },
      },
    } as any)

    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [dtData])

  // ── Derived stats ─────────────────────────────────────────────────────────
  const ssMonthlyDT = ss * 12
  const retRowDT  = dtData.find(r => r.age === retAge)
  const baseAtRet = retRowDT?.baseInc ?? 0
  const row90     = dtData.find(r => r.age === 90)
  const dtBal90   = row90?.dtBal   ?? 0
  const baseBal90 = row90?.baseBal ?? 0
  const totalDrop = downturnEvents.reduce((s, d) => s + d.drop, 0)
  const sorted    = [...downturnEvents].sort((a, b) => a.age - b.age)
  const presetKeys = Object.keys(DT_PRESETS)

  // Crash-year reference: find the first retired crash row for focused display
  const firstRetiredCrashRow = dtData.find(r => r.retired && r.events.length > 0)
  const crashAge = firstRetiredCrashRow?.age ?? null
  // What total income would have been at the crash year WITHOUT any crash (base scenario)
  const baseIncAtCrash = firstRetiredCrashRow?.baseInc ?? 0
  // What total income actually IS at the crash year (with the crash applied)
  const dtIncAtCrash   = firstRetiredCrashRow?.dtInc   ?? 0
  // Portfolio-only (no SS) crash-year comparison
  const basePortfolioAtCrash = firstRetiredCrashRow?.baseWithdrawal ?? 0
  const dtPortfolioAtCrash   = firstRetiredCrashRow?.dtWithdrawal   ?? 0

  // Cumulative portfolio income lost = sum of (baseWithdrawal − dtWithdrawal) for every
  // retired year where the downturn portfolio underperforms the base scenario.
  const portfolioIncomeLost = dtData
    .filter(r => r.retired)
    .reduce((sum, r) => sum + Math.max(0, r.baseWithdrawal - r.dtWithdrawal), 0)

  // Worst annual portfolio income drop — largest single-year % reduction in
  // portfolio withdrawal (dtWithdrawal) relative to the no-crash base withdrawal.
  let peakDropPct = 0
  let peakDropAmt = 0
  for (const r of dtData) {
    if (r.retired && r.baseWithdrawal > 0) {
      const dropAmt = r.baseWithdrawal - r.dtWithdrawal
      const dropPct = dropAmt / r.baseWithdrawal * 100
      if (dropPct > peakDropPct) { peakDropPct = dropPct; peakDropAmt = dropAmt }
    }
  }

  // Years for dt portfolio withdrawal to recover back to base level
  const firstCrashAge = downturnEvents.length > 0
    ? downturnEvents.reduce((m, d) => Math.min(m, d.age), Infinity)
    : Infinity
  let yearsToRecover = -1  // -1 = never recovers within simulation
  if (firstCrashAge < Infinity) {
    for (const r of dtData) {
      if (r.age <= firstCrashAge) continue
      const recovered = r.retired
        ? r.dtWithdrawal >= r.baseWithdrawal
        : r.dtBal >= r.baseBal
      if (recovered) {
        yearsToRecover = r.age - firstCrashAge
        break
      }
    }
  }

  return (
    <div className="rt-panel">

      {/* Header */}
      <div className="rt-section-header">
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'var(--rt-navy)' }}>
          Market Downturn Scenarios
        </h2>
        <span style={{ fontSize:12, color:'var(--rt-muted)', background:'#fce8e8', padding:'5px 12px', borderRadius:20, border:'1px solid var(--rt-red)' }}>
          Sequence of Returns Risk
        </span>
      </div>

      <div className="rt-alert info">
        Add market crashes at different ages to show how sequence of return risk permanently damages a 100% market portfolio.
      </div>

      {/* Downturn events card */}
      <div className="rt-card">
        <div className="rt-section-header">
          <h3 style={{ margin: 0 }}>Downturn Events</h3>
          <button className="rt-add-btn" onClick={addDownturn}>+ Add Downturn</button>
        </div>

        {sorted.length === 0 ? (
          <p style={{ fontSize:13, color:'var(--rt-muted)', padding:'8px 0' }}>
            No downturns added yet. Click "+ Add Downturn" to simulate a crash.
          </p>
        ) : (
          sorted.map((d, i) => (
            <div key={d.id} className="rt-dt-box">
              <div className="rt-dt-header">
                <span style={{ fontSize:13, fontWeight:700, color:'var(--rt-red)' }}>
                  DOWNTURN {i + 1}{d.label ? ` — ${d.label}` : ''}
                </span>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <select
                    style={{ fontSize:12, padding:'4px 8px', border:'1px solid var(--rt-border)', borderRadius:6, background:'#fff', fontFamily:'DM Sans,sans-serif' }}
                    value=""
                    onChange={e => { if (e.target.value) loadDtPreset(e.target.value, d.id) }}
                  >
                    <option value="">Load preset…</option>
                    {presetKeys.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <button className="rt-remove-btn" onClick={() => removeDownturn(d.id)}>×</button>
                </div>
              </div>
              <div className="rt-dt-grid">
                <div className="rt-form-group">
                  <label>Age it Hits</label>
                  <input type="number" value={d.age} style={{ borderColor:'#f5c5c5' }}
                    onFocus={e => e.target.select()}
                    onChange={e => updateDownturn(d.id, { age: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="rt-form-group">
                  <label>Market Drop %</label>
                  <input type="number" value={d.drop} style={{ borderColor:'#f5c5c5' }}
                    onFocus={e => e.target.select()}
                    onChange={e => updateDownturn(d.id, { drop: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="rt-form-group">
                  <label>Recovery Years</label>
                  <input type="number" value={d.recYears} style={{ borderColor:'#f5c5c5' }}
                    onFocus={e => e.target.select()}
                    onChange={e => updateDownturn(d.id, { recYears: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="rt-form-group">
                  <label>Recovery Return %</label>
                  <input type="number" value={d.recRate} style={{ borderColor:'#f5c5c5' }}
                    onFocus={e => e.target.select()}
                    onChange={e => updateDownturn(d.id, { recRate: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="rt-form-group">
                  <label>Label (optional)</label>
                  <input type="text" value={d.label} placeholder="e.g. Early Retirement Crash"
                    onChange={e => updateDownturn(d.id, { label: e.target.value })} />
                </div>
              </div>
            </div>
          ))
        )}

        {/* Normal rate + Run button */}
        <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <div className="rt-form-group" style={{ minWidth:220 }}>
            <label>Normal Return in Non-Downturn Years (%)</label>
            <input type="number" step="0.5" value={dtNormalRate}
              onFocus={e => e.target.select()}
              onChange={e => setDtNormalRate(parseFloat(e.target.value) || 7.3)} />
          </div>
          <button className="rt-calc-btn" style={{ marginTop:20 }} onClick={onCalcDownturn}>
            Run Scenario
          </button>
        </div>
      </div>

      {/* Stats row — or empty hint */}
      {!projData.length ? (
        <div className="rt-card" style={{ textAlign:'center', padding:'32px 20px' }}>
          <p style={{ fontSize:14, color:'var(--rt-muted)' }}>
            Click <strong style={{ color:'var(--rt-navy)' }}>Calculate Projections</strong> on the{' '}
            <strong style={{ color:'var(--rt-navy)' }}>Client Profile</strong> tab first.
          </p>
        </div>
      ) : downturnEvents.length === 0 ? (
        <div className="rt-alert warning">
          No downturns added. Click "+ Add Downturn" or use a preset to show sequence risk.
        </div>
      ) : dtData.length > 0 ? (
        <>
          {/* ── Portfolio damage hero cards ──────────────────────────────── */}
          <div className="rt-card" style={{ border:'2px solid var(--rt-red)', background:'linear-gradient(135deg,#fff5f5 0%,#fff 70%)', marginBottom:'1rem' }}>
            {/* Section label + SS stability note */}
            <div style={{ fontSize:10, fontWeight:700, color:'var(--rt-red)', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:'.75rem', paddingBottom:'.625rem', borderBottom:'1px solid #f5c5c5', display:'flex', alignItems:'center', gap:6 }}>
              Portfolio Income Impact
              <span
                title="Portfolio income is the portion exposed to market downturns and sequence-of-returns risk. Social Security income is shown separately because it is not reduced by market losses in this scenario."
                style={{ cursor:'help', fontSize:13, color:'var(--rt-red)', opacity:.7, fontStyle:'normal', fontWeight:400 }}
              >ⓘ</span>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1rem' }}>

              {/* Card 1 — Total Portfolio Income Lost Over Retirement */}
              <div style={{ background:'#fff0f0', border:'1px solid #f5c5c5', borderRadius:12, padding:'1.125rem 1.25rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, color:'var(--rt-red)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>
                  Total Portfolio Income Lost Over Retirement
                  <span
                    title="Total portfolio income lost over retirement is the sum of all annual portfolio income shortfalls compared with the no-downturn scenario. It does not include Social Security, which remains stable."
                    style={{ cursor:'help', fontSize:12, opacity:.65 }}
                  >ⓘ</span>
                </div>
                <div style={{ fontSize:26, fontWeight:800, color:'var(--rt-red)', fontVariantNumeric:'tabular-nums', marginBottom:4 }}>
                  {portfolioIncomeLost > 0 ? `-${fmt(portfolioIncomeLost)}` : '$0'}
                </div>
                <div style={{ fontSize:11, color:'#b05050' }}>
                  {crashAge != null
                    ? `Sum of all annual portfolio shortfalls from age ${crashAge} onward`
                    : 'Sum of annual portfolio shortfalls vs. no-crash scenario'}
                </div>
              </div>

              {/* Card 2 — Worst Annual Portfolio Income Drop */}
              <div style={{ background:'#fff0f0', border:'1px solid #f5c5c5', borderRadius:12, padding:'1.125rem 1.25rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, color:'var(--rt-red)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>
                  Worst Annual Portfolio Income Drop
                  <span
                    title="Worst annual portfolio income drop shows the largest one-year reduction in portfolio withdrawal compared with the base (no-crash) scenario for that same year. Social Security is excluded."
                    style={{ cursor:'help', fontSize:12, opacity:.65 }}
                  >ⓘ</span>
                </div>
                <div style={{ fontSize:26, fontWeight:800, color:'var(--rt-red)', fontVariantNumeric:'tabular-nums', marginBottom:4 }}>
                  {peakDropPct > 0 ? `-${peakDropPct.toFixed(1)}%` : '0%'}
                </div>
                <div style={{ fontSize:11, color:'#b05050' }}>
                  {peakDropAmt > 0
                    ? `${fmt(peakDropAmt)}/yr less than no-crash scenario`
                    : 'No portfolio income reduction detected'}
                </div>
              </div>

              {/* Card 3 — Years Until Portfolio Income Recovers */}
              <div style={{ background: yearsToRecover < 0 ? '#fff0f0' : '#f0faf5', border:`1px solid ${yearsToRecover < 0 ? '#f5c5c5' : '#b8ddc8'}`, borderRadius:12, padding:'1.125rem 1.25rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, color: yearsToRecover < 0 ? 'var(--rt-red)' : 'var(--rt-green)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>
                  Years Until Portfolio Income Recovers
                  <span
                    title="The number of years from the first crash until the annual portfolio withdrawal returns to the same level it would have been without any downturn."
                    style={{ cursor:'help', fontSize:12, opacity:.65 }}
                  >ⓘ</span>
                </div>
                <div style={{ fontSize:26, fontWeight:800, color: yearsToRecover < 0 ? 'var(--rt-red)' : 'var(--rt-green)', fontVariantNumeric:'tabular-nums', marginBottom:4 }}>
                  {yearsToRecover < 0 ? 'Never' : `${yearsToRecover} yrs`}
                </div>
                <div style={{ fontSize:11, color: yearsToRecover < 0 ? '#b05050' : '#3a7a54' }}>
                  {yearsToRecover < 0
                    ? 'Portfolio withdrawal does not recover to base level in this simulation'
                    : `Portfolio withdrawal matches base scenario by age ${firstCrashAge + yearsToRecover}`}
                </div>
              </div>

            </div>

            {/* SS stability note */}
            <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(184,50,50,0.06)', borderRadius:8, fontSize:12, color:'var(--rt-navy)', lineHeight:1.6, borderLeft:'3px solid var(--rt-red)' }}>
              <strong>What these numbers show:</strong>{' '}
              Social Security income ({fmt(ssMonthlyDT)}/yr starting age {ssAge}) is <strong>not affected</strong> by market downturns and is shown separately in the table below.
              {' '}The cards above measure only the <strong>portfolio withdrawal component</strong> — the portion exposed to sequence-of-returns risk.
            </div>
          </div>

          {/* ── Supporting stats row ────────────────────────────────────── */}
          <div className="rt-stats-row">
            <div className="rt-stat-box navy">
              <div className="rt-stat-label">Income at Retirement (Base)</div>
              <div className="rt-stat-value">{fmt(baseAtRet)}</div>
              <div className="rt-stat-sub">Age {retAge} — portfolio + SS, no crashes</div>
            </div>
            {crashAge != null ? (
              <>
                <div className="rt-stat-box navy">
                  <div className="rt-stat-label">Income In Crash Year Without Downturn</div>
                  <div className="rt-stat-value">{fmt(baseIncAtCrash)}</div>
                  <div className="rt-stat-sub">Age {crashAge} projected — portfolio {fmt(basePortfolioAtCrash)} + SS {fmt(firstRetiredCrashRow?.ssInc ?? 0)}</div>
                </div>
                <div className="rt-stat-box red">
                  <div className="rt-stat-label">Income In Crash Year After Downturn</div>
                  <div className="rt-stat-value">{fmt(dtIncAtCrash)}</div>
                  <div className="rt-stat-sub">
                    Age {crashAge} — portfolio {fmt(dtPortfolioAtCrash)} + SS {fmt(firstRetiredCrashRow?.ssInc ?? 0)}
                    {baseIncAtCrash > 0 && ` · ${fmt(Math.max(0, baseIncAtCrash - dtIncAtCrash))} less/yr`}
                  </div>
                </div>
              </>
            ) : (
              <div className="rt-stat-box red">
                <div className="rt-stat-label">Total Market Drop Simulated</div>
                <div className="rt-stat-value">{totalDrop}%</div>
                <div className="rt-stat-sub">Across {downturnEvents.length} event(s)</div>
              </div>
            )}
            <div className="rt-stat-box navy">
              <div className="rt-stat-label">Portfolio Balance at 90 (No Crashes)</div>
              <div className="rt-stat-value">{fmt(baseBal90)}</div>
              <div className="rt-stat-sub">Base scenario</div>
            </div>
            <div className="rt-stat-box red">
              <div className="rt-stat-label">Portfolio Balance at 90 (With Crashes)</div>
              <div className="rt-stat-value">{fmt(dtBal90)}</div>
              <div className="rt-stat-sub">Erosion: {fmt(Math.max(0, baseBal90 - dtBal90))}</div>
            </div>
          </div>
        </>
      ) : null}

      {/* Chart */}
      {dtData.length > 0 && (
        <div className="rt-card">
          <h2>Multi-Downturn Impact Chart</h2>
          <div className="rt-chart-wrap tall">
            <canvas ref={canvasRef} />
          </div>
        </div>
      )}

      {/* Year-by-Year Table */}
      {dtData.length > 0 && (
        <div className="rt-card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
            <h2 style={{ margin:0 }}>Year-by-Year Downturn Table</h2>
            <span style={{ fontSize:11, color:'var(--rt-muted)', background:'#f5f5f5', padding:'4px 10px', borderRadius:20, border:'1px solid var(--rt-border)' }}>
              SS income stays flat · Portfolio withdrawal is what changes
            </span>
          </div>
          <div className="rt-tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Age</th>
                  <th>Balance (Downturns)</th>
                  <th>Balance (Base)</th>
                  <th title="Annual portfolio withdrawal in the downturn scenario. Does not include Social Security.">
                    Portfolio Withdrawal
                  </th>
                  <th title="Social Security income is not reduced by market losses and remains stable throughout retirement.">
                    SS Income ⓘ
                  </th>
                  <th>Total Income</th>
                  <th
                    title="Annual portfolio income loss = base portfolio withdrawal minus downturn portfolio withdrawal for this year. Zero during non-crash, non-recovery years."
                    style={{ whiteSpace:'nowrap' }}
                  >
                    Annual Portfolio Loss ⓘ
                  </th>
                  <th
                    title="% vs Base = (downturn portfolio withdrawal − base portfolio withdrawal) ÷ base portfolio withdrawal × 100. Negative means the downturn scenario is paying out less than the no-crash scenario that year."
                    style={{ whiteSpace:'nowrap' }}
                  >
                    % vs Base ⓘ
                  </th>
                  <th>After-Tax Income</th>
                  <th>Event</th>
                </tr>
              </thead>
              <tbody>
                {dtData.map(r => {
                  const isCrash   = r.events.length > 0
                  const isRec     = r.evStr.length > 0
                  const balDiff   = r.dtBal - r.baseBal
                  const rowBg     = r.age === retAge ? undefined : isCrash ? '#fff0f0' : isRec ? '#f0fff6' : undefined
                  const evText    = isCrash
                    ? <span style={{ color:'var(--rt-red)', fontWeight:700 }}>{r.events.join(' + ')}</span>
                    : isRec ? r.evStr : '--'

                  // Annual portfolio income loss ($): base withdrawal − downturn withdrawal
                  const annualLoss = r.retired && r.baseWithdrawal > 0
                    ? Math.max(0, r.baseWithdrawal - r.dtWithdrawal)
                    : null

                  // % vs Base: how much portfolio withdrawal has changed vs no-crash scenario
                  const pctChange = r.retired && r.baseWithdrawal > 0
                    ? (r.dtWithdrawal - r.baseWithdrawal) / r.baseWithdrawal * 100
                    : null
                  const pctColor  = pctChange === null ? undefined : pctChange < -0.5 ? 'var(--rt-red)' : pctChange > 0.5 ? 'var(--rt-green)' : 'var(--rt-muted)'

                  return (
                    <tr
                      key={r.age}
                      className={r.age === retAge ? 'rt-highlight-row' : ''}
                      style={rowBg ? { background: rowBg } : undefined}
                    >
                      <td>
                        {r.age}
                        {r.age === retAge && <>&nbsp;<span className="rt-badge rt-badge-gold">Ret.</span></>}
                        {r.age === ssAge && ssMonthlyDT > 0 && <>&nbsp;<span className="rt-badge rt-badge-green">SS</span></>}
                      </td>
                      <td>
                        <strong>{fmt(r.dtBal)}</strong>
                        {balDiff < 0 && (
                          <span style={{ color:'var(--rt-red)', fontSize:11 }}> ({fmt(balDiff)})</span>
                        )}
                      </td>
                      <td style={{ color:'var(--rt-muted)' }}>{fmt(r.baseBal)}</td>
                      <td>
                        {r.retired
                          ? <span style={{ color: pctChange !== null && pctChange < -0.5 ? 'var(--rt-red)' : undefined }}>
                              {fmt(r.dtWithdrawal)}
                            </span>
                          : <span style={{ color:'var(--rt-muted)', fontSize:11 }}>Accumulating</span>}
                      </td>
                      <td>
                        {r.retired
                          ? r.ssInc > 0
                            ? <span style={{ color:'var(--rt-green)', fontWeight:600 }}>{fmt(r.ssInc)}</span>
                            : <span style={{ color:'var(--rt-muted)', fontSize:11 }}>$0</span>
                          : '--'}
                      </td>
                      <td>
                        <strong>
                          {r.retired
                            ? fmt(r.dtInc)
                            : <span style={{ color:'var(--rt-muted)', fontSize:11 }}>—</span>}
                        </strong>
                      </td>
                      {/* Annual Portfolio Loss column */}
                      <td>
                        {annualLoss !== null
                          ? annualLoss > 0
                            ? <span style={{ color:'var(--rt-red)', fontWeight:700 }}>-{fmt(annualLoss)}</span>
                            : <span style={{ color:'var(--rt-muted)', fontSize:11 }}>—</span>
                          : <span style={{ color:'var(--rt-muted)', fontSize:11 }}>—</span>}
                      </td>
                      {/* % vs Base column */}
                      <td>
                        {pctChange !== null
                          ? <span style={{ color: pctColor, fontWeight: Math.abs(pctChange) > 1 ? 700 : 400, fontSize:12 }}>
                              {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
                            </span>
                          : <span style={{ color:'var(--rt-muted)', fontSize:11 }}>—</span>}
                      </td>
                      <td>{r.retired ? fmt(r.dtAT ?? 0) : '--'}</td>
                      <td>{evText}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Solution / Rescue Panel ──────────────────────────────────────────────────
interface SolutionPanelProps {
  projData: ProjRow[]; age: number; retAge: number; filing: FilingStatus
  salary: number; otherIncome: number
  ss: number; ssAge: number
  qualAccounts: QualAccount[]; nqAccounts: NQAccount[]
  solPool: string;           setSolPool:           (v: string)  => void
  solScenario: string;       setSolScenario:       (v: string)  => void
  solCustomPct: number;      setSolCustomPct:      (v: number)  => void
  solRescueRet: number;      setSolRescueRet:      (v: number)  => void
  solMktRet: number;         setSolMktRet:         (v: number)  => void
  solSwrSQ: number;          setSolSwrSQ:          (v: number)  => void
  solSwrFIA: number;         setSolSwrFIA:         (v: number)  => void
  solSwrRoth: number;        setSolSwrRoth:        (v: number)  => void
  solDownturnEvents: DownturnEvent[]
  addSolDownturn:    () => void
  removeSolDownturn: (id: number) => void
  updateSolDownturn: (id: number, patch: Partial<DownturnEvent>) => void
  loadSolPreset:     (name: string) => void
  solData: SolRow[]; onCalcSolution: () => void
}

function SolutionPanel({
  projData, age, retAge, filing, salary, otherIncome, ss, ssAge, qualAccounts, nqAccounts,
  solPool, setSolPool, solScenario, setSolScenario,
  solCustomPct, setSolCustomPct, solRescueRet, setSolRescueRet,
  solMktRet, setSolMktRet, solSwrSQ, setSolSwrSQ, solSwrFIA, setSolSwrFIA,
  solSwrRoth, setSolSwrRoth,
  solDownturnEvents, addSolDownturn, removeSolDownturn, updateSolDownturn, loadSolPreset,
  solData,
}: SolutionPanelProps) {

  const balCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const balChartRef  = useRef<InstanceType<typeof Chart> | null>(null)
  const incCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const incChartRef  = useRef<InstanceType<typeof Chart> | null>(null)

  // Balance chart — 4 lines
  useEffect(() => {
    if (!balCanvasRef.current || !solData.length) return
    if (balChartRef.current) { balChartRef.current.destroy(); balChartRef.current = null }
    const labels   = solData.map(r => r.age)
    const totBals  = solData.map(r => r.total   / 1e6)
    const rothBals = solData.map(r => r.rothBal  / 1e6)
    const sqBals   = solData.map(r => r.sqBal    / 1e6)
    const fiaBals  = solData.map(r => r.fiaBal   / 1e6)
    balChartRef.current = new Chart(balCanvasRef.current!, {
      type: 'line',
      data: { labels, datasets: [
        { label:'Total Balance',     data:totBals,  borderColor:'#c9a84c', fill:false, tension:0.4, pointRadius:0, borderWidth:3 },
        { label:'Roth/NQ (Tax-Free)',data:rothBals, borderColor:'#2e7d52', fill:false, tension:0.4, pointRadius:0, borderWidth:2 },
        { label:'SQ Market',         data:sqBals,   borderColor:'#0d1b2a', fill:false, tension:0.4, pointRadius:0, borderWidth:1.5 },
        { label:'FIA (Protected)',   data:fiaBals,  borderColor:'#c9a84c', fill:false, tension:0.4, pointRadius:0, borderWidth:1.5 },
      ] as any },
      options: { responsive:true, maintainAspectRatio:false,
        scales:{ y:{ ticks:{ callback:(v:any) => `$${Number(v).toFixed(1)}M` } } },
        plugins:{ legend:{ position:'top' } } },
    } as any)
    return () => { balChartRef.current?.destroy(); balChartRef.current = null }
  }, [solData])

  // Income chart — 3 stacked bars + 1 line
  useEffect(() => {
    if (!incCanvasRef.current || !solData.length) return
    if (incChartRef.current) { incChartRef.current.destroy(); incChartRef.current = null }
    const retRows  = solData.filter(r => r.retired)
    const labInc   = retRows.map(r => r.age)
    const rothIncs = retRows.map(r => r.rothInc)
    const sqIncs   = retRows.map(r => r.sqInc)
    const fiaIncs  = retRows.map(r => r.fiaInc)
    const atIncs   = retRows.map(r => r.afterTax)
    incChartRef.current = new Chart(incCanvasRef.current!, {
      type: 'bar',
      data: { labels: labInc, datasets: [
        { label:'Roth Income (Tax-Free)', data:rothIncs, backgroundColor:'rgba(46,125,82,0.8)',   borderRadius:2 },
        { label:'SQ Income (Taxable)',    data:sqIncs,   backgroundColor:'rgba(13,27,42,0.75)',   borderRadius:2 },
        { label:'FIA Income (Taxable)',   data:fiaIncs,  backgroundColor:'rgba(201,168,76,0.8)',  borderRadius:2 },
        { label:'After-Tax Total', data:atIncs, type:'line' as any, borderColor:'#b83232',
          fill:false, tension:0.3, pointRadius:0, borderWidth:2, yAxisID:'y' },
      ] as any },
      options: { responsive:true, maintainAspectRatio:false,
        interaction:{ mode:'index', intersect:false },
        scales:{
          y:{ stacked:true, ticks:{ callback:(v:any) => `$${(Number(v)/1000).toFixed(0)}k` } },
          x:{ stacked:true },
        },
        plugins:{ legend:{ position:'top' },
          tooltip:{ callbacks:{ label:(ctx:any) => `${ctx.dataset.label}: ${fmt(ctx.raw)}` } } },
      },
    } as any)
    return () => { incChartRef.current?.destroy(); incChartRef.current = null }
  }, [solData])

  // ── Derived values for rule-110 display (computed live from props) ─────────
  const totalSalary  = salary + otherIncome
  const stdDed       = STD_DED[filing] ?? 16100
  const yearsToRet   = retAge - age
  const isAccum      = yearsToRet >= 10
  const ruleOf110    = Math.min((110 - age) / 100, 1)

  let fiaPct: number
  if      (solScenario === 'Full Rescue') fiaPct = 1.0
  else if (solScenario === 'Partial 50')  fiaPct = 0.5
  else if (solScenario === 'Custom')      fiaPct = Math.min(1, Math.max(0, solCustomPct))
  else                                    fiaPct = ruleOf110
  const mktPct = 1 - fiaPct

  let qBal = 0, nqBal = 0
  for (const a of qualAccounts) qBal += a.balance || 0
  for (const a of nqAccounts)   nqBal += a.balance || 0
  const totalAssets = qBal + nqBal

  let rothStart: number, sqStart: number, fiaStart: number
  if (solPool === 'Q') {
    fiaStart = qBal * fiaPct; sqStart = qBal * mktPct; rothStart = nqBal
  } else if (solPool === 'NQ') {
    fiaStart = nqBal * fiaPct; rothStart = nqBal * mktPct; sqStart = qBal
  } else {
    const totalFIA = totalAssets * fiaPct
    fiaStart  = Math.min(qBal, totalFIA)
    sqStart   = qBal  - fiaStart
    rothStart = nqBal - Math.max(0, totalFIA - fiaStart)
  }
  const curBrk = getBracket(Math.max(0, totalSalary - stdDed), filing)
  const poolLabel = solPool === 'Q'
    ? 'Qualified Only (TSP/401k/IRA)'
    : solPool === 'NQ' ? 'Non-Qualified Only (Roth/NQ)' : 'NQ + Q (Both Pools)'

  // ── Stats derived from solData ────────────────────────────────────────────
  const retRow    = solData.find(r => r.age === retAge) ?? solData[0] ?? null
  const row90     = solData.find(r => r.age === 90)
  const total90   = row90?.total ?? 0
  const hasCrash  = solDownturnEvents.length > 0
  let worstInc = retRow?.totalInc ?? 0, worstAge2 = retAge
  for (const r of solData) {
    if (r.retired && r.events.length > 0 && r.totalInc < worstInc) {
      worstInc = r.totalInc; worstAge2 = r.age
    }
  }
  const crashRow = solData.find(r => r.age === worstAge2)

  // Recovery age set (for table row colouring)
  const solRecAges = new Set<number>()
  for (const d of solDownturnEvents) {
    for (let y = 1; y <= d.recYears; y++) solRecAges.add(d.age + y)
  }

  // ── Protection Impact derivations ─────────────────────────────────────────
  // Use the parallel no-floor simulation (fiaIncNF) for true cumulative protection.
  // fiaIncNF tracks what FIA income would have been with NO 0% floor — following
  // the market through every crash — compounding from crash 1 through crash N.
  interface CrashImpactItem {
    age: number; label: string; mktRet: number
    incomeWithFIA: number; incomeWithoutFIA: number; incomeProtected: number
  }
  const crashImpacts: CrashImpactItem[] = []
  for (const r of solData) {
    if (!r.retired || r.events.length === 0) continue
    crashImpacts.push({
      age: r.age,
      label: r.events.join(' + '),
      mktRet: r.mktRet,
      incomeWithFIA: r.totalInc,
      incomeWithoutFIA: r.totalInc - r.fiaInc + r.fiaIncNF,
      incomeProtected: Math.max(0, r.fiaInc - r.fiaIncNF),
    })
  }
  // Worst-crash-year reference (lowest total income) for the headline comparison
  const worstCrashItem = crashImpacts.reduce<CrashImpactItem | null>(
    (prev, c) => !prev || c.incomeWithFIA < prev.incomeWithFIA ? c : prev, null
  )
  const incomeWithFIA    = worstCrashItem?.incomeWithFIA    ?? 0
  const incomeWithoutFIA = worstCrashItem?.incomeWithoutFIA ?? 0
  // True cumulative protection: sum FIA income gain (vs no-floor) across ALL retirement years
  // This captures the compounding benefit — FIA surviving crash 1 compounds into higher income later
  const totalProtection = solData
    .filter(r => r.retired)
    .reduce((sum, r) => sum + Math.max(0, r.fiaInc - r.fiaIncNF), 0)
  const incomeProtected = totalProtection
  const lifetimeDiff    = totalProtection

  return (
    <div className="rt-panel">

      {/* Header */}
      <div className="rt-section-header">
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'var(--rt-navy)' }}>
          Solution / Rescue — FIA Strategy
        </h2>
        <span style={{ fontSize:12, color:'var(--rt-muted)', background:'#e6f4ed', padding:'5px 12px', borderRadius:20, border:'1px solid var(--rt-green)' }}>
          0% Floor, Protected Growth
        </span>
      </div>

      <div className="rt-alert info">
        Three separate buckets: <strong>Roth/NQ</strong> (tax-free),{' '}
        <strong>SQ Market</strong> (taxable), <strong>FIA</strong> (taxable, 0% floor).
        Use the dropdown to choose which accounts the Rule of 110 applies to.
      </div>

      {/* Config card */}
      <div className="rt-card">
        <h2>FIA / Rescue Configuration</h2>
        <div className="rt-form-grid">
          <div className="rt-form-group">
            <label>Apply Rule of 110 To</label>
            <select value={solPool} onChange={e => setSolPool(e.target.value)}>
              <option value="Q">Qualified Only (TSP / 401k / IRA)</option>
              <option value="NQ">Non-Qualified Only (Roth / NQ)</option>
              <option value="BOTH">NQ + Q (Both Pools)</option>
            </select>
          </div>
          <div className="rt-form-group">
            <label>Rescue Scenario</label>
            <select value={solScenario} onChange={e => setSolScenario(e.target.value)}>
              <option value="Full Rescue">Full Rescue (100% into FIA)</option>
              <option value="Max Partial">Partial (Rule of 110)</option>
              <option value="Partial 50">Partial 50%</option>
              <option value="Custom">Custom %</option>
            </select>
          </div>
          <div className="rt-form-group">
            <label>Custom FIA % <span style={{ fontSize:10, color:'var(--rt-muted)' }}>(if Custom, 0–100)</span></label>
            <input type="number" step="1" min="0" max="100"
              value={Math.round(solCustomPct * 100)}
              onFocus={e => e.target.select()}
              onChange={e => setSolCustomPct((parseFloat(e.target.value) || 0) / 100)} />
          </div>
          <div className="rt-form-group">
            <label>FIA Credited Rate <span style={{ fontSize:10, color:'var(--rt-muted)' }}>(e.g. 6)</span></label>
            <input type="number" step="0.5" min="0" max="20"
              value={+(solRescueRet * 100).toFixed(1)}
              onFocus={e => e.target.select()}
              onChange={e => setSolRescueRet((parseFloat(e.target.value) || 0) / 100)} />
          </div>
          <div className="rt-form-group">
            <label>Market Return %</label>
            <input type="number" step="0.5" min="0" max="20"
              value={+(solMktRet * 100).toFixed(1)}
              onFocus={e => e.target.select()}
              onChange={e => setSolMktRet((parseFloat(e.target.value) || 0) / 100)} />
          </div>
          <div className="rt-form-group">
            <label>SQ Withdrawal Rate %</label>
            <input type="number" step="0.5" min="0" max="20"
              value={+(solSwrSQ * 100).toFixed(1)}
              onFocus={e => e.target.select()}
              onChange={e => setSolSwrSQ((parseFloat(e.target.value) || 0) / 100)} />
          </div>
          <div className="rt-form-group">
            <label>FIA Withdrawal Rate %</label>
            <input type="number" step="0.5" min="0" max="20"
              value={+(solSwrFIA * 100).toFixed(1)}
              onFocus={e => e.target.select()}
              onChange={e => setSolSwrFIA((parseFloat(e.target.value) || 0) / 100)} />
          </div>
          <div className="rt-form-group">
            <label>Roth Withdrawal Rate %</label>
            <input type="number" step="0.5" min="0" max="20"
              value={+(solSwrRoth * 100).toFixed(1)}
              onFocus={e => e.target.select()}
              onChange={e => setSolSwrRoth((parseFloat(e.target.value) || 0) / 100)} />
          </div>
        </div>

        {/* Rule-110 live display */}
        <div style={{ marginTop: 16 }}>
          <div className={`rt-alert ${isAccum ? 'info' : 'warning'}`} style={{ marginBottom: 14 }}>
            <strong>{isAccum ? 'Accumulation FIA' : 'Rescue / Income Rider'} Mode</strong>
            {' '}— {yearsToRet} years to retirement.{' '}
            Rule of 110 applied to: <strong>{poolLabel}</strong>.
          </div>
          <div className="rt-stats-row" style={{ margin: 0 }}>
            <div className="rt-stat-box green">
              <div className="rt-stat-label">Roth / NQ Bucket</div>
              <div className="rt-stat-value">{fmt(rothStart)}</div>
              <div className="rt-stat-sub">Tax-FREE withdrawals</div>
            </div>
            <div className="rt-stat-box navy">
              <div className="rt-stat-label">SQ Market Bucket</div>
              <div className="rt-stat-value">{fmt(sqStart)}</div>
              <div className="rt-stat-sub">Taxable — grows at {fmtPct(solMktRet)}</div>
            </div>
            <div className="rt-stat-box gold">
              <div className="rt-stat-label">FIA Bucket ({fmtPct(fiaPct)} of {poolLabel.split(' ')[0]})</div>
              <div className="rt-stat-value">{fmt(fiaStart)}</div>
              <div className="rt-stat-sub">Taxable — {fmtPct(solRescueRet)}/yr, 0% floor</div>
            </div>
            <div className="rt-stat-box navy">
              <div className="rt-stat-label">Current Tax Bracket</div>
              <div className="rt-stat-value">{fmtPct(curBrk)}</div>
              <div className="rt-stat-sub">On {fmt(totalSalary)} salary</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sol-specific downturn events */}
      <div className="rt-card">
        <div className="rt-section-header">
          <h3 style={{ margin: 0 }}>Market Downturns for This Scenario</h3>
          <button className="rt-add-btn" onClick={addSolDownturn}>+ Add Downturn</button>
        </div>
        {solDownturnEvents.length === 0 ? (
          <p style={{ fontSize:13, color:'var(--rt-muted)', padding:'8px 0' }}>
            No downturns added. Use the quick-add buttons below.
          </p>
        ) : (
          [...solDownturnEvents].sort((a, b) => a.age - b.age).map((d, i) => (
            <div key={d.id} className="rt-dt-box">
              <div className="rt-dt-header">
                <span style={{ fontSize:13, fontWeight:700, color:'var(--rt-red)' }}>
                  CRASH {i + 1}{d.label ? ` — ${d.label}` : ''}
                </span>
                <button className="rt-remove-btn" onClick={() => removeSolDownturn(d.id)}>×</button>
              </div>
              <div className="rt-dt-grid">
                <div className="rt-form-group">
                  <label>Age it Hits</label>
                  <input type="number" value={d.age} style={{ borderColor:'#f5c5c5' }}
                    onFocus={e => e.target.select()}
                    onChange={e => updateSolDownturn(d.id, { age: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="rt-form-group">
                  <label>Market Drop %</label>
                  <input type="number" value={d.drop} style={{ borderColor:'#f5c5c5' }}
                    onFocus={e => e.target.select()}
                    onChange={e => updateSolDownturn(d.id, { drop: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="rt-form-group">
                  <label>Recovery Years</label>
                  <input type="number" value={d.recYears} style={{ borderColor:'#f5c5c5' }}
                    onFocus={e => e.target.select()}
                    onChange={e => updateSolDownturn(d.id, { recYears: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="rt-form-group">
                  <label>Recovery Rate %</label>
                  <input type="number" value={d.recRate} style={{ borderColor:'#f5c5c5' }}
                    onFocus={e => e.target.select()}
                    onChange={e => updateSolDownturn(d.id, { recRate: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="rt-form-group">
                  <label>Label</label>
                  <input type="text" value={d.label} placeholder="e.g. 2008 Crisis"
                    onChange={e => updateSolDownturn(d.id, { label: e.target.value })} />
                </div>
              </div>
            </div>
          ))
        )}
        {/* Quick-add preset buttons */}
        <div style={{ marginTop:10, display:'flex', gap:8, flexWrap:'wrap' }}>
          {[
            ['+ 2008 Crisis (-37%)',  '2008 Financial Crisis'],
            ['+ Dot-Com (-49%)',      '2000 Dot-Com Crash'],
            ['+ COVID (-34%)',        '2020 COVID Crash'],
            ['+ Severe Bear (-45%)', 'Severe Bear Market'],
          ].map(([label, preset]) => (
            <button key={preset} className="rt-preset-btn" onClick={() => loadSolPreset(preset)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Protection Impact hero card ───────────────────────────────────── */}
      {projData.length > 0 && retRow && hasCrash && crashImpacts.length > 0 && (
        <div className="rt-card" style={{
          border: '2px solid var(--rt-green)',
          background: 'linear-gradient(135deg,#f0faf5 0%,#fff 60%)',
          marginBottom: '1.5rem',
        }}>
          {/* Card header */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'1.25rem', paddingBottom:'.875rem', borderBottom:'1px solid #cde8d8' }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--rt-green)', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:4 }}>
                FIA Strategy — Core Value Proposition
              </div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:'var(--rt-navy)', marginBottom:4 }}>
                Protection Impact Analysis
              </div>
              <div style={{ fontSize:13, color:'var(--rt-muted)' }}>
                {crashImpacts.length === 1
                  ? `Crash at Age ${crashImpacts[0].age} — income with vs. without the FIA floor`
                  : `${crashImpacts.length} crash events — cumulative income protection across all events`}
              </div>
            </div>
            <span style={{ background:'var(--rt-green)', color:'#fff', padding:'6px 14px', borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap', marginTop:4 }}>
              0% FLOOR ACTIVE
            </span>
          </div>

          {/* 4 metric cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'1rem', marginBottom:'1.25rem' }}>
            {/* Without FIA — worst crash year reference */}
            <div style={{ background:'#fff0f0', border:'1px solid #f5c5c5', borderRadius:12, padding:'1.125rem 1.25rem' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--rt-red)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>
                Income Without FIA
              </div>
              <div style={{ fontSize:24, fontWeight:700, color:'var(--rt-red)', fontVariantNumeric:'tabular-nums', marginBottom:4 }}>
                {fmt(incomeWithoutFIA)}/yr
              </div>
              <div style={{ fontSize:11, color:'#b05050' }}>All-market — worst crash at Age {worstCrashItem?.age ?? worstAge2}</div>
            </div>

            {/* With FIA — worst crash year reference */}
            <div style={{ background:'#f0faf5', border:'2px solid var(--rt-green)', borderRadius:12, padding:'1.125rem 1.25rem' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--rt-green)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>
                Income With FIA
              </div>
              <div style={{ fontSize:24, fontWeight:700, color:'var(--rt-green)', fontVariantNumeric:'tabular-nums', marginBottom:4 }}>
                {fmt(incomeWithFIA)}/yr
              </div>
              <div style={{ fontSize:11, color:'#3a7a54' }}>0% floor preserved this income at worst crash</div>
            </div>

            {/* Total Income Protected — cumulative all crashes */}
            <div style={{ background:'#f0faf5', border:'2px solid var(--rt-green)', borderRadius:12, padding:'1.125rem 1.25rem', position:'relative', overflow:'hidden' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--rt-green)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>
                Total Income Protected
              </div>
              <div style={{ fontSize:28, fontWeight:800, color:'var(--rt-green)', fontVariantNumeric:'tabular-nums', marginBottom:4 }}>
                +{fmt(incomeProtected)}
              </div>
              <div style={{ fontSize:11, color:'#3a7a54' }}>Cumulative across entire retirement — all years, all crashes</div>
              <div style={{ position:'absolute', top:8, right:12, fontSize:22, opacity:.15 }}>🛡</div>
            </div>

            {/* Total Lifetime Difference */}
            <div style={{ background:'var(--rt-navy)', border:'2px solid var(--rt-navy)', borderRadius:12, padding:'1.125rem 1.25rem', position:'relative', overflow:'hidden' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--rt-gold)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>
                Total Lifetime Difference
              </div>
              <div style={{ fontSize:28, fontWeight:800, color:'var(--rt-gold)', fontVariantNumeric:'tabular-nums', marginBottom:4 }}>
                +{fmt(lifetimeDiff)}
              </div>
              <div style={{ fontSize:11, color:'#7090a8' }}>All extra income the FIA floor produced vs. unprotected — incl. compounding</div>
              <div style={{ position:'absolute', top:8, right:12, fontSize:22, opacity:.15 }}>📈</div>
            </div>
          </div>

          {/* Per-crash breakdown — shown when more than one crash event */}
          {crashImpacts.length > 0 && (
            <div style={{ marginBottom:'1.25rem' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--rt-navy)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
                Breakdown by Crash Event
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'#edf7f2' }}>
                      <th style={{ padding:'7px 10px', textAlign:'left', fontWeight:700, color:'var(--rt-navy)', borderBottom:'2px solid #cde8d8' }}>Age</th>
                      <th style={{ padding:'7px 10px', textAlign:'left', fontWeight:700, color:'var(--rt-navy)', borderBottom:'2px solid #cde8d8' }}>Event</th>
                      <th style={{ padding:'7px 10px', textAlign:'right', fontWeight:700, color:'var(--rt-red)', borderBottom:'2px solid #cde8d8' }}>Market Drop</th>
                      <th style={{ padding:'7px 10px', textAlign:'right', fontWeight:700, color:'var(--rt-red)', borderBottom:'2px solid #cde8d8' }}>Income w/o FIA</th>
                      <th style={{ padding:'7px 10px', textAlign:'right', fontWeight:700, color:'var(--rt-green)', borderBottom:'2px solid #cde8d8' }}>Income w/ FIA</th>
                      <th style={{ padding:'7px 10px', textAlign:'right', fontWeight:700, color:'var(--rt-green)', borderBottom:'2px solid #cde8d8' }}>Protected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crashImpacts.map((c, i) => (
                      <tr key={c.age} style={{ background: i % 2 === 0 ? '#fff' : '#f7fdf9', borderBottom:'1px solid #e0f0e8' }}>
                        <td style={{ padding:'7px 10px', fontWeight:700, color:'var(--rt-navy)' }}>{c.age}</td>
                        <td style={{ padding:'7px 10px', color:'var(--rt-red)', fontWeight:600 }}>{c.label}</td>
                        <td style={{ padding:'7px 10px', textAlign:'right', color:'var(--rt-red)', fontWeight:700 }}>
                          {(Math.abs(c.mktRet) * 100).toFixed(1)}%
                        </td>
                        <td style={{ padding:'7px 10px', textAlign:'right', color:'var(--rt-red)' }}>{fmt(c.incomeWithoutFIA)}/yr</td>
                        <td style={{ padding:'7px 10px', textAlign:'right', color:'var(--rt-green)', fontWeight:600 }}>{fmt(c.incomeWithFIA)}/yr</td>
                        <td style={{ padding:'7px 10px', textAlign:'right', color:'var(--rt-green)', fontWeight:800 }}>+{fmt(c.incomeProtected)}</td>
                      </tr>
                    ))}
                    {crashImpacts.length > 1 && (
                      <tr style={{ background:'#edf7f2', borderTop:'2px solid #cde8d8' }}>
                        <td colSpan={5} style={{ padding:'7px 10px', fontWeight:700, color:'var(--rt-navy)', textAlign:'right' }}>Crash-year subtotal</td>
                        <td style={{ padding:'7px 10px', textAlign:'right', color:'var(--rt-green)', fontWeight:800, fontSize:14 }}>
                          +{fmt(crashImpacts.reduce((s, c) => s + c.incomeProtected, 0))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Plain-language summary */}
          <div style={{ padding:'12px 16px', background:'rgba(46,125,82,0.07)', borderRadius:8, fontSize:13, color:'var(--rt-navy)', lineHeight:1.65, borderLeft:'3px solid var(--rt-green)' }}>
            <strong>How to read this:</strong>{' '}
            {crashImpacts.length === 1 ? (
              <>At Age {crashImpacts[0].age} — the simulated crash year — an unprotected all-market FIA would have produced only{' '}
              <span style={{ color:'var(--rt-red)', fontWeight:700 }}>{fmt(incomeWithoutFIA)}/yr</span>.
              With the 0% floor in place the client still received{' '}
              <span style={{ color:'var(--rt-green)', fontWeight:700 }}>{fmt(incomeWithFIA)}/yr</span> — protecting{' '}
              <span style={{ color:'var(--rt-green)', fontWeight:700 }}>+{fmt(incomeProtected)}</span> in extra income across the full retirement.</>
            ) : (
              <>Across {crashImpacts.length} simulated crash events, the FIA 0% floor prevented income from dropping to market levels.
              In the worst year (Age {worstCrashItem?.age ?? worstAge2}), an unprotected FIA would have paid only{' '}
              <span style={{ color:'var(--rt-red)', fontWeight:700 }}>{fmt(incomeWithoutFIA)}/yr</span> vs.{' '}
              <span style={{ color:'var(--rt-green)', fontWeight:700 }}>{fmt(incomeWithFIA)}/yr</span> with the floor.
              Because each protected crash compounds into higher future balances, the true lifetime benefit is{' '}
              <span style={{ color:'var(--rt-green)', fontWeight:700 }}>+{fmt(totalProtection)}</span> in extra income — more than the crash-year totals alone.</>
            )}
          </div>
        </div>
      )}

      {/* Prompt to add crashes if none configured */}
      {projData.length > 0 && retRow && !hasCrash && (
        <div className="rt-alert info" style={{ borderLeft:'3px solid var(--rt-gold)', marginBottom:'1rem' }}>
          <strong>Add a crash scenario above</strong> to see the Protection Impact analysis — this shows clients exactly how much income the FIA strategy preserves vs. an unprotected all-market portfolio.
        </div>
      )}

      {/* ── Stats section ─────────────────────────────────────────────────── */}
      {!projData.length ? (
        <div className="rt-card" style={{ textAlign:'center', padding:'32px 20px' }}>
          <p style={{ fontSize:14, color:'var(--rt-muted)' }}>
            Click <strong style={{ color:'var(--rt-navy)' }}>Calculate Projections</strong> on the{' '}
            <strong style={{ color:'var(--rt-navy)' }}>Client Profile</strong> tab first.
          </p>
        </div>
      ) : retRow && (
        <div id="sol-stats">
          {/* Row 1: Retirement balances */}
          <div style={{ marginBottom:8, fontSize:13, fontWeight:700, color:'var(--rt-navy)' }}>
            At Retirement (Age {retAge}):
          </div>
          <div className="rt-stats-row">
            <div className="rt-stat-box navy">
              <div className="rt-stat-label">Total Portfolio</div>
              <div className="rt-stat-value">{fmt(retRow.total)}</div>
              <div className="rt-stat-sub">All 3 buckets combined</div>
            </div>
            <div className="rt-stat-box green">
              <div className="rt-stat-label">Roth/NQ Bucket</div>
              <div className="rt-stat-value">{fmt(retRow.rothBal)}</div>
              <div className="rt-stat-sub">Tax-free withdrawals</div>
            </div>
            <div className="rt-stat-box navy">
              <div className="rt-stat-label">SQ Market Bucket</div>
              <div className="rt-stat-value">{fmt(retRow.sqBal)}</div>
              <div className="rt-stat-sub">Taxable</div>
            </div>
            <div className="rt-stat-box gold">
              <div className="rt-stat-label">FIA Bucket</div>
              <div className="rt-stat-value">{fmt(retRow.fiaBal)}</div>
              <div className="rt-stat-sub">Taxable, 0% floor</div>
            </div>
          </div>

          {/* Row 2: Income breakdown */}
          <div style={{ marginBottom:8, fontSize:13, fontWeight:700, color:'var(--rt-navy)' }}>
            Income Breakdown (Normal Year):
          </div>
          <div className="rt-stats-row">
            <div className="rt-stat-box green">
              <div className="rt-stat-label">Roth Income (Tax-Free)</div>
              <div className="rt-stat-value">{fmt(retRow.rothInc)}/yr</div>
              <div className="rt-stat-sub">0% tax — keeps every dollar</div>
            </div>
            <div className="rt-stat-box navy">
              <div className="rt-stat-label">SQ Income (Taxable)</div>
              <div className="rt-stat-value">{fmt(retRow.sqInc)}/yr</div>
              <div className="rt-stat-sub">Ordinary income tax applies</div>
            </div>
            <div className="rt-stat-box gold">
              <div className="rt-stat-label">FIA Income (Taxable)</div>
              <div className="rt-stat-value">{fmt(retRow.fiaInc)}/yr</div>
              <div className="rt-stat-sub">Ordinary income tax applies</div>
            </div>
            {ss > 0 && (
              <div className="rt-stat-box gold">
                <div className="rt-stat-label">SS Income</div>
                <div className="rt-stat-value">{fmt(retRow.ssInc)}/yr</div>
                <div className="rt-stat-sub">Starting age {ssAge}</div>
              </div>
            )}
            <div className="rt-stat-box green">
              <div className="rt-stat-label">Total Gross Income</div>
              <div className="rt-stat-value">{fmt(retRow.totalInc)}/yr</div>
              <div className="rt-stat-sub">{ss > 0 ? 'Buckets + SS combined' : 'All 3 streams combined'}</div>
            </div>
            <div className="rt-stat-box green">
              <div className="rt-stat-label">Total After-Tax Income</div>
              <div className="rt-stat-value">{fmt(retRow.afterTax)}/yr</div>
              <div className="rt-stat-sub">Roth tax-free + taxable net</div>
            </div>
            <div className={`rt-stat-box ${retRow.bracket < curBrk ? 'green' : 'red'}`}>
              <div className="rt-stat-label">Future Tax Bracket</div>
              <div className="rt-stat-value">{fmtPct(retRow.bracket)}</div>
              <div className="rt-stat-sub">
                On taxable income: {fmt(retRow.sqInc + retRow.fiaInc)}/yr | was {fmtPct(curBrk)}
              </div>
            </div>
          </div>

          {/* Row 3: Crash stats (only if crashes added) */}
          {hasCrash && crashRow && (
            <>
              <div style={{ marginBottom:8, marginTop:4, fontSize:13, fontWeight:700, color:'var(--rt-red)' }}>
                During Crash (Age {worstAge2}):
              </div>
              <div className="rt-stats-row">
                <div className="rt-stat-box red">
                  <div className="rt-stat-label">SQ Income in Crash</div>
                  <div className="rt-stat-value">{fmt(crashRow.sqInc)}/yr</div>
                  <div className="rt-stat-sub">Market dropped — less income</div>
                </div>
                <div className="rt-stat-box red">
                  <div className="rt-stat-label">Roth Income in Crash</div>
                  <div className="rt-stat-value">{fmt(crashRow.rothInc)}/yr</div>
                  <div className="rt-stat-sub">Also market-exposed</div>
                </div>
                <div className="rt-stat-box gold">
                  <div className="rt-stat-label">FIA Income in Crash</div>
                  <div className="rt-stat-value">{fmt(crashRow.fiaInc)}/yr</div>
                  <div className="rt-stat-sub">0% floor — no change</div>
                </div>
                <div className="rt-stat-box green">
                  <div className="rt-stat-label">Total After-Tax in Crash</div>
                  <div className="rt-stat-value">{fmt(crashRow.afterTax)}/yr</div>
                  <div className="rt-stat-sub">FIA bucket protected this</div>
                </div>
              </div>
            </>
          )}

          {/* Balance at 90 */}
          <div className="rt-stats-row">
            <div className="rt-stat-box navy">
              <div className="rt-stat-label">Total Balance at Age 90</div>
              <div className="rt-stat-value">{fmt(total90)}</div>
              <div className="rt-stat-sub">All 3 buckets</div>
            </div>
          </div>
        </div>
      )}

      {/* Balance chart */}
      {solData.length > 0 && (
        <div className="rt-card">
          <h2>Three-Bucket Balance Over Time</h2>
          <div className="rt-chart-wrap">
            <canvas ref={balCanvasRef} />
          </div>
        </div>
      )}

      {/* Income chart */}
      {solData.length > 0 && (
        <div className="rt-card">
          <h2>Annual Income by Bucket</h2>
          <div className="rt-chart-wrap">
            <canvas ref={incCanvasRef} />
          </div>
        </div>
      )}

      {/* Year-by-Year Table */}
      {solData.length > 0 && (
        <div className="rt-card">
          <h2>Year-by-Year Detail</h2>
          <div className="rt-tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Age</th><th>Year</th><th>Event</th>
                  <th style={{ color:'#2e7d52' }}>Roth/NQ Bal</th>
                  <th>SQ Market Bal</th>
                  <th style={{ color:'#c9a84c' }}>FIA Bal</th>
                  <th>Total Balance</th>
                  <th style={{ color:'#2e7d52' }}>Roth Income (Tax-Free)</th>
                  <th>SQ Income (Taxable)</th>
                  <th style={{ color:'#c9a84c' }}>FIA Income (Taxable)</th>
                  <th style={{ color:'var(--rt-gold)' }}>SS Income</th>
                  <th>Total Income</th>
                  <th>After-Tax Income</th>
                  <th>Tax Bracket</th>
                </tr>
              </thead>
              <tbody>
                {solData.map(r => {
                  const isCrash = r.events.length > 0
                  const isRec   = solRecAges.has(r.age) && r.retired && !isCrash
                  const rowBg   = r.age === retAge ? undefined : isCrash ? '#fff0f0' : isRec ? '#f0fff6' : undefined
                  const evText  = isCrash
                    ? <span style={{ color:'var(--rt-red)', fontWeight:700 }}>{r.events.join(' + ')}</span>
                    : isRec ? 'Recovery' : '--'
                  const accStr  = <span style={{ color:'var(--rt-muted)', fontSize:11 }}>Accumulating</span>
                  const bc = r.bracket >= 0.32 ? 'rt-badge-red' : r.bracket >= 0.22 ? 'rt-badge-gold' : 'rt-badge-green'
                  return (
                    <tr key={r.age}
                      className={r.age === retAge ? 'rt-highlight-row' : ''}
                      style={rowBg ? { background: rowBg } : undefined}
                    >
                      <td>
                        {r.age}
                        {r.age === retAge && <>&nbsp;<span className="rt-badge rt-badge-gold">Ret.</span></>}
                      </td>
                      <td>{r.year}</td>
                      <td>{evText}</td>
                      <td style={{ color:'var(--rt-green)' }}><strong>{fmt(r.rothBal)}</strong></td>
                      <td>{fmt(r.sqBal)}</td>
                      <td style={{ color:'#a07a1e' }}>{fmt(r.fiaBal)}</td>
                      <td><strong>{fmt(r.total)}</strong></td>
                      <td style={{ color:'var(--rt-green)' }}>{r.retired ? fmt(r.rothInc) : accStr}</td>
                      <td>{r.retired ? fmt(r.sqInc) : accStr}</td>
                      <td style={{ color:'#a07a1e' }}>{r.retired ? fmt(r.fiaInc) : accStr}</td>
                      <td style={{ color:'var(--rt-gold)' }}>
                        {r.retired
                          ? r.ssInc > 0
                            ? <strong>{fmt(r.ssInc)}</strong>
                            : <span style={{ color:'var(--rt-muted)', fontSize:11 }}>$0</span>
                          : accStr}
                      </td>
                      <td><strong>{r.retired ? fmt(r.totalInc) : accStr}</strong></td>
                      <td style={{ color:'var(--rt-green)' }}>{r.retired ? fmt(r.afterTax) : '--'}</td>
                      <td>{r.retired
                        ? <span className={`rt-badge ${bc}`}>{fmtPct(r.bracket)}</span>
                        : '--'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Historical Panel ─────────────────────────────────────────────────────────
interface HistoricalPanelProps {
  histStart: number; setHistStart: (v: number) => void
  histWr:    number; setHistWr:    (v: number) => void
  histPart:  number; setHistPart:  (v: number) => void
  histData:  HistRow[]
  onCalcHistorical: () => void
}

function HistoricalPanel(p: HistoricalPanelProps) {
  const { histStart, setHistStart, histWr, setHistWr, histPart, setHistPart,
          histData, onCalcHistorical } = p

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef  = useRef<InstanceType<typeof Chart> | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !histData.length) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    const labels = histData.map(r => r.year)
    const sqB    = histData.map(r => r.sqBal / 1e6)
    const rB     = histData.map(r => r.rBal  / 1e6)
    chartRef.current = new Chart(canvasRef.current!, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Status Quo (Market)',  data: sqB, borderColor: '#b83232', fill: false, tension: 0.3, pointRadius: 3, borderWidth: 2 },
          { label: 'Rescue (Protected)',   data: rB,  borderColor: '#2e7d52', fill: false, tension: 0.3, pointRadius: 3, borderWidth: 2 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { ticks: { callback: (v: unknown) => '$' + (v as number).toFixed(2) + 'M' } },
        },
        plugins: { legend: { position: 'top' } },
      },
    } as any)
    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [histData])

  // ── Derived stats ──────────────────────────────────────────────────────────
  const fSQ = histData.length ? histData[histData.length - 1].sqBal : 0
  const fR  = histData.length ? histData[histData.length - 1].rBal  : 0
  const totalWithdrawals = histData.length ? histData[0].sqW * histData.length : 0

  return (
    <div className="rt-panel">

      {/* ── Section header ────────────────────────────────────────────────── */}
      <div className="rt-section-header">
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'var(--rt-navy)', margin:0 }}>
          Historical Status Quo vs Rescue (2000-2023)
        </h2>
      </div>

      {/* ── Inputs ────────────────────────────────────────────────────────── */}
      <div className="rt-card">
        <h3>Historical Inputs</h3>
        <div className="rt-form-grid">
          <div className="rt-form-group">
            <label>Starting Balance ($)</label>
            <input type="number" value={histStart}
              onFocus={e => e.target.select()}
              onChange={e => setHistStart(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="rt-form-group">
            <label>Withdrawal Rate</label>
            <input type="number" step="0.5" min="0" max="20"
              value={+(histWr * 100).toFixed(1)}
              onFocus={e => e.target.select()}
              onChange={e => setHistWr((parseFloat(e.target.value) || 0) / 100)} />
          </div>
          <div className="rt-form-group">
            <label>Rescue Participation Rate</label>
            <input type="number" step="1" min="0" max="100"
              value={Math.round(histPart * 100)}
              onFocus={e => e.target.select()}
              onChange={e => setHistPart((parseFloat(e.target.value) || 0) / 100)} />
          </div>
        </div>
        <button className="rt-calc-btn" style={{ marginTop:10 }} onClick={onCalcHistorical}>
          Recalculate
        </button>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      {histData.length > 0 && (
        <div className="rt-stats-row">
          <div className="rt-stat-box red">
            <div className="rt-stat-label">Status Quo End Balance</div>
            <div className="rt-stat-value">{fmt(fSQ)}</div>
            <div className="rt-stat-sub">2000-2023</div>
          </div>
          <div className="rt-stat-box green">
            <div className="rt-stat-label">Rescue End Balance</div>
            <div className="rt-stat-value">{fmt(fR)}</div>
            <div className="rt-stat-sub">2000-2023</div>
          </div>
          <div className="rt-stat-box navy">
            <div className="rt-stat-label">Rescue Advantage</div>
            <div className="rt-stat-value">{fmt(fR - fSQ)}</div>
            <div className="rt-stat-sub">Extra accumulated</div>
          </div>
          <div className="rt-stat-box">
            <div className="rt-stat-label">Total Withdrawals</div>
            <div className="rt-stat-value">{fmt(totalWithdrawals)}</div>
            <div className="rt-stat-sub">Same for both</div>
          </div>
        </div>
      )}

      {/* ── Chart ─────────────────────────────────────────────────────────── */}
      <div className="rt-card">
        <h2>Portfolio Balance 2000-2023</h2>
        <div className="rt-chart-wrap"><canvas ref={canvasRef} /></div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="rt-card">
        <h2>Year-by-Year Historical</h2>
        <div className="rt-tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Market Return</th>
                <th>SQ Balance</th>
                <th>SQ Withdrawal</th>
                <th>Protected Return</th>
                <th>Rescue Balance</th>
                <th>Rescue Withdrawal</th>
              </tr>
            </thead>
            <tbody>
              {histData.map(r => (
                <tr key={r.year}>
                  <td>{r.year}</td>
                  <td style={{ color: r.mr < 0 ? 'var(--rt-red)' : 'var(--rt-green)', fontWeight:600 }}>
                    {(r.mr * 100).toFixed(1)}%
                  </td>
                  <td>{fmt(r.sqBal)}</td>
                  <td>{fmt(r.sqW)}</td>
                  <td style={{ color: r.pr > 0 ? 'var(--rt-green)' : 'var(--rt-muted)' }}>
                    {(r.pr * 100).toFixed(2)}%
                  </td>
                  <td><strong>{fmt(r.rBal)}</strong></td>
                  <td>{fmt(r.rW)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

// ─── Report Panel ─────────────────────────────────────────────────────────────
interface ReportPanelProps {
  projData:    ProjRow[]
  age:         number;  retAge:      number;  filing:      FilingStatus
  pState:      string;  salary:      number;  otherIncome: number
  ss:          number;  ssAge:       number
  qualAccounts:    QualAccount[]; nqAccounts: NQAccount[]; pensions: Pension[]
  solPool:     string;  solScenario: string;  solCustomPct: number
  solRescueRet:number;  solMktRet:   number
  solSwrFIA:   number;  solSwrSQ:    number
  solDownturnEvents: DownturnEvent[]
}

function ReportPanel(p: ReportPanelProps) {
  const {
    projData, age, retAge, filing, pState, salary, otherIncome, ss, ssAge,
    qualAccounts, nqAccounts, pensions,
    solPool, solScenario, solCustomPct, solRescueRet, solMktRet,
    solSwrFIA, solSwrSQ, solDownturnEvents,
  } = p

  // ── getTotals equivalent ───────────────────────────────────────────────────
  let qBal = 0, nqBal = 0, qContrib = 0, nqAnnual = 0
  for (const a of qualAccounts) {
    qBal += a.balance || 0
    if (a.active) qContrib += computeContrib(a, age, salary)
  }
  for (const a of nqAccounts) {
    nqBal    += a.balance  || 0
    nqAnnual += (a.monthly || 0) * 12
  }

  // ── getRow helpers ────────────────────────────────────────────────────────
  function getRow(arr: ProjRow[], targetAge: number) {
    return arr.find(r => r.age === targetAge) ?? null
  }

  const stdDed   = STD_DED[filing] ?? 16100
  const retRow   = getRow(projData, retAge) ?? { total:0, income:0, bracket:0, age:retAge, qual:0, nq:0 }
  const row90    = getRow(projData, 90)
  const curBrk   = getBracket(Math.max(0, salary + otherIncome - stdDed), filing)
  const retBrk   = retRow.bracket
  const retAT    = retRow.income - estimateTax(Math.max(0, retRow.income - stdDed), filing)
  const pct      = salary > 0 ? Math.round(retRow.income / salary * 100) : 0
  const gap      = salary - retRow.income

  // ── FIA scenario values ───────────────────────────────────────────────────
  const ruleOf110 = Math.min((110 - age) / 100, 1)
  let fiaPct: number
  if      (solScenario === 'Full Rescue') fiaPct = 1.0
  else if (solScenario === 'Partial 50') fiaPct = 0.5
  else if (solScenario === 'Custom')     fiaPct = Math.min(1, Math.max(0, solCustomPct))
  else                                   fiaPct = ruleOf110   // 'Max Partial'

  const totalAssets   = qBal + nqBal
  const annualContrib = qContrib + nqAnnual
  let   accumBal      = totalAssets
  for (let y = 0; y < retAge - age; y++) accumBal = accumBal * (1 + solMktRet) + annualContrib
  const retireBal = accumBal

  const sqRetIncome   = retRow.income
  const sqRetAT       = retAT
  const fiaRetIncome  = retireBal * solSwrFIA
  let taxableRescue   = solPool === 'NQ'
    ? fiaRetIncome * (1 - fiaPct)
    : fiaRetIncome * (solPool === 'BOTH' ? 0.6 : 1)
  taxableRescue       = Math.max(0, taxableRescue - stdDed)
  const fiaRetAT      = fiaRetIncome - estimateTax(taxableRescue, filing)
  const fiaRetBrk     = getBracket(taxableRescue, filing)

  const hasSolCrash   = solDownturnEvents.length > 0
  const worstDrop     = hasSolCrash
    ? solDownturnEvents.reduce((s, d) => s + d.drop, 0) : 0
  const sqCrashInc    = hasSolCrash
    ? retireBal * (1 - worstDrop / 100) * solSwrSQ : sqRetIncome
  const fiaCrashInc   = hasSolCrash
    ? (retireBal * (1 - fiaPct) * (1 - worstDrop / 100) + retireBal * fiaPct) * solSwrFIA
    : fiaRetIncome
  const incAdvantage  = hasSolCrash ? Math.max(0, fiaCrashInc - sqCrashInc) : 0

  if (!projData.length) {
    return (
      <div className="rt-panel">
        <div className="rt-card" style={{ textAlign:'center', padding:'32px 20px' }}>
          <p style={{ fontSize:14, color:'var(--rt-muted)' }}>
            Click <strong style={{ color:'var(--rt-navy)' }}>Calculate Projections</strong> on the{' '}
            <strong style={{ color:'var(--rt-navy)' }}>Client Profile</strong> tab first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rt-panel">

      {/* ── Section header ────────────────────────────────────────────────── */}
      <div className="rt-section-header">
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'var(--rt-navy)', margin:0 }}>
          Client Retirement Plan Report
        </h2>
        <button className="rt-calc-btn" onClick={() => window.print()}>
          Print / Export PDF
        </button>
      </div>

      {/* ── Header card ───────────────────────────────────────────────────── */}
      <div className="rt-card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
                      marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:'var(--rt-navy)' }}>
              Retirement Plan Summary
            </div>
            <div style={{ color:'var(--rt-muted)', fontSize:13, marginTop:4 }}>
              Prepared {new Date().toLocaleDateString()}
            </div>
          </div>
          <div style={{ textAlign:'right', fontSize:13, color:'var(--rt-muted)' }}>
            <div>Filing: <strong>{filing}</strong></div>
            <div>State: <strong>{pState}</strong></div>
            <div>Current Age: <strong>{age}</strong></div>
            <div>Retirement Age: <strong>{retAge}</strong></div>
          </div>
        </div>

        {/* Asset summary stats */}
        <div className="rt-stats-row">
          <div className="rt-stat-box navy">
            <div className="rt-stat-label">Total Assets Today</div>
            <div className="rt-stat-value">{fmt(qBal + nqBal)}</div>
          </div>
          <div className="rt-stat-box">
            <div className="rt-stat-label">Qualified (Taxable)</div>
            <div className="rt-stat-value">{fmt(qBal)}</div>
            <div className="rt-stat-sub">TSP / 401k / IRA</div>
          </div>
          <div className="rt-stat-box green">
            <div className="rt-stat-label">Non-Qualified (Tax-Free)</div>
            <div className="rt-stat-value">{fmt(nqBal)}</div>
            <div className="rt-stat-sub">Roth / NQ</div>
          </div>
          {ss > 0 && (
            <div className="rt-stat-box gold">
              <div className="rt-stat-label">Social Security</div>
              <div className="rt-stat-value">{fmt(ss)}/mo</div>
              <div className="rt-stat-sub">Starting age {ssAge}</div>
            </div>
          )}
        </div>

        {/* Pensions */}
        {pensions.length > 0 && (
          <>
            <div className="rt-divider" />
            <h3>Pensions</h3>
            <div className="rt-tbl-wrap">
              <table>
                <thead>
                  <tr><th>Plan</th><th>Monthly Benefit</th><th>Start Age</th><th>COLA</th></tr>
                </thead>
                <tbody>
                  {pensions.map(pen => (
                    <tr key={pen.id}>
                      <td>{pen.employer || 'Pension'}</td>
                      <td>{fmt(pen.monthly)}/mo</td>
                      <td>Age {pen.startAge}</td>
                      <td>{pen.cola ? fmtPct(pen.cola) + ' COLA' : 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Key projection numbers */}
        <div className="rt-divider" />
        <h3>Retirement Projections (7% Hypothetical)</h3>
        <div className="rt-stats-row">
          <div className="rt-stat-box navy">
            <div className="rt-stat-label">Portfolio at Retirement</div>
            <div className="rt-stat-value">{fmt(retRow.total)}</div>
            <div className="rt-stat-sub">Age {retAge}</div>
          </div>
          <div className="rt-stat-box green">
            <div className="rt-stat-label">Gross Income</div>
            <div className="rt-stat-value">{fmt(sqRetIncome)}</div>
            <div className="rt-stat-sub">4% SWR + SS</div>
          </div>
          <div className="rt-stat-box green">
            <div className="rt-stat-label">After-Tax Income</div>
            <div className="rt-stat-value">{fmt(sqRetAT)}</div>
            <div className="rt-stat-sub">{fmtPct(retBrk)} bracket</div>
          </div>
          <div className={`rt-stat-box ${gap > 0 ? 'red' : 'green'}`}>
            <div className="rt-stat-label">Income {gap > 0 ? 'Gap' : 'Surplus'}</div>
            <div className="rt-stat-value">{fmt(Math.abs(gap))}</div>
            <div className="rt-stat-sub">vs {fmt(salary)} salary</div>
          </div>
          <div className={`rt-stat-box ${retBrk < curBrk ? 'green' : 'red'}`}>
            <div className="rt-stat-label">Bracket Change</div>
            <div className="rt-stat-value">{fmtPct(curBrk)} to {fmtPct(retBrk)}</div>
            <div className="rt-stat-sub">
              {retBrk < curBrk ? 'Tax savings in retirement' : 'Higher — consider Roth'}
            </div>
          </div>
          <div className="rt-stat-box">
            <div className="rt-stat-label">Balance at Age 90</div>
            <div className="rt-stat-value">{fmt(row90 ? row90.total : 0)}</div>
            <div className="rt-stat-sub">Legacy potential</div>
          </div>
        </div>

        {/* Talking points */}
        <div className="rt-divider" />
        <h3>Key Talking Points</h3>
        <div style={{ display:'grid', gap:10, fontSize:13, marginTop:8 }}>
          <div className="rt-alert info">
            <strong>Income Replacement:</strong> Projected retirement income of {fmt(sqRetIncome)} replaces {pct}%
            of current salary ({fmt(salary)}).{' '}
            {pct < 80
              ? <>There is a <strong>{fmt(Math.abs(gap))}</strong> annual gap to address.</>
              : 'Income exceeds current salary.'
            }
          </div>
          <div className={`rt-alert ${retBrk > curBrk ? 'danger' : 'warning'}`}>
            <strong>Tax Bracket:</strong> Working bracket is {fmtPct(curBrk)}, projected retirement bracket
            is {fmtPct(retBrk)}.{' '}
            {retBrk < curBrk
              ? 'Bracket drops in retirement — potential Roth conversion opportunity now.'
              : 'Bracket rises — consider tax-free income strategies.'
            }
          </div>
          <div className="rt-alert danger">
            <strong>Sequence of Return Risk:</strong> A market crash early in retirement permanently reduces
            income. A <strong>-37% crash</strong> (2008-level) at retirement would drop annual income
            from {fmt(sqRetIncome)} to approximately {fmt(sqRetIncome * 0.63)} — a {fmt(sqRetIncome * 0.37)}/yr
            permanent loss.
          </div>
          <div className="rt-alert info">
            <strong>FIA Strategy:</strong> By applying the Rule of 110 ({fmtPct(ruleOf110)} protected),
            the FIA bucket earns {fmtPct(solRescueRet)}/yr with a <strong>0% floor</strong>. In a crash
            year the FIA bucket holds its value while the market bucket drops, protecting income.
          </div>
        </div>
      </div>

      {/* ── Side-by-side comparison table ────────────────────────────────── */}
      <div className="rt-card">
        <h2>Status Quo vs FIA Rescue — Side by Side</h2>
        <div className="rt-tbl-wrap">
          <table className="rt-comparison">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Status Quo (100% Market)</th>
                <th>FIA Rescue ({fmtPct(fiaPct)} Protected)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Assets at Retirement</td>
                <td>{fmt(retireBal)}</td>
                <td>{fmt(retireBal)}</td>
              </tr>
              <tr>
                <td>FIA Bucket (Protected)</td>
                <td className="bad">None — 100% exposed</td>
                <td className="good">{fmt(retireBal * fiaPct)} at {fmtPct(solRescueRet)}/yr, 0% floor</td>
              </tr>
              <tr>
                <td>Market Bucket (Unprotected)</td>
                <td>{fmt(retireBal)}</td>
                <td>{fmt(retireBal * (1 - fiaPct))}</td>
              </tr>
              <tr>
                <td>Normal Year Income</td>
                <td>{fmt(sqRetIncome)}</td>
                <td>{fmt(fiaRetIncome)}</td>
              </tr>
              <tr>
                <td>Normal Year After-Tax</td>
                <td>{fmt(sqRetAT)}</td>
                <td>{fmt(fiaRetAT)}</td>
              </tr>
              <tr>
                <td>Tax Bracket in Retirement</td>
                <td>{fmtPct(retBrk)}</td>
                <td>{fmtPct(fiaRetBrk)}</td>
              </tr>
              {hasSolCrash && (
                <>
                  <tr style={{ background:'#fff0f0' }}>
                    <td>Income After {worstDrop}% Market Crash</td>
                    <td className="bad">{fmt(sqCrashInc)}</td>
                    <td className="good">{fmt(fiaCrashInc)}</td>
                  </tr>
                  <tr style={{ background:'#fff0f0' }}>
                    <td>Income Advantage in Crash</td>
                    <td className="bad">—</td>
                    <td className="good">+{fmt(incAdvantage)}/yr</td>
                  </tr>
                </>
              )}
              <tr>
                <td>Sequence of Return Risk</td>
                <td className="bad">HIGH — full exposure</td>
                <td className="good">MITIGATED — 0% floor protects {fmtPct(fiaPct)}</td>
              </tr>
              <tr>
                <td>Worst Case (Market Crash at Retirement)</td>
                <td className="bad">Full portfolio loss</td>
                <td className="good">Only {fmtPct(1 - fiaPct)} exposed to loss</td>
              </tr>
              <tr>
                <td>Balance at Age 90</td>
                <td>{fmt(row90 ? row90.total : 0)}</td>
                <td className="good">Protected growth preserves legacy</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop:16, padding:14, background:'#e6f4ed', borderRadius:8,
                      fontSize:13, color:'#1a3d2b' }}>
          <strong>The FIA Advantage:</strong> In normal years both strategies produce similar income.
          The real difference shows when markets crash — the {fmtPct(fiaPct)} in the FIA bucket earns
          0% instead of -{worstDrop}%, so the client withdraws 4% of a <em>larger</em> balance and
          keeps <strong>+{fmt(incAdvantage)}/yr more income</strong> than the status quo client.
        </div>
      </div>

    </div>
  )
}
