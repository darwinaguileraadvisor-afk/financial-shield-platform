import { useState, useEffect, useRef } from 'react'
import { useClient } from '../../context/ClientContext'

// ─── Types ─────────────────────────────────────────────────────────────────────
type MaritalStatus = 'married' | 'single1' | 'single2'
type FuneralType = 'burial' | 'cremation'

interface DebtItem { id: number; type: string; amount: number; owner: 'joint' | 'p1' | 'p2' }
interface Child { id: number; name: string; annualCost: number }
interface FuneralVals { p1: Record<string, number>; p2: Record<string, number> }

// ─── Constants ─────────────────────────────────────────────────────────────────
const DEBT_TYPES = ['Credit card','Auto loan','Student loan','Personal loan','Medical debt','Tax debt','Business loan','Line of credit','Other']

const FUNERAL_FIELDS = {
  burial: [
    {id:'casket', label:'Casket', default:10000},
    {id:'burial-plot', label:'Burial plot', default:6000},
    {id:'headstone', label:'Headstone / marker', default:4000},
    {id:'funeral-service', label:'Funeral service & director', default:3500},
    {id:'burial-other', label:'Other (flowers, transport, etc.)', default:1500},
  ],
  cremation: [
    {id:'cremation-fee', label:'Cremation fee', default:4500},
    {id:'urn', label:'Urn', default:500},
    {id:'memorial-service', label:'Memorial service', default:3500},
    {id:'cremation-other', label:'Other (death certificates, misc.)', default:1500},
  ],
}

const SCREENS = ['Household','Needs','Budget','Assets','Summary']

// ─── Helpers ───────────────────────────────────────────────────────────────────
function money(n: number): string {
  if (isNaN(n)) return '$0'
  return '$' + Math.round(n).toLocaleString()
}

function calcAgeFromDob(dob: string): number | null {
  if (!dob) return null
  const ms = Date.now() - new Date(dob).getTime()
  const age = Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000))
  return age > 0 ? age : null
}

function defaultFuneralVals(): FuneralVals {
  const build = (type: FuneralType) => {
    const rec: Record<string, number> = {}
    FUNERAL_FIELDS[type].forEach(f => { rec[f.id] = f.default })
    return rec
  }
  return { p1: { ...build('burial') }, p2: { ...build('burial') } }
}

// ─── CSS ───────────────────────────────────────────────────────────────────────
const WA_CSS = `
.wa-wrap *{box-sizing:border-box;margin:0;padding:0}
.wa-wrap{
  --navy:#0a1628;
  --navy-mid:#112240;
  --navy-light:#1e3a5f;
  --gold:#c9a84c;
  --gold-light:#e8c97a;
  --gold-dim:#8a6e2e;
  --cream:#f5f0e8;
  --text-primary:#f0ebe0;
  --text-secondary:#a8b4c8;
  --text-dim:#6b7c93;
  --green:#4ade80;
  --red:#f87171;
  --border:rgba(201,168,76,0.25);
  --border-dim:rgba(201,168,76,0.09);
  --card-bg:#112240;
  font-family:'DM Sans',sans-serif;
  background:var(--navy);
  color:var(--text-primary);
  min-height:100vh;
}
.wa-wrap .wa-nav{background:var(--navy-mid);border-bottom:1px solid var(--border);padding:0 2rem;display:flex;align-items:center;justify-content:space-between;height:60px;position:sticky;top:0;z-index:100}
.wa-wrap .wa-nav-logo{display:flex;align-items:center;gap:10px}
.wa-wrap .wa-nav-logo-icon{width:36px;height:36px;background:linear-gradient(135deg,var(--gold),var(--gold-dim));border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px}
.wa-wrap .wa-nav-logo-text{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--cream)}
.wa-wrap .wa-nav-logo-sub{font-size:10px;color:var(--gold);letter-spacing:.12em;text-transform:uppercase}
.wa-wrap .wa-nav-steps{display:flex;gap:0;align-items:center}
.wa-wrap .wa-nav-step{padding:0 16px;height:60px;display:flex;align-items:center;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap;font-weight:600;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit}
.wa-wrap .wa-nav-step:hover{color:var(--text-secondary)}
.wa-wrap .wa-nav-step.active{color:var(--gold);border-bottom-color:var(--gold)}
.wa-wrap .wa-nav-step.done{color:var(--text-secondary)}
.wa-wrap .wa-nav-right{display:flex;gap:8px}
.wa-wrap .btn-nav{background:transparent;border:1px solid var(--border);color:var(--text-secondary);padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;transition:all .2s;letter-spacing:.06em}
.wa-wrap .btn-nav:hover{background:rgba(255,255,255,.06);color:var(--text-primary)}
.wa-wrap .btn-nav.gold{background:linear-gradient(135deg,var(--gold),var(--gold-dim));border-color:var(--gold);color:var(--navy);font-weight:700}
.wa-wrap .btn-nav.gold:hover{opacity:.9}
.wa-wrap .wa-screen{max-width:900px;margin:0 auto;padding:2rem 1.5rem 5rem}
.wa-wrap .section-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--cream);margin-bottom:6px}
.wa-wrap .section-sub{font-size:14px;color:var(--text-dim);margin-bottom:2rem;font-weight:300}
.wa-wrap .card{background:var(--card-bg);border:1px solid var(--border-dim);border-radius:16px;padding:1.75rem;margin-bottom:1.25rem;position:relative;overflow:hidden}
.wa-wrap .card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:.4}
.wa-wrap .card-title{font-size:10px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.14em;margin-bottom:1.25rem;padding-bottom:.75rem;border-bottom:1px solid var(--border-dim)}
.wa-wrap .field-grid{display:grid;gap:1rem}
.wa-wrap .field-grid.cols2{grid-template-columns:1fr 1fr}
.wa-wrap .field-grid.cols3{grid-template-columns:1fr 1fr 1fr}
.wa-wrap .field-grid.cols4{grid-template-columns:1fr 1fr 1fr 1fr}
.wa-wrap label{font-size:11px;color:var(--gold);font-weight:600;display:block;margin-bottom:5px;letter-spacing:.1em;text-transform:uppercase}
.wa-wrap input[type=text],.wa-wrap input[type=date],.wa-wrap input[type=email],.wa-wrap input[type=tel],.wa-wrap input[type=number],.wa-wrap select,.wa-wrap textarea{width:100%;border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:14px;font-family:inherit;color:var(--cream);background:rgba(255,255,255,.04);outline:none;transition:all .2s}
.wa-wrap input:focus,.wa-wrap select:focus,.wa-wrap textarea:focus{border-color:var(--gold);background:rgba(201,168,76,.06);box-shadow:0 0 0 3px rgba(201,168,76,.08)}
.wa-wrap input::placeholder,.wa-wrap textarea::placeholder{color:var(--text-dim)}
.wa-wrap select option{background:var(--navy-mid);color:var(--cream)}
.wa-wrap .input-wrap{position:relative}
.wa-wrap .input-wrap .prefix{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--text-dim);pointer-events:none}
.wa-wrap input.dollar{padding-left:22px}
.wa-wrap .calc-field{background:rgba(255,255,255,.03);border:1px solid var(--border-dim);border-radius:10px;padding:10px 14px;font-size:14px;color:var(--cream);font-weight:500}
.wa-wrap .calc-label{font-size:11px;color:var(--text-dim);margin-top:4px}
.wa-wrap .person-cols{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem}
.wa-wrap .person-header{font-size:13px;font-weight:600;color:var(--cream);margin-bottom:1rem;display:flex;align-items:center;gap:8px}
.wa-wrap .person-badge{background:rgba(24,95,165,.25);color:#64b0f4;font-size:11px;padding:3px 10px;border-radius:20px;font-weight:600;letter-spacing:.06em}
.wa-wrap .person-badge.p2{background:rgba(83,74,183,.25);color:#a89cf7}
.wa-wrap .toggle-row{display:flex;gap:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:1rem}
.wa-wrap .toggle-btn{flex:1;padding:9px;font-size:12px;cursor:pointer;border:none;background:transparent;color:var(--text-dim);font-family:inherit;transition:all .15s;letter-spacing:.06em;font-weight:500}
.wa-wrap .toggle-btn.active{background:linear-gradient(135deg,var(--gold),var(--gold-dim));color:var(--navy);font-weight:700}
.wa-wrap .inner-card{background:rgba(255,255,255,.03);border:1px solid var(--border-dim);border-radius:12px;padding:1.25rem}
.wa-wrap .summary-wrap{max-width:900px;margin:0 auto;padding:2rem 1.5rem 5rem}
.wa-wrap .summary-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem}
.wa-wrap .summary-title{font-family:'Playfair Display',serif;font-size:36px;color:var(--cream);margin-bottom:4px}
.wa-wrap .summary-client{font-size:18px;color:var(--gold-light);font-weight:500}
.wa-wrap .summary-date{font-size:13px;color:var(--text-dim);margin-top:4px}
.wa-wrap .summary-firm{font-size:12px;color:var(--text-dim);text-align:right}
.wa-wrap .summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.25rem}
.wa-wrap .summary-card{background:var(--card-bg);border:1px solid var(--border-dim);border-radius:16px;padding:1.5rem;position:relative;overflow:hidden}
.wa-wrap .summary-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:.4}
.wa-wrap .summary-card.full{grid-column:1/-1}
.wa-wrap .summary-card-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--gold);margin-bottom:1rem;padding-bottom:.625rem;border-bottom:1px solid var(--border-dim)}
.wa-wrap .summary-row{display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.wa-wrap .summary-row:last-child{border-bottom:none}
.wa-wrap .summary-row.total{border-top:1px solid var(--border);margin-top:4px;padding-top:12px;border-bottom:none}
.wa-wrap .summary-row-label{font-size:13px;color:var(--text-secondary)}
.wa-wrap .summary-row-label.sub{padding-left:16px;color:var(--text-dim);font-size:12px}
.wa-wrap .summary-row-value{font-size:14px;font-weight:600;color:var(--cream);font-variant-numeric:tabular-nums}
.wa-wrap .summary-row.total .summary-row-label{font-weight:600;font-size:14px;color:var(--cream)}
.wa-wrap .summary-row.total .summary-row-value{font-size:16px;color:var(--gold-light)}
.wa-wrap .notes-display{font-size:14px;color:var(--text-secondary);line-height:1.6;white-space:pre-wrap;min-height:40px}
.wa-wrap .print-controls{display:flex;gap:10px;margin-bottom:2rem;align-items:center}
.wa-wrap .btn{padding:10px 20px;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;font-weight:600;transition:all .15s;border:1px solid var(--border);background:transparent;color:var(--text-secondary);letter-spacing:.06em}
.wa-wrap .btn:hover{background:rgba(255,255,255,.06);color:var(--text-primary)}
.wa-wrap .btn.primary{background:linear-gradient(135deg,var(--gold),var(--gold-dim));color:var(--navy);border-color:var(--gold)}
.wa-wrap .btn.gold{background:linear-gradient(135deg,var(--gold),var(--gold-dim));color:var(--navy);border-color:var(--gold)}
.wa-wrap .totals-bar{padding:1rem 1.25rem;background:rgba(201,168,76,.08);border:1px solid var(--border);border-radius:12px;display:flex;justify-content:space-between;align-items:center}
.wa-wrap .totals-bar-label{font-size:13px;font-weight:600;color:var(--text-secondary)}
.wa-wrap .totals-bar-value{font-size:18px;font-weight:700;color:var(--gold-light);font-variant-numeric:tabular-nums}
.wa-wrap textarea{resize:vertical;min-height:80px}
.wa-wrap .add-btn{display:flex;align-items:center;gap:6px;background:none;border:1px dashed var(--gold-dim);color:var(--gold-dim);padding:9px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;font-weight:500;width:100%;justify-content:center;transition:all .2s;margin-top:.75rem}
.wa-wrap .add-btn:hover{border-color:var(--gold);color:var(--gold);background:rgba(201,168,76,.06)}
.wa-wrap .remove-btn{width:32px;height:32px;border-radius:7px;border:1px solid var(--border-dim);background:transparent;color:var(--text-dim);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:all .2s}
.wa-wrap .remove-btn:hover{border-color:var(--red);color:var(--red)}
.wa-wrap .breakdown-box{background:rgba(255,255,255,.03);border-radius:8px;padding:.875rem;font-size:12px;color:var(--text-dim)}
.wa-wrap .breakdown-row{display:flex;justify-content:space-between;margin-bottom:3px}
.wa-wrap .breakdown-row:last-child{margin-bottom:0;padding-top:5px;border-top:1px solid var(--border-dim);color:var(--text-secondary)}
.wa-wrap .stats-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-dim)}
.wa-wrap .stat-item-label{font-size:11px;color:var(--text-dim);margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em}
.wa-wrap .stat-item-value{font-size:17px;font-weight:600;color:var(--cream);font-variant-numeric:tabular-nums}
@media(max-width:640px){
  .wa-wrap .field-grid.cols2,.wa-wrap .field-grid.cols3,.wa-wrap .field-grid.cols4,.wa-wrap .person-cols,.wa-wrap .summary-grid{grid-template-columns:1fr}
  .wa-wrap .wa-nav-steps{display:none}
  .wa-wrap .stats-row{grid-template-columns:1fr 1fr}
}
@media print{
  body{background:#fff!important;color:#111!important}
  .wa-wrap .wa-nav,.wa-wrap .print-controls,.wa-wrap .no-print{display:none!important}
  .wa-wrap .card,.wa-wrap .summary-card,.wa-wrap .inner-card{background:#fff!important;border:1px solid #ddd!important}
  .wa-wrap .card::before,.wa-wrap .summary-card::before{display:none!important}
  .wa-wrap .summary-title,.wa-wrap .section-title{color:#0a1628!important}
  .wa-wrap .summary-client{color:#c9a84c!important}
  .wa-wrap .summary-row-value{color:#111!important}
  .wa-wrap .summary-row.total .summary-row-value{color:#c9a84c!important}
  .wa-wrap .card-title,.wa-wrap .summary-card-title{color:#c9a84c!important}
  .wa-wrap label{color:#555!important}
  @page{margin:1.5cm;size:letter}
}
`

// ─── Component ─────────────────────────────────────────────────────────────────
export default function WantsAnalysisPage() {
  const { activeClient, saveToolData } = useClient()
  const nextDebtId = useRef(1)
  const nextChildId = useRef(1)

  // Screen
  const [screen, setScreen] = useState(0)

  // Household
  const [analysisDate, setAnalysisDate] = useState(() => new Date().toISOString().split('T')[0])
  const [p1Name, setP1Name] = useState('')
  const [p1Dob, setP1Dob] = useState('')
  const [p1Phone, setP1Phone] = useState('')
  const [p1Email, setP1Email] = useState('')
  const [p2Name, setP2Name] = useState('')
  const [p2Dob, setP2Dob] = useState('')
  const [p2Phone, setP2Phone] = useState('')
  const [p2Email, setP2Email] = useState('')

  // Needs
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>('married')
  const [debtItems, setDebtItems] = useState<DebtItem[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [funeralPrefs, setFuneralPrefs] = useState<{1: FuneralType; 2: FuneralType}>({1:'burial', 2:'burial'})
  const [funeralVals, setFuneralVals] = useState<FuneralVals>(defaultFuneralVals)
  const [mortgagePayoff, setMortgagePayoff] = useState(0)
  const [annualIncomeP1, setAnnualIncomeP1] = useState(0)
  const [annualIncomeP2, setAnnualIncomeP2] = useState(0)
  const [incomeYearsP1, setIncomeYearsP1] = useState(10)
  const [incomeYearsP2, setIncomeYearsP2] = useState(10)
  const [irOverrideP1, setIrOverrideP1] = useState(false)
  const [irOverrideAmtP1, setIrOverrideAmtP1] = useState(0)
  const [irOverrideP2, setIrOverrideP2] = useState(false)
  const [irOverrideAmtP2, setIrOverrideAmtP2] = useState(0)
  const [retirementNeed, setRetirementNeed] = useState(0)
  const [liOverrideP1, setLiOverrideP1] = useState(false)
  const [liOverrideAmtP1, setLiOverrideAmtP1] = useState(0)
  const [liOverrideP2, setLiOverrideP2] = useState(false)
  const [liOverrideAmtP2, setLiOverrideAmtP2] = useState(0)
  const [currentFaceP1, setCurrentFaceP1] = useState(0)
  const [currentFaceP2, setCurrentFaceP2] = useState(0)

  // Budget
  const [netIncome, setNetIncome] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [affordable, setAffordable] = useState(0)
  const [contribPctP1, setContribPctP1] = useState(0)
  const [matchPctP1, setMatchPctP1] = useState(0)
  const [liPremiumP1, setLiPremiumP1] = useState(0)
  const [contribPctP2, setContribPctP2] = useState(0)
  const [matchPctP2, setMatchPctP2] = useState(0)
  const [liPremiumP2, setLiPremiumP2] = useState(0)
  const [taxRefundAnnual, setTaxRefundAnnual] = useState(0)
  const [retBudget, setRetBudget] = useState(0)

  // Assets
  const [qualifiedP1, setQualifiedP1] = useState(0)
  const [nonqualifiedP1, setNonqualifiedP1] = useState(0)
  const [qualifiedP2, setQualifiedP2] = useState(0)
  const [nonqualifiedP2, setNonqualifiedP2] = useState(0)
  const [movableP1, setMovableP1] = useState(true)
  const [movableP2, setMovableP2] = useState(true)
  const [notes, setNotes] = useState('')

  // ─── Computed ──────────────────────────────────────────────────────────────
  const p1Age = calcAgeFromDob(p1Dob)
  const p2Age = calcAgeFromDob(p2Dob)
  const hideP2 = maritalStatus === 'single1'

  function funeralTotalFor(person: 1 | 2): number {
    const type = funeralPrefs[person]
    const vals = person === 1 ? funeralVals.p1 : funeralVals.p2
    return FUNERAL_FIELDS[type].reduce((s, f) => s + (vals[f.id] ?? f.default), 0)
  }

  const funeralTotalP1 = funeralTotalFor(1)
  const funeralTotalP2 = hideP2 ? 0 : funeralTotalFor(2)
  const funeralCombined = funeralTotalP1 + funeralTotalP2

  const debtTotal = debtItems.reduce((s, d) => s + d.amount, 0)

  function getDebtP1(): number {
    if (maritalStatus === 'single2') return 0
    if (maritalStatus === 'single1') return debtTotal
    return debtItems.reduce((s, d) => {
      if (d.owner === 'joint' || d.owner === 'p1') return s + d.amount
      return s
    }, 0)
  }
  function getDebtP2(): number {
    if (maritalStatus === 'single1') return 0
    if (maritalStatus === 'single2') return debtTotal
    return debtItems.reduce((s, d) => {
      if (d.owner === 'joint' || d.owner === 'p2') return s + d.amount
      return s
    }, 0)
  }

  const eduTotal = children.reduce((s, c) => s + c.annualCost * 4, 0)
  const totalObligations = funeralTotalP1 + funeralTotalP2 + eduTotal + mortgagePayoff + debtTotal

  const irP1 = irOverrideP1 ? irOverrideAmtP1 : annualIncomeP1 * incomeYearsP1
  const irP2 = irOverrideP2 ? irOverrideAmtP2 : annualIncomeP2 * incomeYearsP2
  const frP1 = irP1 * 0.03
  const frP2 = irP2 * 0.03
  const frCombined = frP1 + (hideP2 ? 0 : frP2)

  const obligP1 = maritalStatus === 'married' ? totalObligations / 2 : maritalStatus === 'single1' ? totalObligations : 0
  const obligP2 = maritalStatus === 'married' ? totalObligations / 2 : maritalStatus === 'single2' ? totalObligations : 0

  const liCalcP1 = obligP1 + irP1 + retirementNeed
  const liCalcP2 = obligP2 + irP2 + retirementNeed
  const liNeededP1 = liOverrideP1 ? liOverrideAmtP1 : liCalcP1
  const liNeededP2 = liOverrideP2 ? liOverrideAmtP2 : liCalcP2
  const addFaceP1 = Math.max(0, liNeededP1 - currentFaceP1)
  const addFaceP2 = Math.max(0, liNeededP2 - currentFaceP2)

  const discretionary = netIncome - totalExpenses
  const taxRefundMonthly = taxRefundAnnual / 12

  const contribEmpP1 = (annualIncomeP1 * contribPctP1 / 100) / 12
  const contribMatchP1 = (annualIncomeP1 * matchPctP1 / 100) / 12
  const contribTotalP1 = contribEmpP1 + contribMatchP1
  const contribEmpP2 = (annualIncomeP2 * contribPctP2 / 100) / 12
  const contribMatchP2 = (annualIncomeP2 * matchPctP2 / 100) / 12
  const contribTotalP2 = contribEmpP2 + contribMatchP2
  const iraContribTotal = contribTotalP1 + (hideP2 ? 0 : contribTotalP2)
  const liPremiumTotal = liPremiumP1 + (hideP2 ? 0 : liPremiumP2)

  const assetsP1 = qualifiedP1 + nonqualifiedP1
  const assetsP2 = qualifiedP2 + nonqualifiedP2
  const totalQualified = qualifiedP1 + qualifiedP2
  const totalNonQualified = nonqualifiedP1 + nonqualifiedP2
  const totalAssets = assetsP1 + assetsP2

  const sumMonthlyTotal = iraContribTotal + affordable + liPremiumTotal + taxRefundMonthly

  // ─── Load/Save ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeClient) return
    if (activeClient.first_name || activeClient.last_name)
      setP1Name([activeClient.first_name, activeClient.last_name].filter(Boolean).join(' '))
    if (activeClient.date_of_birth) setP1Dob(activeClient.date_of_birth)
    if (activeClient.phone) setP1Phone(activeClient.phone)
    if (activeClient.email) setP1Email(activeClient.email)
    if (activeClient.annual_income_p1) setAnnualIncomeP1(activeClient.annual_income_p1)
    if (activeClient.annual_income_p2) setAnnualIncomeP2(activeClient.annual_income_p2)
    if (activeClient.monthly_expenses) setTotalExpenses(activeClient.monthly_expenses)
    if (activeClient.spouse_name) setP2Name(activeClient.spouse_name)
    if (activeClient.spouse_dob) setP2Dob(activeClient.spouse_dob)

    const saved = activeClient.wants_analysis_data as Record<string, unknown>
    if (saved && Object.keys(saved).length > 0) {
      if (saved.screen != null) setScreen(saved.screen as number)
      if (saved.analysisDate != null) setAnalysisDate(saved.analysisDate as string)
      if (saved.p1Name != null) setP1Name(saved.p1Name as string)
      if (saved.p1Dob != null) setP1Dob(saved.p1Dob as string)
      if (saved.p1Phone != null) setP1Phone(saved.p1Phone as string)
      if (saved.p1Email != null) setP1Email(saved.p1Email as string)
      if (saved.p2Name != null) setP2Name(saved.p2Name as string)
      if (saved.p2Dob != null) setP2Dob(saved.p2Dob as string)
      if (saved.p2Phone != null) setP2Phone(saved.p2Phone as string)
      if (saved.p2Email != null) setP2Email(saved.p2Email as string)
      if (saved.maritalStatus != null) setMaritalStatus(saved.maritalStatus as MaritalStatus)
      if (saved.debtItems != null) {
        const items = saved.debtItems as DebtItem[]
        setDebtItems(items)
        const maxId = items.reduce((m, d) => Math.max(m, d.id), 0)
        nextDebtId.current = maxId + 1
      }
      if (saved.children != null) {
        const ch = saved.children as Child[]
        setChildren(ch)
        const maxId = ch.reduce((m, c) => Math.max(m, c.id), 0)
        nextChildId.current = maxId + 1
      }
      if (saved.funeralPrefs != null) setFuneralPrefs(saved.funeralPrefs as {1: FuneralType; 2: FuneralType})
      if (saved.funeralVals != null) setFuneralVals(saved.funeralVals as FuneralVals)
      if (saved.mortgagePayoff != null) setMortgagePayoff(saved.mortgagePayoff as number)
      if (saved.annualIncomeP1 != null) setAnnualIncomeP1(saved.annualIncomeP1 as number)
      if (saved.annualIncomeP2 != null) setAnnualIncomeP2(saved.annualIncomeP2 as number)
      if (saved.incomeYearsP1 != null) setIncomeYearsP1(saved.incomeYearsP1 as number)
      if (saved.incomeYearsP2 != null) setIncomeYearsP2(saved.incomeYearsP2 as number)
      if (saved.irOverrideP1 != null) setIrOverrideP1(saved.irOverrideP1 as boolean)
      if (saved.irOverrideAmtP1 != null) setIrOverrideAmtP1(saved.irOverrideAmtP1 as number)
      if (saved.irOverrideP2 != null) setIrOverrideP2(saved.irOverrideP2 as boolean)
      if (saved.irOverrideAmtP2 != null) setIrOverrideAmtP2(saved.irOverrideAmtP2 as number)
      if (saved.retirementNeed != null) setRetirementNeed(saved.retirementNeed as number)
      if (saved.liOverrideP1 != null) setLiOverrideP1(saved.liOverrideP1 as boolean)
      if (saved.liOverrideAmtP1 != null) setLiOverrideAmtP1(saved.liOverrideAmtP1 as number)
      if (saved.liOverrideP2 != null) setLiOverrideP2(saved.liOverrideP2 as boolean)
      if (saved.liOverrideAmtP2 != null) setLiOverrideAmtP2(saved.liOverrideAmtP2 as number)
      if (saved.currentFaceP1 != null) setCurrentFaceP1(saved.currentFaceP1 as number)
      if (saved.currentFaceP2 != null) setCurrentFaceP2(saved.currentFaceP2 as number)
      if (saved.netIncome != null) setNetIncome(saved.netIncome as number)
      if (saved.totalExpenses != null) setTotalExpenses(saved.totalExpenses as number)
      if (saved.affordable != null) setAffordable(saved.affordable as number)
      if (saved.contribPctP1 != null) setContribPctP1(saved.contribPctP1 as number)
      if (saved.matchPctP1 != null) setMatchPctP1(saved.matchPctP1 as number)
      if (saved.liPremiumP1 != null) setLiPremiumP1(saved.liPremiumP1 as number)
      if (saved.contribPctP2 != null) setContribPctP2(saved.contribPctP2 as number)
      if (saved.matchPctP2 != null) setMatchPctP2(saved.matchPctP2 as number)
      if (saved.liPremiumP2 != null) setLiPremiumP2(saved.liPremiumP2 as number)
      if (saved.taxRefundAnnual != null) setTaxRefundAnnual(saved.taxRefundAnnual as number)
      if (saved.retBudget != null) setRetBudget(saved.retBudget as number)
      if (saved.qualifiedP1 != null) setQualifiedP1(saved.qualifiedP1 as number)
      if (saved.nonqualifiedP1 != null) setNonqualifiedP1(saved.nonqualifiedP1 as number)
      if (saved.qualifiedP2 != null) setQualifiedP2(saved.qualifiedP2 as number)
      if (saved.nonqualifiedP2 != null) setNonqualifiedP2(saved.nonqualifiedP2 as number)
      if (saved.movableP1 != null) setMovableP1(saved.movableP1 as boolean)
      if (saved.movableP2 != null) setMovableP2(saved.movableP2 as boolean)
      if (saved.notes != null) setNotes(saved.notes as string)
    }
  }, [activeClient?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeClient) return
    const timer = setTimeout(() => {
      saveToolData('wants_analysis_data', {
        screen, analysisDate,
        p1Name, p1Dob, p1Phone, p1Email,
        p2Name, p2Dob, p2Phone, p2Email,
        maritalStatus, debtItems, children,
        funeralPrefs, funeralVals, mortgagePayoff,
        annualIncomeP1, annualIncomeP2,
        incomeYearsP1, incomeYearsP2,
        irOverrideP1, irOverrideAmtP1, irOverrideP2, irOverrideAmtP2,
        retirementNeed,
        liOverrideP1, liOverrideAmtP1, liOverrideP2, liOverrideAmtP2,
        currentFaceP1, currentFaceP2,
        netIncome, totalExpenses, affordable,
        contribPctP1, matchPctP1, liPremiumP1,
        contribPctP2, matchPctP2, liPremiumP2,
        taxRefundAnnual, retBudget,
        qualifiedP1, nonqualifiedP1, qualifiedP2, nonqualifiedP2,
        movableP1, movableP2, notes,
      })
    }, 1500)
    return () => clearTimeout(timer)
  }, [activeClient, saveToolData, screen, analysisDate, p1Name, p1Dob, p1Phone, p1Email,
    p2Name, p2Dob, p2Phone, p2Email, maritalStatus, debtItems, children,
    funeralPrefs, funeralVals, mortgagePayoff, annualIncomeP1, annualIncomeP2,
    incomeYearsP1, incomeYearsP2, irOverrideP1, irOverrideAmtP1, irOverrideP2, irOverrideAmtP2,
    retirementNeed, liOverrideP1, liOverrideAmtP1, liOverrideP2, liOverrideAmtP2,
    currentFaceP1, currentFaceP2, netIncome, totalExpenses, affordable,
    contribPctP1, matchPctP1, liPremiumP1, contribPctP2, matchPctP2, liPremiumP2,
    taxRefundAnnual, retBudget, qualifiedP1, nonqualifiedP1, qualifiedP2, nonqualifiedP2,
    movableP1, movableP2, notes])

  // ─── Helpers for funeral val updates ──────────────────────────────────────
  function setFuneralVal(person: 1 | 2, fieldId: string, value: number) {
    if (person === 1) {
      setFuneralVals(v => ({ ...v, p1: { ...v.p1, [fieldId]: value } }))
    } else {
      setFuneralVals(v => ({ ...v, p2: { ...v.p2, [fieldId]: value } }))
    }
  }

  function getFuneralValFor(person: 1 | 2, fieldId: string, def: number): number {
    const vals = person === 1 ? funeralVals.p1 : funeralVals.p2
    return vals[fieldId] ?? def
  }

  // When funeral pref changes, we keep existing vals but merge defaults for new fields
  function changeFuneralPref(person: 1 | 2, type: FuneralType) {
    setFuneralPrefs(p => ({ ...p, [person]: type }))
    // seed defaults for the new type if not set
    const defaults: Record<string, number> = {}
    FUNERAL_FIELDS[type].forEach(f => { defaults[f.id] = f.default })
    if (person === 1) {
      setFuneralVals(v => ({ ...v, p1: { ...defaults, ...v.p1 } }))
    } else {
      setFuneralVals(v => ({ ...v, p2: { ...defaults, ...v.p2 } }))
    }
  }

  // ─── Debt helpers ──────────────────────────────────────────────────────────
  function addDebt() {
    const id = nextDebtId.current++
    const defaultOwner: 'joint' | 'p1' | 'p2' = maritalStatus === 'single2' ? 'p2' : 'p1'
    setDebtItems(d => [...d, { id, type: '', amount: 0, owner: defaultOwner }])
  }

  function removeDebt(id: number) {
    setDebtItems(d => d.filter(x => x.id !== id))
  }

  function updateDebt(id: number, key: keyof DebtItem, value: string | number) {
    setDebtItems(d => d.map(x => x.id === id ? { ...x, [key]: value } : x))
  }

  // ─── Child helpers ─────────────────────────────────────────────────────────
  function addChild() {
    const id = nextChildId.current++
    setChildren(c => [...c, { id, name: '', annualCost: 0 }])
  }

  function removeChild(id: number) {
    setChildren(c => c.filter(x => x.id !== id))
  }

  function updateChild(id: number, key: keyof Child, value: string | number) {
    setChildren(c => c.map(x => x.id === id ? { ...x, [key]: value } : x))
  }

  // ─── Navigation ────────────────────────────────────────────────────────────
  function go(n: number) { setScreen(n); window.scrollTo(0, 0) }

  // ─── Screen 0: Household ──────────────────────────────────────────────────
  const renderHousehold = () => (
    <div style={{paddingTop:'1.5rem'}}>
      <div className="section-title">Household information</div>
      <div className="section-sub">Client contact details and date of birth</div>

      <div className="card">
        <div className="card-title">Analysis date</div>
        <div className="field-grid" style={{maxWidth:'220px'}}>
          <div>
            <label>Date</label>
            <input type="date" value={analysisDate} onChange={e => setAnalysisDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Clients</div>
        <div className="person-cols">
          <div>
            <div className="person-header"><span className="person-badge">Person 1</span></div>
            <div className="field-grid">
              <div><label>Full name</label><input type="text" value={p1Name} onChange={e => setP1Name(e.target.value)} placeholder="First Last" /></div>
              <div className="field-grid cols2">
                <div><label>Date of birth</label><input type="date" value={p1Dob} onChange={e => setP1Dob(e.target.value)} /></div>
                <div><label>Age</label><div className="calc-field">{p1Age != null ? p1Age : '—'}</div></div>
              </div>
              <div><label>Phone</label><input type="tel" value={p1Phone} onChange={e => setP1Phone(e.target.value)} placeholder="(555) 000-0000" /></div>
              <div><label>Email</label><input type="email" value={p1Email} onChange={e => setP1Email(e.target.value)} placeholder="email@example.com" /></div>
            </div>
          </div>
          <div>
            <div className="person-header"><span className="person-badge" style={{background:'#F0EEF9',color:'#a89cf7'}}>Person 2</span></div>
            <div className="field-grid">
              <div><label>Full name</label><input type="text" value={p2Name} onChange={e => setP2Name(e.target.value)} placeholder="First Last" /></div>
              <div className="field-grid cols2">
                <div><label>Date of birth</label><input type="date" value={p2Dob} onChange={e => setP2Dob(e.target.value)} /></div>
                <div><label>Age</label><div className="calc-field">{p2Age != null ? p2Age : '—'}</div></div>
              </div>
              <div><label>Phone</label><input type="tel" value={p2Phone} onChange={e => setP2Phone(e.target.value)} placeholder="(555) 000-0000" /></div>
              <div><label>Email</label><input type="email" value={p2Email} onChange={e => setP2Email(e.target.value)} placeholder="email@example.com" /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── Screen 1: Needs ──────────────────────────────────────────────────────
  const renderNeeds = () => {
    const debtP1 = getDebtP1()
    const debtP2 = getDebtP2()
    const childCount = children.length
    const sampleAnnual = children.reduce((s, c) => s + c.annualCost, 0)
    const eduFormula = childCount > 0 ? money(sampleAnnual) + ' × 4 yrs' : '—'

    return (
      <div style={{paddingTop:'1.5rem'}}>
        <div className="section-title">Needs analysis</div>
        <div className="section-sub">Life insurance, income replacement, and retirement needs</div>

        {/* Debt & Obligations */}
        <div className="card">
          <div className="card-title">Debt &amp; obligations</div>

          {/* Marital status */}
          <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'1.25rem',paddingBottom:'1rem',borderBottom:'1px solid #F0EEE9'}}>
            <span style={{fontSize:'13px',color:'var(--text-dim)',fontWeight:500}}>Marital status:</span>
            <div className="toggle-row" style={{maxWidth:'320px',marginBottom:0}}>
              <button className={'toggle-btn'+(maritalStatus==='married'?' active':'')} onClick={() => setMaritalStatus('married')}>Married</button>
              <button className={'toggle-btn'+(maritalStatus==='single1'?' active':'')} onClick={() => setMaritalStatus('single1')}>Single (Person 1)</button>
              <button className={'toggle-btn'+(maritalStatus==='single2'?' active':'')} onClick={() => setMaritalStatus('single2')}>Single (Person 2)</button>
            </div>
            <span style={{fontSize:'12px',color:'var(--text-dim)'}}>
              {maritalStatus==='married' ? 'Married: all debt is shared' : maritalStatus==='single1' ? 'Single — Person 1 only' : 'Single — Person 2 only'}
            </span>
          </div>

          {/* Debt list */}
          {debtItems.length === 0 ? (
            <div style={{textAlign:'center',padding:'1rem 0',color:'var(--text-dim)',fontSize:'13px'}}>No debts added yet. Click below to add.</div>
          ) : (
            debtItems.map((d, i) => (
              <div key={d.id} style={{display:'grid',gridTemplateColumns:maritalStatus==='married'?'1fr 1fr 160px 36px':'1fr 1fr 36px',gap:'10px',alignItems:'end',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.03)'}}>
                <div>
                  {i === 0 && <label>Debt type</label>}
                  <select value={d.type} onChange={e => updateDebt(d.id, 'type', e.target.value)}>
                    <option value="">Select type...</option>
                    {DEBT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  {i === 0 && <label>Amount</label>}
                  <div className="input-wrap">
                    <span className="prefix">$</span>
                    <input type="number" className="dollar" value={d.amount || ''} placeholder="0"
                      onChange={e => updateDebt(d.id, 'amount', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                {maritalStatus === 'married' && (
                  <div>
                    {i === 0 && <label>Belongs to</label>}
                    <select value={d.owner} onChange={e => updateDebt(d.id, 'owner', e.target.value as 'joint'|'p1'|'p2')}>
                      <option value="joint">Joint (shared)</option>
                      <option value="p1">Person 1</option>
                      <option value="p2">Person 2</option>
                    </select>
                  </div>
                )}
                <div style={{display:'flex',alignItems:i===0?'flex-end':'center',paddingBottom:i===0?'2px':'0'}}>
                  <button className="remove-btn" onClick={() => removeDebt(d.id)}>×</button>
                </div>
              </div>
            ))
          )}

          <button className="add-btn" onClick={addDebt}>
            <span style={{fontSize:'18px',lineHeight:1}}>+</span> Add debt item
          </button>

          <div style={{marginTop:'1.25rem',paddingTop:'1rem',borderTop:'1px solid var(--border-dim)',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
            <span style={{fontSize:'14px',fontWeight:600,color:'var(--cream)'}}>Total debt</span>
            <span style={{fontSize:'20px',fontWeight:600,color:'var(--cream)',fontVariantNumeric:'tabular-nums'}}>{money(debtTotal)}</span>
          </div>
          {maritalStatus === 'married' && (
            <div style={{marginTop:'8px'}}>
              <div style={{display:'flex',gap:'2rem',marginTop:'6px'}}>
                <div><span style={{fontSize:'12px',color:'var(--text-dim)'}}>Person 1 debt: </span><span style={{fontSize:'13px',fontWeight:500,color:'#64b0f4'}}>{money(debtP1)}</span></div>
                <div><span style={{fontSize:'12px',color:'var(--text-dim)'}}>Person 2 debt: </span><span style={{fontSize:'13px',fontWeight:500,color:'#a89cf7'}}>{money(debtP2)}</span></div>
              </div>
            </div>
          )}

          {/* Other Obligations */}
          <div style={{marginTop:'1.5rem',paddingTop:'1.25rem',borderTop:'1px solid #F0EEE9'}}>
            <div style={{fontSize:'13px',fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:'1rem'}}>Other obligations</div>

            {/* Funeral */}
            <div style={{marginBottom:'1.25rem'}}>
              <div style={{fontSize:'12px',color:'var(--text-dim)',fontWeight:500,marginBottom:'.75rem'}}>Funeral arrangements</div>
              <div className="person-cols">
                {/* P1 funeral */}
                <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(201,168,76,.09)',borderRadius:'12px',padding:'1rem'}}>
                  <div style={{fontSize:'12px',fontWeight:600,color:'#64b0f4',marginBottom:'.75rem',display:'flex',alignItems:'center',gap:'6px'}}>
                    <span style={{background:'#E6F1FB',color:'#64b0f4',fontSize:'11px',padding:'2px 8px',borderRadius:'20px',fontWeight:600}}>Person 1</span>
                    <span style={{fontWeight:400,color:'var(--text-dim)'}}>{p1Name ? '— ' + p1Name : ''}</span>
                  </div>
                  <div style={{marginBottom:'.75rem'}}>
                    <label>Preference</label>
                    <div className="toggle-row" style={{marginBottom:'.5rem'}}>
                      <button className={'toggle-btn'+(funeralPrefs[1]==='burial'?' active':'')} onClick={() => changeFuneralPref(1,'burial')}>Burial</button>
                      <button className={'toggle-btn'+(funeralPrefs[1]==='cremation'?' active':'')} onClick={() => changeFuneralPref(1,'cremation')}>Cremation</button>
                    </div>
                  </div>
                  {FUNERAL_FIELDS[funeralPrefs[1]].map(f => (
                    <div key={f.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:'1px solid var(--border-dim)'}}>
                      <label style={{margin:0,fontSize:'12px',color:'var(--text-dim)'}}>{f.label}</label>
                      <div className="input-wrap" style={{width:'130px'}}>
                        <span className="prefix">$</span>
                        <input type="number" className="dollar" value={getFuneralValFor(1, f.id, f.default) || ''} placeholder="0"
                          style={{textAlign:'right',paddingRight:'8px',paddingLeft:'20px',fontSize:'13px'}}
                          onChange={e => setFuneralVal(1, f.id, parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  ))}
                  <div style={{marginTop:'.75rem',paddingTop:'.75rem',borderTop:'1px solid var(--border-dim)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'12px',color:'var(--text-dim)'}}>Estimated total</span>
                    <span style={{fontSize:'15px',fontWeight:600,color:'var(--cream)'}}>{money(funeralTotalP1)}</span>
                  </div>
                </div>

                {/* P2 funeral */}
                {!hideP2 && (
                  <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(201,168,76,.09)',borderRadius:'12px',padding:'1rem'}}>
                    <div style={{fontSize:'12px',fontWeight:600,color:'#a89cf7',marginBottom:'.75rem',display:'flex',alignItems:'center',gap:'6px'}}>
                      <span style={{background:'#F0EEF9',color:'#a89cf7',fontSize:'11px',padding:'2px 8px',borderRadius:'20px',fontWeight:600}}>Person 2</span>
                      <span style={{fontWeight:400,color:'var(--text-dim)'}}>{p2Name ? '— ' + p2Name : ''}</span>
                    </div>
                    <div style={{marginBottom:'.75rem'}}>
                      <label>Preference</label>
                      <div className="toggle-row" style={{marginBottom:'.5rem'}}>
                        <button className={'toggle-btn'+(funeralPrefs[2]==='burial'?' active':'')} onClick={() => changeFuneralPref(2,'burial')}>Burial</button>
                        <button className={'toggle-btn'+(funeralPrefs[2]==='cremation'?' active':'')} onClick={() => changeFuneralPref(2,'cremation')}>Cremation</button>
                      </div>
                    </div>
                    {FUNERAL_FIELDS[funeralPrefs[2]].map(f => (
                      <div key={f.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:'1px solid var(--border-dim)'}}>
                        <label style={{margin:0,fontSize:'12px',color:'var(--text-dim)'}}>{f.label}</label>
                        <div className="input-wrap" style={{width:'130px'}}>
                          <span className="prefix">$</span>
                          <input type="number" className="dollar" value={getFuneralValFor(2, f.id, f.default) || ''} placeholder="0"
                            style={{textAlign:'right',paddingRight:'8px',paddingLeft:'20px',fontSize:'13px'}}
                            onChange={e => setFuneralVal(2, f.id, parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                    ))}
                    <div style={{marginTop:'.75rem',paddingTop:'.75rem',borderTop:'1px solid var(--border-dim)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:'12px',color:'var(--text-dim)'}}>Estimated total</span>
                      <span style={{fontSize:'15px',fontWeight:600,color:'var(--cream)'}}>{money(funeralTotalP2)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div style={{marginTop:'.75rem',display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'.75rem 1rem',background:'#F0EEE9',borderRadius:'8px'}}>
                <span style={{fontSize:'13px',fontWeight:600,color:'var(--cream)'}}>Combined funeral total</span>
                <span style={{fontSize:'16px',fontWeight:700,color:'var(--cream)',fontVariantNumeric:'tabular-nums'}}>{money(funeralCombined)}</span>
              </div>
            </div>

            {/* Mortgage */}
            <div style={{marginBottom:'1rem'}}>
              <label>Mortgage payoff</label>
              <div className="input-wrap">
                <span className="prefix">$</span>
                <input type="number" className="dollar" value={mortgagePayoff || ''} placeholder="0"
                  onChange={e => setMortgagePayoff(parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            {/* Education */}
            <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(201,168,76,.09)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
              <div style={{fontSize:'12px',fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:'.875rem'}}>Educational needs</div>
              {children.length === 0 ? (
                <div style={{textAlign:'center',padding:'.75rem 0',color:'var(--text-dim)',fontSize:'13px'}}>No children added. Click below to add.</div>
              ) : (
                children.map((c, i) => (
                  <div key={c.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 32px',gap:'10px',alignItems:'end',padding:'8px 0',borderBottom:'1px solid var(--border-dim)'}}>
                    <div>
                      {i === 0 && <label>Child name</label>}
                      <input type="text" value={c.name} placeholder="Name (optional)"
                        onChange={e => updateChild(c.id, 'name', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label>Annual school cost</label>}
                      <div className="input-wrap">
                        <span className="prefix">$</span>
                        <input type="number" className="dollar" value={c.annualCost || ''} placeholder="0"
                          onChange={e => updateChild(c.id, 'annualCost', parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:i===0?'flex-end':'center'}}>
                      <button className="remove-btn" onClick={() => removeChild(c.id)}>×</button>
                    </div>
                  </div>
                ))
              )}
              <button className="add-btn" style={{marginTop:'.5rem'}} onClick={addChild}>
                <span style={{fontSize:'18px',lineHeight:1}}>+</span> Add child
              </button>
              <div style={{marginTop:'.875rem',paddingTop:'.875rem',borderTop:'1px solid var(--border-dim)'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'.75rem',fontSize:'12px',color:'var(--text-dim)',marginBottom:'.5rem',padding:'0 4px'}}>
                  <span>Children</span><span style={{textAlign:'center'}}>Annual cost × 4 yrs each</span><span style={{textAlign:'right'}}>Total education need</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'.75rem',alignItems:'baseline',padding:'0 4px'}}>
                  <span style={{fontSize:'15px',fontWeight:600,color:'var(--cream)'}}>{childCount === 0 ? '0 children' : childCount === 1 ? '1 child' : childCount + ' children'}</span>
                  <span style={{fontSize:'13px',color:'var(--text-dim)',textAlign:'center'}}>{eduFormula}</span>
                  <span style={{fontSize:'18px',fontWeight:700,color:'var(--cream)',textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{money(eduTotal)}</span>
                </div>
              </div>
            </div>

            {/* Grand total obligations */}
            <div style={{padding:'.875rem 1rem',background:'rgba(201,168,76,.08)',border:'1px solid var(--border)',borderRadius:'12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'13px',fontWeight:600,color:'var(--text-secondary)'}}>Total obligations (incl. debt)</span>
              <span style={{fontSize:'18px',fontWeight:700,color:'var(--gold-light)',fontVariantNumeric:'tabular-nums'}}>{money(totalObligations)}</span>
            </div>
          </div>
        </div>

        {/* Income Replacement */}
        <div className="card">
          <div className="card-title">Income replacement</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
            {/* P1 */}
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'.875rem'}}>
                <span style={{background:'#E6F1FB',color:'#64b0f4',fontSize:'11px',padding:'2px 8px',borderRadius:'20px',fontWeight:600}}>Person 1</span>
                <span style={{fontSize:'12px',color:'var(--text-dim)'}}>{p1Name ? '— ' + p1Name : ''}</span>
              </div>
              <div className="field-grid">
                <div>
                  <label>Annual income</label>
                  <div className="input-wrap">
                    <span className="prefix">$</span>
                    <input type="number" className="dollar" value={annualIncomeP1 || ''} placeholder="0"
                      onChange={e => setAnnualIncomeP1(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                    <label style={{margin:0}}>Income to replace</label>
                    <button onClick={() => setIrOverrideP1(v => !v)}
                      style={{fontSize:'11px',color:irOverrideP1?'#1A7A4A':'#C9A84C',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',padding:0}}>
                      {irOverrideP1 ? 'auto' : 'override'}
                    </button>
                  </div>
                  <div className="input-wrap">
                    <span className="prefix">$</span>
                    <input type="number" className="dollar" value={irP1 || ''} placeholder="auto"
                      readOnly={!irOverrideP1}
                      style={{background:irOverrideP1?'rgba(255,255,255,.08)':'rgba(255,255,255,.04)'}}
                      onChange={e => { if (irOverrideP1) setIrOverrideAmtP1(parseFloat(e.target.value) || 0) }} />
                  </div>
                  <div className="calc-label">{irOverrideP1 ? 'manual override — type a custom amount' : `auto: annual income × ${incomeYearsP1} years`}</div>
                </div>
                <div>
                  <label>Number of years</label>
                  <input type="number" value={incomeYearsP1 || ''} placeholder="10"
                    onChange={e => setIncomeYearsP1(parseFloat(e.target.value) || 10)} />
                </div>
                <div>
                  <label>3% factor result</label>
                  <div className="calc-field">{irP1 ? money(frP1) : '—'}</div>
                  <div className="calc-label">income to replace × 3%</div>
                </div>
              </div>
            </div>

            {/* P2 */}
            {!hideP2 && (
              <div>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'.875rem'}}>
                  <span style={{background:'#F0EEF9',color:'#a89cf7',fontSize:'11px',padding:'2px 8px',borderRadius:'20px',fontWeight:600}}>Person 2</span>
                  <span style={{fontSize:'12px',color:'var(--text-dim)'}}>{p2Name ? '— ' + p2Name : ''}</span>
                </div>
                <div className="field-grid">
                  <div>
                    <label>Annual income</label>
                    <div className="input-wrap">
                      <span className="prefix">$</span>
                      <input type="number" className="dollar" value={annualIncomeP2 || ''} placeholder="0"
                        onChange={e => setAnnualIncomeP2(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                      <label style={{margin:0}}>Income to replace</label>
                      <button onClick={() => setIrOverrideP2(v => !v)}
                        style={{fontSize:'11px',color:irOverrideP2?'#1A7A4A':'#C9A84C',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',padding:0}}>
                        {irOverrideP2 ? 'auto' : 'override'}
                      </button>
                    </div>
                    <div className="input-wrap">
                      <span className="prefix">$</span>
                      <input type="number" className="dollar" value={irP2 || ''} placeholder="auto"
                        readOnly={!irOverrideP2}
                        style={{background:irOverrideP2?'rgba(255,255,255,.08)':'rgba(255,255,255,.04)'}}
                        onChange={e => { if (irOverrideP2) setIrOverrideAmtP2(parseFloat(e.target.value) || 0) }} />
                    </div>
                    <div className="calc-label">{irOverrideP2 ? 'manual override — type a custom amount' : `auto: annual income × ${incomeYearsP2} years`}</div>
                  </div>
                  <div>
                    <label>Number of years</label>
                    <input type="number" value={incomeYearsP2 || ''} placeholder="10"
                      onChange={e => setIncomeYearsP2(parseFloat(e.target.value) || 10)} />
                  </div>
                  <div>
                    <label>3% factor result</label>
                    <div className="calc-field">{irP2 ? money(frP2) : '—'}</div>
                    <div className="calc-label">income to replace × 3%</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div style={{marginTop:'1rem',paddingTop:'1rem',borderTop:'1px solid var(--border-dim)',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
            <span style={{fontSize:'13px',fontWeight:600,color:'var(--cream)'}}>Combined income replacement need</span>
            <span style={{fontSize:'18px',fontWeight:700,color:'var(--cream)',fontVariantNumeric:'tabular-nums'}}>{money(frCombined)}</span>
          </div>
        </div>

        {/* Retirement */}
        <div className="card">
          <div className="card-title">Retirement funding</div>
          <div className="field-grid cols2">
            <div>
              <label>Retirement funding needed</label>
              <div className="input-wrap">
                <span className="prefix">$</span>
                <input type="number" className="dollar" value={retirementNeed || ''} placeholder="0"
                  onChange={e => setRetirementNeed(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>
        </div>

        {/* Life Insurance */}
        <div className="card">
          <div className="card-title">Life insurance needed</div>
          <div className="person-cols">
            {/* P1 LI */}
            <div>
              <div className="person-header">
                <span className="person-badge">Person 1</span>
                <span style={{fontSize:'12px',color:'var(--text-dim)',fontWeight:400}}>{p1Name ? '— ' + p1Name : ''}</span>
              </div>
              <div className="field-grid">
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                    <label style={{margin:0}}>Total life insurance needed</label>
                    <button onClick={() => setLiOverrideP1(v => !v)}
                      style={{fontSize:'11px',color:liOverrideP1?'#1A7A4A':'#C9A84C',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',padding:0}}>
                      {liOverrideP1 ? 'auto' : 'override'}
                    </button>
                  </div>
                  <div className="input-wrap">
                    <span className="prefix">$</span>
                    <input type="number" className="dollar" value={liNeededP1 || ''} placeholder="auto"
                      readOnly={!liOverrideP1}
                      style={{background:liOverrideP1?'rgba(255,255,255,.08)':'rgba(255,255,255,.04)'}}
                      onChange={e => { if (liOverrideP1) setLiOverrideAmtP1(parseFloat(e.target.value) || 0) }} />
                  </div>
                  <div className="calc-label">{liOverrideP1 ? 'manual override — type a custom amount' : 'obligations share + income replacement + retirement'}</div>
                </div>
                <div className="breakdown-box">
                  {liCalcP1 > 0 ? (
                    <>
                      <div className="breakdown-row"><span>Obligations share</span><span style={{fontWeight:500,color:'var(--cream)'}}>{money(obligP1)}</span></div>
                      <div className="breakdown-row"><span>Income replacement</span><span style={{fontWeight:500,color:'var(--cream)'}}>{money(irP1)}</span></div>
                      <div className="breakdown-row"><span>Retirement need</span><span style={{fontWeight:500,color:'var(--cream)'}}>{money(retirementNeed)}</span></div>
                    </>
                  ) : (
                    <span style={{color:'#C2BFB8'}}>Enter values above to see breakdown</span>
                  )}
                </div>
                <div>
                  <label>Current face amount</label>
                  <div className="input-wrap">
                    <span className="prefix">$</span>
                    <input type="number" className="dollar" value={currentFaceP1 || ''} placeholder="0"
                      onChange={e => setCurrentFaceP1(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div>
                  <label>Additional face needed</label>
                  <div className="calc-field" style={{fontSize:'16px',fontWeight:600}}>{addFaceP1 > 0 ? money(addFaceP1) : '$0'}</div>
                </div>
              </div>
            </div>

            {/* P2 LI */}
            {!hideP2 && (
              <div>
                <div className="person-header">
                  <span className="person-badge p2">Person 2</span>
                  <span style={{fontSize:'12px',color:'var(--text-dim)',fontWeight:400}}>{p2Name ? '— ' + p2Name : ''}</span>
                </div>
                <div className="field-grid">
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                      <label style={{margin:0}}>Total life insurance needed</label>
                      <button onClick={() => setLiOverrideP2(v => !v)}
                        style={{fontSize:'11px',color:liOverrideP2?'#1A7A4A':'#C9A84C',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',padding:0}}>
                        {liOverrideP2 ? 'auto' : 'override'}
                      </button>
                    </div>
                    <div className="input-wrap">
                      <span className="prefix">$</span>
                      <input type="number" className="dollar" value={liNeededP2 || ''} placeholder="auto"
                        readOnly={!liOverrideP2}
                        style={{background:liOverrideP2?'rgba(255,255,255,.08)':'rgba(255,255,255,.04)'}}
                        onChange={e => { if (liOverrideP2) setLiOverrideAmtP2(parseFloat(e.target.value) || 0) }} />
                    </div>
                    <div className="calc-label">{liOverrideP2 ? 'manual override — type a custom amount' : 'obligations share + income replacement + retirement'}</div>
                  </div>
                  <div className="breakdown-box">
                    {liCalcP2 > 0 ? (
                      <>
                        <div className="breakdown-row"><span>Obligations share</span><span style={{fontWeight:500,color:'var(--cream)'}}>{money(obligP2)}</span></div>
                        <div className="breakdown-row"><span>Income replacement</span><span style={{fontWeight:500,color:'var(--cream)'}}>{money(irP2)}</span></div>
                        <div className="breakdown-row"><span>Retirement need</span><span style={{fontWeight:500,color:'var(--cream)'}}>{money(retirementNeed)}</span></div>
                      </>
                    ) : (
                      <span style={{color:'#C2BFB8'}}>Enter values above to see breakdown</span>
                    )}
                  </div>
                  <div>
                    <label>Current face amount</label>
                    <div className="input-wrap">
                      <span className="prefix">$</span>
                      <input type="number" className="dollar" value={currentFaceP2 || ''} placeholder="0"
                        onChange={e => setCurrentFaceP2(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div>
                    <label>Additional face needed</label>
                    <div className="calc-field" style={{fontSize:'16px',fontWeight:600}}>{addFaceP2 > 0 ? money(addFaceP2) : '$0'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Screen 2: Budget ─────────────────────────────────────────────────────
  const renderBudget = () => (
    <div style={{paddingTop:'1.5rem'}}>
      <div className="section-title">Monthly budget</div>
      <div className="section-sub">Income, expenses, and affordable premium</div>

      <div className="card">
        <div className="card-title">Income &amp; expenses</div>
        <div className="field-grid cols2">
          <div>
            <label>Net monthly income</label>
            <div className="input-wrap"><span className="prefix">$</span>
              <input type="number" className="dollar" value={netIncome || ''} placeholder="0"
                onChange={e => setNetIncome(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <label>Total monthly expenses</label>
            <div className="input-wrap"><span className="prefix">$</span>
              <input type="number" className="dollar" value={totalExpenses || ''} placeholder="0"
                onChange={e => setTotalExpenses(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <label>Monthly discretionary income</label>
            <div className="calc-field" style={{fontSize:'18px',color:discretionary<0?'#B91C1C':discretionary>0?'#1A7A4A':'var(--cream)'}}>{money(discretionary)}</div>
            <div className="calc-label">net income − expenses</div>
          </div>
          <div>
            <label>How much can you afford / month</label>
            <div className="input-wrap"><span className="prefix">$</span>
              <input type="number" className="dollar" value={affordable || ''} placeholder="0"
                onChange={e => setAffordable(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Current contributions &amp; premiums</div>
        <div className="person-cols">
          {/* P1 */}
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'.875rem'}}>
              <span style={{background:'#E6F1FB',color:'#64b0f4',fontSize:'11px',padding:'2px 8px',borderRadius:'20px',fontWeight:600}}>Person 1</span>
              <span style={{fontSize:'12px',color:'var(--text-dim)'}}>{p1Name}</span>
            </div>
            <div className="field-grid">
              <div>
                <label>Employee contribution %</label>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <input type="number" value={contribPctP1 || ''} min={0} max={100} step={0.5} placeholder="6"
                    style={{width:'80px'}} onChange={e => setContribPctP1(parseFloat(e.target.value) || 0)} />
                  <span style={{fontSize:'13px',color:'var(--text-dim)'}}>% of annual income</span>
                </div>
              </div>
              <div>
                <label>Employer match %</label>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <input type="number" value={matchPctP1 || ''} min={0} max={100} step={0.5} placeholder="3"
                    style={{width:'80px'}} onChange={e => setMatchPctP1(parseFloat(e.target.value) || 0)} />
                  <span style={{fontSize:'13px',color:'var(--text-dim)'}}>% match</span>
                </div>
              </div>
              <div className="breakdown-box">
                <div className="breakdown-row"><span>Employee ($/mo)</span><span style={{fontWeight:500,color:'var(--cream)'}}>{money(contribEmpP1)}</span></div>
                <div className="breakdown-row"><span>Employer match ($/mo)</span><span style={{fontWeight:500,color:'var(--cream)'}}>{money(contribMatchP1)}</span></div>
                <div className="breakdown-row"><span>Total monthly</span><span style={{fontWeight:600,color:'var(--cream)'}}>{money(contribTotalP1)}</span></div>
              </div>
              <div>
                <label>Life insurance premium ($/mo)</label>
                <div className="input-wrap"><span className="prefix">$</span>
                  <input type="number" className="dollar" value={liPremiumP1 || ''} placeholder="0"
                    onChange={e => setLiPremiumP1(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          </div>

          {/* P2 */}
          {!hideP2 && (
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'.875rem'}}>
                <span style={{background:'#F0EEF9',color:'#a89cf7',fontSize:'11px',padding:'2px 8px',borderRadius:'20px',fontWeight:600}}>Person 2</span>
                <span style={{fontSize:'12px',color:'var(--text-dim)'}}>{p2Name}</span>
              </div>
              <div className="field-grid">
                <div>
                  <label>Employee contribution %</label>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <input type="number" value={contribPctP2 || ''} min={0} max={100} step={0.5} placeholder="6"
                      style={{width:'80px'}} onChange={e => setContribPctP2(parseFloat(e.target.value) || 0)} />
                    <span style={{fontSize:'13px',color:'var(--text-dim)'}}>% of annual income</span>
                  </div>
                </div>
                <div>
                  <label>Employer match %</label>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <input type="number" value={matchPctP2 || ''} min={0} max={100} step={0.5} placeholder="3"
                      style={{width:'80px'}} onChange={e => setMatchPctP2(parseFloat(e.target.value) || 0)} />
                    <span style={{fontSize:'13px',color:'var(--text-dim)'}}>% match</span>
                  </div>
                </div>
                <div className="breakdown-box">
                  <div className="breakdown-row"><span>Employee ($/mo)</span><span style={{fontWeight:500,color:'var(--cream)'}}>{money(contribEmpP2)}</span></div>
                  <div className="breakdown-row"><span>Employer match ($/mo)</span><span style={{fontWeight:500,color:'var(--cream)'}}>{money(contribMatchP2)}</span></div>
                  <div className="breakdown-row"><span>Total monthly</span><span style={{fontWeight:600,color:'var(--cream)'}}>{money(contribTotalP2)}</span></div>
                </div>
                <div>
                  <label>Life insurance premium ($/mo)</label>
                  <div className="input-wrap"><span className="prefix">$</span>
                    <input type="number" className="dollar" value={liPremiumP2 || ''} placeholder="0"
                      onChange={e => setLiPremiumP2(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{marginTop:'1rem',paddingTop:'1rem',borderTop:'1px solid var(--border-dim)',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem'}}>
          <div>
            <div style={{fontSize:'12px',color:'var(--text-dim)',marginBottom:'3px'}}>Total contributions ($/mo)</div>
            <div style={{fontSize:'17px',fontWeight:600,color:'var(--cream)'}}>{money(iraContribTotal)}</div>
          </div>
          <div>
            <div style={{fontSize:'12px',color:'var(--text-dim)',marginBottom:'3px'}}>Total LI premiums ($/mo)</div>
            <div style={{fontSize:'17px',fontWeight:600,color:'var(--cream)'}}>{money(liPremiumTotal)}</div>
          </div>
          <div>
            <div style={{fontSize:'12px',color:'var(--text-dim)',marginBottom:'3px'}}>Annual tax refund</div>
            <div className="input-wrap"><span className="prefix">$</span>
              <input type="number" className="dollar" value={taxRefundAnnual || ''} placeholder="0"
                onChange={e => setTaxRefundAnnual(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="calc-label">÷ 12 = {taxRefundMonthly > 0 ? money(taxRefundMonthly) + '/mo' : '—'}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Retirement budget</div>
        <div className="field-grid cols2">
          <div>
            <label>Retirement monthly budget</label>
            <div className="input-wrap"><span className="prefix">$</span>
              <input type="number" className="dollar" value={retBudget || ''} placeholder="0"
                onChange={e => setRetBudget(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── Screen 3: Assets ─────────────────────────────────────────────────────
  const renderAssets = () => (
    <div style={{paddingTop:'1.5rem'}}>
      <div className="section-title">Assets &amp; savings</div>
      <div className="section-sub">Retirement accounts, savings, and movability</div>

      <div className="card">
        <div className="card-title">Asset values</div>
        <div className="person-cols">
          {/* P1 */}
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'.875rem'}}>
              <span style={{background:'#E6F1FB',color:'#64b0f4',fontSize:'11px',padding:'2px 8px',borderRadius:'20px',fontWeight:600}}>Person 1</span>
              <span style={{fontSize:'12px',color:'var(--text-dim)'}}>{p1Name}</span>
            </div>
            <div className="field-grid">
              <div>
                <label>Qualified funds (IRA, 401k, etc.)</label>
                <div className="input-wrap"><span className="prefix">$</span>
                  <input type="number" className="dollar" value={qualifiedP1 || ''} placeholder="0"
                    onChange={e => setQualifiedP1(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div>
                <label>Non-qualified funds</label>
                <div className="input-wrap"><span className="prefix">$</span>
                  <input type="number" className="dollar" value={nonqualifiedP1 || ''} placeholder="0"
                    onChange={e => setNonqualifiedP1(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div>
                <label>Funds movable?</label>
                <div className="toggle-row" style={{marginBottom:0}}>
                  <button className={'toggle-btn'+(movableP1?' active':'')} onClick={() => setMovableP1(true)}>Yes</button>
                  <button className={'toggle-btn'+(!movableP1?' active':'')} onClick={() => setMovableP1(false)}>No</button>
                </div>
              </div>
              <div>
                <label>Person 1 total</label>
                <div className="calc-field">{money(assetsP1)}</div>
              </div>
            </div>
          </div>

          {/* P2 */}
          {!hideP2 && (
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'.875rem'}}>
                <span style={{background:'#F0EEF9',color:'#a89cf7',fontSize:'11px',padding:'2px 8px',borderRadius:'20px',fontWeight:600}}>Person 2</span>
                <span style={{fontSize:'12px',color:'var(--text-dim)'}}>{p2Name}</span>
              </div>
              <div className="field-grid">
                <div>
                  <label>Qualified funds (IRA, 401k, etc.)</label>
                  <div className="input-wrap"><span className="prefix">$</span>
                    <input type="number" className="dollar" value={qualifiedP2 || ''} placeholder="0"
                      onChange={e => setQualifiedP2(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div>
                  <label>Non-qualified funds</label>
                  <div className="input-wrap"><span className="prefix">$</span>
                    <input type="number" className="dollar" value={nonqualifiedP2 || ''} placeholder="0"
                      onChange={e => setNonqualifiedP2(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div>
                  <label>Funds movable?</label>
                  <div className="toggle-row" style={{marginBottom:0}}>
                    <button className={'toggle-btn'+(movableP2?' active':'')} onClick={() => setMovableP2(true)}>Yes</button>
                    <button className={'toggle-btn'+(!movableP2?' active':'')} onClick={() => setMovableP2(false)}>No</button>
                  </div>
                </div>
                <div>
                  <label>Person 2 total</label>
                  <div className="calc-field">{money(assetsP2)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{marginTop:'1rem',paddingTop:'1rem',borderTop:'1px solid var(--border-dim)',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem'}}>
          <div>
            <div style={{fontSize:'12px',color:'var(--text-dim)',marginBottom:'3px'}}>Total qualified</div>
            <div style={{fontSize:'17px',fontWeight:600,color:'var(--cream)'}}>{money(totalQualified)}</div>
          </div>
          <div>
            <div style={{fontSize:'12px',color:'var(--text-dim)',marginBottom:'3px'}}>Total non-qualified</div>
            <div style={{fontSize:'17px',fontWeight:600,color:'var(--cream)'}}>{money(totalNonQualified)}</div>
          </div>
          <div>
            <div style={{fontSize:'12px',color:'var(--text-dim)',marginBottom:'3px'}}>Total assets</div>
            <div style={{fontSize:'17px',fontWeight:600,color:'var(--cream)'}}>{money(totalAssets)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Notes &amp; calculations</div>
        <textarea value={notes} placeholder="Enter any additional notes, observations, or calc details..." rows={5}
          onChange={e => setNotes(e.target.value)} />
      </div>
    </div>
  )

  // ─── Screen 4: Summary ────────────────────────────────────────────────────
  const renderSummary = () => {
    const clientName = [p1Name, p2Name].filter(Boolean).join(' & ') || '—'
    const dateDisplay = analysisDate
      ? new Date(analysisDate + 'T12:00:00').toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})
      : ''
    const disc = netIncome - totalExpenses
    const curFace = currentFaceP1 + currentFaceP2
    const addFaceTotal = (liNeededP1 - currentFaceP1) + (hideP2 ? 0 : liNeededP2 - currentFaceP2)
    const movableText = (movableP1 ? 'P1: Yes' : 'P1: No') + (!hideP2 ? ' / ' + (movableP2 ? 'P2: Yes' : 'P2: No') : '')

    return (
      <div className="summary-wrap" style={{padding:'1.5rem 0 4rem'}}>
        <div className="print-controls no-print">
          <button className="btn primary" onClick={() => window.print()}>Print / Save PDF</button>
          <button className="btn" onClick={() => go(0)}>Edit intake</button>
          <span style={{fontSize:'12px',color:'var(--text-dim)',marginLeft:'8px'}}>Use browser Print → Save as PDF for best results</span>
        </div>

        <div className="summary-header">
          <div>
            <div className="summary-title">Wants Analysis</div>
            <div className="summary-client">{clientName}</div>
            <div className="summary-date">{dateDisplay}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div className="summary-firm">Financial Advisor</div>
            <div style={{fontSize:'13px',color:'var(--cream)',fontWeight:500,marginTop:'2px'}}>Confidential</div>
          </div>
        </div>

        <div className="summary-grid">
          {/* Family income & expenses */}
          <div className="summary-card">
            <div className="summary-card-title">Family income &amp; expenses</div>
            <div className="summary-row"><span className="summary-row-label">Total debt obligations</span><span className="summary-row-value">{money(debtTotal)}</span></div>
            <div className="summary-row"><span className="summary-row-label">Funeral expenses (combined)</span><span className="summary-row-value">{money(funeralCombined)}</span></div>
            <div className="summary-row"><span className="summary-row-label">Educational needs</span><span className="summary-row-value">{money(eduTotal)}</span></div>
            <div className="summary-row"><span className="summary-row-label">Total monthly income</span><span className="summary-row-value">{money(netIncome)}</span></div>
            <div className="summary-row"><span className="summary-row-label">Total monthly expenses</span><span className="summary-row-value">{money(totalExpenses)}</span></div>
            <div className="summary-row total">
              <span className="summary-row-label">Discretionary income</span>
              <span className="summary-row-value" style={{color:disc<0?'#B91C1C':'var(--gold-light)'}}>{money(disc)}</span>
            </div>
          </div>

          {/* Life Insurance */}
          <div className="summary-card">
            <div className="summary-card-title">Life insurance analysis</div>
            <div className="summary-row"><span className="summary-row-label">Needed — Person 1</span><span className="summary-row-value">{money(liNeededP1)}</span></div>
            <div className="summary-row"><span className="summary-row-label">Needed — Person 2</span><span className="summary-row-value">{money(hideP2 ? 0 : liNeededP2)}</span></div>
            <div className="summary-row"><span className="summary-row-label">Current face amount</span><span className="summary-row-value">{money(curFace)}</span></div>
            <div className="summary-row total"><span className="summary-row-label">Additional face needed</span><span className="summary-row-value">{money(Math.max(0, addFaceTotal))}</span></div>
          </div>

          {/* Monthly Budget */}
          <div className="summary-card full">
            <div className="summary-card-title">Retirement &amp; life insurance monthly budget</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 2rem'}}>
              <div>
                <div className="summary-row"><span className="summary-row-label">Retirement monthly budget</span><span className="summary-row-value">{money(retBudget)}</span></div>
                <div className="summary-row"><span className="summary-row-label">Current plans / IRA / 401k</span><span className="summary-row-value">{money(iraContribTotal)}</span></div>
                <div className="summary-row"><span className="summary-row-label">Additional contribution</span><span className="summary-row-value">{money(affordable)}</span></div>
              </div>
              <div>
                <div className="summary-row"><span className="summary-row-label">Life insurance premiums</span><span className="summary-row-value">{money(liPremiumTotal)}</span></div>
                <div className="summary-row"><span className="summary-row-label">Tax return / other</span><span className="summary-row-value">{money(taxRefundMonthly)}</span></div>
                <div className="summary-row total"><span className="summary-row-label">Monthly total</span><span className="summary-row-value">{money(sumMonthlyTotal)}</span></div>
              </div>
            </div>
          </div>

          {/* Assets */}
          <div className="summary-card">
            <div className="summary-card-title">Assets &amp; savings</div>
            <div className="summary-row"><span className="summary-row-label">Qualified plans</span><span className="summary-row-value">{money(totalQualified)}</span></div>
            <div className="summary-row"><span className="summary-row-label">Non-qualified plans</span><span className="summary-row-value">{money(totalNonQualified)}</span></div>
            <div className="summary-row total"><span className="summary-row-label">Total assets</span><span className="summary-row-value">{money(totalAssets)}</span></div>
            <div style={{marginTop:'12px',fontSize:'12px',color:'var(--text-dim)'}}>Funds movable: <span style={{color:'var(--cream)',fontWeight:500}}>{movableText}</span></div>
          </div>

          {/* Notes */}
          <div className="summary-card">
            <div className="summary-card-title">Notes</div>
            <div className="notes-display">{notes || '—'}</div>
          </div>
        </div>
      </div>
    )
  }

  const screenContent = [renderHousehold, renderNeeds, renderBudget, renderAssets, renderSummary]

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="wa-wrap">
      <style>{WA_CSS}</style>

      {/* Nav */}
      <nav className="wa-nav">
        <div className="wa-nav-logo">
          <div className="wa-nav-logo-icon">📋</div>
          <div>
            <div className="wa-nav-logo-text">Financial Shield</div>
            <div className="wa-nav-logo-sub">Wants Analysis</div>
          </div>
        </div>
        <div className="wa-nav-steps">
          {SCREENS.map((s, i) => (
            <button key={s} className={'wa-nav-step' + (i === screen ? ' active' : i < screen ? ' done' : '')}
              onClick={() => go(i)}>
              {i + 1} · {s}
            </button>
          ))}
        </div>
        <div className="wa-nav-right">
          <button className="btn-nav" onClick={() => go(Math.max(0, screen - 1))}>Back</button>
          <button className="btn-nav gold" onClick={() => go(Math.min(4, screen + 1))}>Save &amp; Continue</button>
        </div>
      </nav>

      {/* Screen content */}
      <div className="wa-screen">
        {screenContent[screen]()}
      </div>
    </div>
  )
}
