import { useState, useEffect, useRef, useCallback } from 'react'
import { useClient } from '../../context/ClientContext'
// unused import removed: calcAge '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

type MaritalStatus = 'married' | 'single1' | 'single2'
type FuneralType = 'burial' | 'cremation'
type DebtOwner = 'joint' | 'p1' | 'p2'

interface DebtItem {
  id: number
  type: string
  owner: DebtOwner
  balance: number
}

interface Child {
  id: number
  name: string
  annualCost: number
}

interface FuneralPrefs {
  1: FuneralType
  2: FuneralType
}

const DEBT_TYPES = ['Credit card', 'Auto loan', 'Student loan', 'Personal loan', 'Medical debt', 'Tax debt', 'Business loan', 'Line of credit', 'Other']

const FUNERAL_FIELDS = {
  burial: [
    { id: 'casket', label: 'Casket', default: 10000 },
    { id: 'burial-plot', label: 'Burial plot', default: 6000 },
    { id: 'headstone', label: 'Headstone / marker', default: 4000 },
    { id: 'funeral-service', label: 'Funeral service & director', default: 3500 },
    { id: 'burial-other', label: 'Other (flowers, transport, etc.)', default: 1500 },
  ],
  cremation: [
    { id: 'cremation-fee', label: 'Cremation fee', default: 4500 },
    { id: 'urn', label: 'Urn', default: 500 },
    { id: 'memorial-service', label: 'Memorial service', default: 3500 },
    { id: 'cremation-other', label: 'Other (death certificates, misc.)', default: 1500 },
  ],
}

const SCREENS = ['Household', 'Needs', 'Budget', 'Assets', 'Summary']

function money(n: number) {
  return '$' + Math.round(n).toLocaleString()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-navy rounded-xl border border-gold/15 overflow-hidden mb-5">
      <div className="px-5 py-3 border-b border-gold/10 bg-navy-mid">
        <h3 className="text-cream text-sm font-medium">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function InputField({
  label, value, onChange, prefix = '$', placeholder = '0',
}: {
  label: string; value: number | string; onChange: (v: number) => void; prefix?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-dim mb-1.5">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold text-sm">{prefix}</span>}
        <input
          type="text"
          value={value === 0 ? '' : String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          onChange={e => {
            const raw = e.target.value.replace(/,/g, '')
            onChange(parseFloat(raw) || 0)
          }}
          className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg pl-7 pr-3 py-2.5 text-cream text-sm"
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function WantsAnalysisPage() {
  const { activeClient, saveToolData } = useClient()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [screen, setScreen] = useState(0)
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>('married')

  // Household
  const [p1Name, setP1Name] = useState('')
  const [p2Name, setP2Name] = useState('')
  const [p1Dob, setP1Dob] = useState('')
  const [p2Dob, setP2Dob] = useState('')

  // Needs
  const [debtItems, setDebtItems] = useState<DebtItem[]>([])
  const [funeralPrefs, setFuneralPrefs] = useState<FuneralPrefs>({ 1: 'burial', 2: 'burial' })
  const [funeralValues, setFuneralValues] = useState<Record<string, number>>({})
  const [mortgagePayoff, setMortgagePayoff] = useState(0)
  const [children, setChildren] = useState<Child[]>([])

  // Budget
  const [annualIncomeP1, setAnnualIncomeP1] = useState(0)
  const [annualIncomeP2, setAnnualIncomeP2] = useState(0)
  const [monthlyExpenses, setMonthlyExpenses] = useState(0)
  const [incomeYearsP1, setIncomeYearsP1] = useState(10)
  const [incomeYearsP2, setIncomeYearsP2] = useState(10)
  const [incomeReplaceP1Override, setIncomeReplaceP1Override] = useState(false)
  const [incomeReplaceP1, setIncomeReplaceP1] = useState(0)
  const [incomeReplaceP2Override, setIncomeReplaceP2Override] = useState(false)
  const [incomeReplaceP2, setIncomeReplaceP2] = useState(0)
  const [monthly401k, setMonthly401k] = useState(0)
  const [monthlyRoth, setMonthlyRoth] = useState(0)

  // Assets
  const [qualifiedBalance, setQualifiedBalance] = useState(0)
  const [nonQualBalance, setNonQualBalance] = useState(0)
  const [existingLifeP1, setExistingLifeP1] = useState(0)
  const [existingLifeP2, setExistingLifeP2] = useState(0)
  const [liNeededP1Override, setLiNeededP1Override] = useState(false)
  const [liNeededP1, setLiNeededP1] = useState(0)
  const [liNeededP2Override, setLiNeededP2Override] = useState(false)
  const [liNeededP2, setLiNeededP2] = useState(0)

  // Load from client
  useEffect(() => {
    if (!activeClient) return
    if (activeClient.first_name) setP1Name(activeClient.first_name + ' ' + activeClient.last_name)
    if (activeClient.date_of_birth) setP1Dob(activeClient.date_of_birth)
    if (activeClient.spouse_name) setP2Name(activeClient.spouse_name)
    if (activeClient.spouse_dob) setP2Dob(activeClient.spouse_dob)
    if (activeClient.monthly_expenses) setMonthlyExpenses(activeClient.monthly_expenses)
    if (activeClient.annual_income_p1) setAnnualIncomeP1(activeClient.annual_income_p1)
    if (activeClient.annual_income_p2) setAnnualIncomeP2(activeClient.annual_income_p2)

    const saved = activeClient.wants_analysis_data as Record<string, unknown>
    if (saved && Object.keys(saved).length > 0) {
      if (saved.maritalStatus) setMaritalStatus(saved.maritalStatus as MaritalStatus)
      if (saved.debtItems) setDebtItems(saved.debtItems as DebtItem[])
      if (saved.funeralPrefs) setFuneralPrefs(saved.funeralPrefs as FuneralPrefs)
      if (saved.funeralValues) setFuneralValues(saved.funeralValues as Record<string, number>)
      if (saved.mortgagePayoff) setMortgagePayoff(saved.mortgagePayoff as number)
      if (saved.children) setChildren(saved.children as Child[])
      if (saved.incomeReplaceP1) setIncomeReplaceP1(saved.incomeReplaceP1 as number)
      if (saved.incomeReplaceP2) setIncomeReplaceP2(saved.incomeReplaceP2 as number)
      if (saved.qualifiedBalance) setQualifiedBalance(saved.qualifiedBalance as number)
      if (saved.nonQualBalance) setNonQualBalance(saved.nonQualBalance as number)
      if (saved.existingLifeP1) setExistingLifeP1(saved.existingLifeP1 as number)
      if (saved.existingLifeP2) setExistingLifeP2(saved.existingLifeP2 as number)
    }
  }, [activeClient?.id])

  // Auto-calculate income replacement when not overridden
  useEffect(() => {
    if (!incomeReplaceP1Override) setIncomeReplaceP1(annualIncomeP1 * incomeYearsP1)
  }, [annualIncomeP1, incomeYearsP1, incomeReplaceP1Override])

  useEffect(() => {
    if (!incomeReplaceP2Override) setIncomeReplaceP2(annualIncomeP2 * incomeYearsP2)
  }, [annualIncomeP2, incomeYearsP2, incomeReplaceP2Override])

  // Calculations
  function getFuneralTotal(person: 1 | 2): number {
    const type = funeralPrefs[person]
    return FUNERAL_FIELDS[type].reduce((sum, f) => {
      return sum + (funeralValues[`p${person}-${f.id}`] ?? f.default)
    }, 0)
  }

  function getEducationTotal(): number {
    return children.reduce((s, c) => s + c.annualCost * 4, 0)
  }

  function getTotalDebt(): number {
    return debtItems.reduce((s, d) => s + d.balance, 0)
  }

  function getTotalObligations(): number {
    const funeral = getFuneralTotal(1) + (maritalStatus !== 'single2' ? getFuneralTotal(2) : 0)
    return funeral + getEducationTotal() + mortgagePayoff + getTotalDebt()
  }

  function getLiNeededAuto(person: 1 | 2): number {
    const obligationsShare = getTotalObligations() * 0.5
    const ir = person === 1 ? incomeReplaceP1 : incomeReplaceP2
    return Math.max(0, obligationsShare + ir - (qualifiedBalance + nonQualBalance) * 0.5)
  }

  const liNeededP1Calc = liNeededP1Override ? liNeededP1 : getLiNeededAuto(1)
  const liNeededP2Calc = liNeededP2Override ? liNeededP2 : getLiNeededAuto(2)

  const scheduleSave = useCallback(() => {
    if (!activeClient) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveToolData('wants_analysis_data', {
        maritalStatus, p1Name, p2Name, debtItems, funeralPrefs, funeralValues,
        mortgagePayoff, children, annualIncomeP1, annualIncomeP2, monthlyExpenses,
        incomeYearsP1, incomeYearsP2, incomeReplaceP1, incomeReplaceP2,
        monthly401k, monthlyRoth, qualifiedBalance, nonQualBalance,
        existingLifeP1, existingLifeP2, liNeededP1: liNeededP1Calc, liNeededP2: liNeededP2Calc,
        savedAt: new Date().toISOString(),
      })
    }, 2000)
  }, [activeClient, maritalStatus, debtItems, funeralPrefs, funeralValues, mortgagePayoff,
    children, annualIncomeP1, annualIncomeP2, monthlyExpenses, incomeReplaceP1, incomeReplaceP2,
    qualifiedBalance, nonQualBalance, existingLifeP1, existingLifeP2])

  function setFuneralValue(person: 1 | 2, fieldId: string, value: number) {
    setFuneralValues(v => ({ ...v, [`p${person}-${fieldId}`]: value }))
    scheduleSave()
  }

  function addDebt() {
    setDebtItems(d => [...d, { id: Date.now(), type: 'Credit card', owner: 'joint', balance: 0 }])
  }

  function removeDebt(id: number) {
    setDebtItems(d => d.filter(x => x.id !== id))
    scheduleSave()
  }

  function updateDebt(id: number, key: keyof DebtItem, value: string | number) {
    setDebtItems(d => d.map(x => x.id === id ? { ...x, [key]: value } : x))
    scheduleSave()
  }

  function addChild() {
    setChildren(c => [...c, { id: Date.now(), name: '', annualCost: 0 }])
  }

  function removeChild(id: number) {
    setChildren(c => c.filter(x => x.id !== id))
    scheduleSave()
  }

  // ─── Screen Renders ──────────────────────────────────────────────────────────

  const renderHousehold = () => (
    <div className="space-y-5">
      <Section title="Marital Status">
        <div className="flex gap-3">
          {(['married', 'single1', 'single2'] as MaritalStatus[]).map(s => (
            <button
              key={s}
              onClick={() => { setMaritalStatus(s); scheduleSave() }}
              className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                maritalStatus === s
                  ? 'bg-gold/15 border-gold/50 text-gold font-medium'
                  : 'border-gold/15 text-dim hover:border-gold/30'
              }`}
            >
              {s === 'married' ? 'Married / Joint' : s === 'single1' ? 'Single (Person 1)' : 'Single (Person 2)'}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Person 1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-dim mb-1.5">Full Name</label>
            <input value={p1Name} onChange={e => { setP1Name(e.target.value); scheduleSave() }}
              className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg px-3 py-2.5 text-cream text-sm"
              placeholder="John Smith" />
          </div>
          <div>
            <label className="block text-xs text-dim mb-1.5">Date of Birth</label>
            <input type="date" value={p1Dob} onChange={e => { setP1Dob(e.target.value); scheduleSave() }}
              className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg px-3 py-2.5 text-cream text-sm" />
          </div>
        </div>
      </Section>

      {maritalStatus === 'married' && (
        <Section title="Person 2 (Spouse)">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-dim mb-1.5">Full Name</label>
              <input value={p2Name} onChange={e => { setP2Name(e.target.value); scheduleSave() }}
                className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg px-3 py-2.5 text-cream text-sm"
                placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-xs text-dim mb-1.5">Date of Birth</label>
              <input type="date" value={p2Dob} onChange={e => { setP2Dob(e.target.value); scheduleSave() }}
                className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg px-3 py-2.5 text-cream text-sm" />
            </div>
          </div>
        </Section>
      )}
    </div>
  )

  const renderNeeds = () => (
    <div className="space-y-5">
      {/* Funeral */}
      {([1, 2] as const).filter(p => p === 1 || maritalStatus === 'married').map(person => (
        <Section key={person} title={`Funeral — ${person === 1 ? p1Name || 'Person 1' : p2Name || 'Person 2'}`}>
          <div className="flex gap-2 mb-4">
            {(['burial', 'cremation'] as FuneralType[]).map(t => (
              <button
                key={t}
                onClick={() => { setFuneralPrefs(p => ({ ...p, [person]: t })); scheduleSave() }}
                className={`px-4 py-1.5 rounded-lg text-xs border transition-all capitalize ${
                  funeralPrefs[person] === t
                    ? 'bg-gold/15 border-gold/50 text-gold font-medium'
                    : 'border-gold/15 text-dim hover:border-gold/30'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {FUNERAL_FIELDS[funeralPrefs[person]].map(f => (
              <div key={f.id} className="flex items-center justify-between py-1.5 border-b border-gold/5 last:border-0">
                <span className="text-dim text-sm">{f.label}</span>
                <div className="relative w-36">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold text-xs">$</span>
                  <input
                    type="text"
                    value={(funeralValues[`p${person}-${f.id}`] ?? f.default).toLocaleString()}
                    onChange={e => setFuneralValue(person, f.id, parseFloat(e.target.value.replace(/,/g, '')) || 0)}
                    className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg pl-6 pr-3 py-1.5 text-cream text-xs text-right"
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-2 text-sm font-medium">
              <span className="text-dim">Total Funeral</span>
              <span className="text-gold">{money(getFuneralTotal(person))}</span>
            </div>
          </div>
        </Section>
      ))}

      {/* Mortgage */}
      <Section title="Mortgage Payoff">
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Mortgage Payoff Balance" value={mortgagePayoff}
            onChange={v => { setMortgagePayoff(v); scheduleSave() }} />
        </div>
      </Section>

      {/* Debts */}
      <Section title="Outstanding Debts">
        {debtItems.length === 0 ? (
          <p className="text-dim text-sm text-center py-4">No debts added.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {debtItems.map(d => (
              <div key={d.id} className="grid grid-cols-3 gap-3 items-center">
                <select value={d.type} onChange={e => updateDebt(d.id, 'type', e.target.value)}
                  className="input-gold bg-white/5 border border-gold/20 rounded-lg px-3 py-2 text-cream text-sm">
                  {DEBT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold text-xs">$</span>
                  <input type="text"
                    value={d.balance.toLocaleString()}
                    onChange={e => updateDebt(d.id, 'balance', parseFloat(e.target.value.replace(/,/g, '')) || 0)}
                    className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg pl-6 pr-3 py-2 text-cream text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <select value={d.owner} onChange={e => updateDebt(d.id, 'owner', e.target.value as DebtOwner)}
                    className="input-gold flex-1 bg-white/5 border border-gold/20 rounded-lg px-2 py-2 text-cream text-xs">
                    <option value="joint">Joint</option>
                    <option value="p1">Person 1</option>
                    <option value="p2">Person 2</option>
                  </select>
                  <button onClick={() => removeDebt(d.id)} className="text-red-400/60 hover:text-red-400 text-lg">×</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={addDebt}
          className="w-full border border-gold/20 border-dashed rounded-lg py-2.5 text-dim text-sm hover:border-gold/40 hover:text-gold transition-all">
          + Add Debt
        </button>
        {debtItems.length > 0 && (
          <div className="flex justify-between mt-3 pt-3 border-t border-gold/10">
            <span className="text-dim text-sm">Total Debt</span>
            <span className="text-gold font-medium">{money(getTotalDebt())}</span>
          </div>
        )}
      </Section>

      {/* Education */}
      <Section title="Education Needs (Children)">
        {children.length === 0 ? (
          <p className="text-dim text-sm text-center py-2">No children added.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {children.map(c => (
              <div key={c.id} className="grid grid-cols-2 gap-3 items-center">
                <input value={c.name} onChange={e => setChildren(ch => ch.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))}
                  className="input-gold bg-white/5 border border-gold/20 rounded-lg px-3 py-2 text-cream text-sm"
                  placeholder="Child name" />
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold text-xs">$</span>
                    <input type="text"
                      value={c.annualCost > 0 ? c.annualCost.toLocaleString() : ''}
                      onChange={e => {
                        const v = parseFloat(e.target.value.replace(/,/g, '')) || 0
                        setChildren(ch => ch.map(x => x.id === c.id ? { ...x, annualCost: v } : x))
                        scheduleSave()
                      }}
                      className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg pl-6 pr-3 py-2 text-cream text-sm"
                      placeholder="Annual cost" />
                  </div>
                  <button onClick={() => removeChild(c.id)} className="text-red-400/60 hover:text-red-400 text-lg">×</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={addChild}
          className="w-full border border-gold/20 border-dashed rounded-lg py-2.5 text-dim text-sm hover:border-gold/40 hover:text-gold transition-all mb-3">
          + Add Child
        </button>
        <p className="text-dim text-xs">Education total = annual cost × 4 years per child</p>
        {children.length > 0 && (
          <div className="flex justify-between mt-2">
            <span className="text-dim text-sm">Total Education</span>
            <span className="text-gold font-medium">{money(getEducationTotal())}</span>
          </div>
        )}
      </Section>
    </div>
  )

  const renderBudget = () => (
    <div className="space-y-5">
      <Section title="Income">
        <div className="grid grid-cols-2 gap-4">
          <InputField label={`Annual Income — ${p1Name || 'Person 1'}`} value={annualIncomeP1}
            onChange={v => { setAnnualIncomeP1(v); scheduleSave() }} />
          {maritalStatus === 'married' && (
            <InputField label={`Annual Income — ${p2Name || 'Person 2'}`} value={annualIncomeP2}
              onChange={v => { setAnnualIncomeP2(v); scheduleSave() }} />
          )}
        </div>
      </Section>

      <Section title="Monthly Budget">
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Monthly Expenses" value={monthlyExpenses}
            onChange={v => { setMonthlyExpenses(v); scheduleSave() }} />
          <InputField label="Monthly 401(k) Contribution" value={monthly401k}
            onChange={v => { setMonthly401k(v); scheduleSave() }} />
          <InputField label="Monthly Roth Contribution" value={monthlyRoth}
            onChange={v => { setMonthlyRoth(v); scheduleSave() }} />
        </div>
      </Section>

      <Section title="Income Replacement">
        <div className="grid grid-cols-2 gap-6">
          {([1, 2] as const).filter(p => p === 1 || maritalStatus === 'married').map(person => {
            const isOverride = person === 1 ? incomeReplaceP1Override : incomeReplaceP2Override
            const replaceVal = person === 1 ? incomeReplaceP1 : incomeReplaceP2
            const years = person === 1 ? incomeYearsP1 : incomeYearsP2

            return (
              <div key={person}>
                <label className="block text-xs text-dim mb-1.5">{person === 1 ? p1Name || 'Person 1' : p2Name || 'Person 2'} — Income Replacement</label>
                <div className="flex gap-2 mb-2">
                  <input type="number" value={years}
                    onChange={e => { const v = parseInt(e.target.value) || 10; person === 1 ? setIncomeYearsP1(v) : setIncomeYearsP2(v); scheduleSave() }}
                    className="input-gold w-20 bg-white/5 border border-gold/20 rounded-lg px-3 py-2 text-cream text-sm" />
                  <span className="text-dim text-sm self-center">years</span>
                  <button
                    onClick={() => { person === 1 ? setIncomeReplaceP1Override(v => !v) : setIncomeReplaceP2Override(v => !v) }}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${isOverride ? 'border-green-500/40 text-green-400' : 'border-gold/25 text-gold'}`}
                  >
                    {isOverride ? 'Auto' : 'Override'}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold text-xs">$</span>
                  <input type="text"
                    readOnly={!isOverride}
                    value={replaceVal > 0 ? Math.round(replaceVal).toLocaleString() : ''}
                    onChange={e => { if (isOverride) { const v = parseFloat(e.target.value.replace(/,/g, '')) || 0; person === 1 ? setIncomeReplaceP1(v) : setIncomeReplaceP2(v); scheduleSave() } }}
                    className={`input-gold w-full border border-gold/20 rounded-lg pl-6 pr-3 py-2.5 text-cream text-sm ${isOverride ? 'bg-white/8' : 'bg-white/3 opacity-75'}`}
                  />
                </div>
                <p className="text-dim text-xs mt-1">
                  {isOverride ? 'Manual override' : `Auto: ${money(person === 1 ? annualIncomeP1 : annualIncomeP2)} × ${years} yrs`}
                </p>
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )

  const renderAssets = () => (
    <div className="space-y-5">
      <Section title="Investment Accounts">
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Qualified Account Balance (401k, IRA, etc.)" value={qualifiedBalance}
            onChange={v => { setQualifiedBalance(v); scheduleSave() }} />
          <InputField label="Non-Qualified Balance (Roth, brokerage)" value={nonQualBalance}
            onChange={v => { setNonQualBalance(v); scheduleSave() }} />
        </div>
      </Section>

      <Section title="Existing Life Insurance Coverage">
        <div className="grid grid-cols-2 gap-4">
          <InputField label={`${p1Name || 'Person 1'} — Coverage`} value={existingLifeP1}
            onChange={v => { setExistingLifeP1(v); scheduleSave() }} />
          {maritalStatus === 'married' && (
            <InputField label={`${p2Name || 'Person 2'} — Coverage`} value={existingLifeP2}
              onChange={v => { setExistingLifeP2(v); scheduleSave() }} />
          )}
        </div>
      </Section>

      <Section title="Life Insurance Needed">
        {([1, 2] as const).filter(p => p === 1 || maritalStatus === 'married').map(person => {
          const isOverride = person === 1 ? liNeededP1Override : liNeededP2Override
          const val = person === 1 ? liNeededP1Calc : liNeededP2Calc
          const existing = person === 1 ? existingLifeP1 : existingLifeP2
          const gap = Math.max(0, val - existing)

          return (
            <div key={person} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-dim">{person === 1 ? p1Name || 'Person 1' : p2Name || 'Person 2'}</label>
                <button
                  onClick={() => { person === 1 ? setLiNeededP1Override(v => !v) : setLiNeededP2Override(v => !v) }}
                  className={`text-xs px-2 py-1 rounded border transition-all ${isOverride ? 'border-green-500/40 text-green-400' : 'border-gold/25 text-gold'}`}
                >
                  {isOverride ? 'Auto' : 'Override'}
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold text-xs">$</span>
                <input type="text"
                  readOnly={!isOverride}
                  value={val > 0 ? Math.round(val).toLocaleString() : ''}
                  onChange={e => {
                    if (isOverride) {
                      const v = parseFloat(e.target.value.replace(/,/g, '')) || 0
                      person === 1 ? setLiNeededP1(v) : setLiNeededP2(v)
                      scheduleSave()
                    }
                  }}
                  className={`input-gold w-full border border-gold/20 rounded-lg pl-6 pr-3 py-2.5 text-cream text-sm ${isOverride ? 'bg-white/8' : 'bg-white/3'}`}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-dim">Coverage gap</span>
                <span className={gap > 0 ? 'text-red-400 font-medium' : 'text-green-400'}>{money(gap)}</span>
              </div>
            </div>
          )
        })}
      </Section>
    </div>
  )

  const renderSummary = () => {
    const totalObligations = getTotalObligations()
    const totalIR = incomeReplaceP1 + (maritalStatus === 'married' ? incomeReplaceP2 : 0)
    const discretionaryIncome = (annualIncomeP1 + annualIncomeP2) - monthlyExpenses * 12
    const totalLiNeeded = liNeededP1Calc + (maritalStatus === 'married' ? liNeededP2Calc : 0)

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Obligations', value: money(totalObligations) },
            { label: 'Income Replacement', value: money(totalIR) },
            { label: 'Life Insurance Needed', value: money(totalLiNeeded) },
            { label: 'Annual Discretionary', value: money(discretionaryIncome) },
          ].map(m => (
            <div key={m.label} className="bg-navy-mid rounded-xl border border-gold/15 p-4">
              <div className="text-dim text-xs uppercase tracking-widest mb-2">{m.label}</div>
              <div className="font-display text-gold text-xl">{m.value}</div>
            </div>
          ))}
        </div>

        <Section title="Obligations Breakdown">
          <div className="space-y-2">
            {[
              { label: `Funeral — ${p1Name || 'Person 1'}`, value: getFuneralTotal(1) },
              ...(maritalStatus === 'married' ? [{ label: `Funeral — ${p2Name || 'Person 2'}`, value: getFuneralTotal(2) }] : []),
              { label: 'Mortgage Payoff', value: mortgagePayoff },
              { label: 'Outstanding Debt', value: getTotalDebt() },
              { label: 'Education Needs', value: getEducationTotal() },
            ].map(item => (
              <div key={item.label} className="flex justify-between py-1.5 border-b border-gold/5 last:border-0">
                <span className="text-dim text-sm">{item.label}</span>
                <span className="text-cream text-sm">{money(item.value)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 font-semibold">
              <span className="text-cream">Grand Total</span>
              <span className="text-gold">{money(totalObligations)}</span>
            </div>
          </div>
        </Section>

        <Section title="Life Insurance Analysis">
          {([1, 2] as const).filter(p => p === 1 || maritalStatus === 'married').map(person => {
            const needed = person === 1 ? liNeededP1Calc : liNeededP2Calc
            const existing = person === 1 ? existingLifeP1 : existingLifeP2
            const gap = Math.max(0, needed - existing)
            return (
              <div key={person} className="mb-4 last:mb-0 p-4 rounded-lg bg-navy border border-gold/10">
                <div className="font-medium text-cream text-sm mb-3">{person === 1 ? p1Name || 'Person 1' : p2Name || 'Person 2'}</div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-dim text-xs mb-1">Coverage Needed</div>
                    <div className="text-gold font-display text-lg">{money(needed)}</div>
                  </div>
                  <div>
                    <div className="text-dim text-xs mb-1">Current Coverage</div>
                    <div className="text-cream font-display text-lg">{money(existing)}</div>
                  </div>
                  <div>
                    <div className="text-dim text-xs mb-1">Coverage Gap</div>
                    <div className={`font-display text-lg ${gap > 0 ? 'text-red-400' : 'text-green-400'}`}>{money(gap)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </Section>

        <div className="flex justify-end no-print">
          <button
            onClick={() => window.print()}
            className="bg-gold hover:bg-gold-light text-navy font-semibold px-6 py-2.5 rounded-lg text-sm tracking-wide transition-all"
          >
            Print / PDF Report
          </button>
        </div>
      </div>
    )
  }

  const screenContent = [renderHousehold, renderNeeds, renderBudget, renderAssets, renderSummary]

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-cream">Wants Analysis</h1>
        <p className="text-dim text-sm mt-1">Multi-screen needs assessment</p>
      </div>

      {!activeClient && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl px-5 py-4 text-yellow-300 text-sm mb-6">
          No client selected. Select a client from the Dashboard to auto-fill and save data.
        </div>
      )}

      {/* Step nav */}
      <div className="flex items-center gap-0 mb-8 no-print">
        {SCREENS.map((s, i) => (
          <button
            key={s}
            onClick={() => setScreen(i)}
            className={`flex-1 py-2.5 text-xs font-medium transition-all border-b-2 ${
              i === screen
                ? 'border-gold text-gold'
                : i < screen
                ? 'border-gold/40 text-gold/60'
                : 'border-gold/10 text-dim'
            }`}
          >
            <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-xs mr-1.5 ${
              i === screen ? 'bg-gold text-navy' : i < screen ? 'bg-gold/30 text-gold' : 'bg-white/5 text-dim'
            }`}>{i + 1}</span>
            {s}
          </button>
        ))}
      </div>

      {/* Screen content */}
      {screenContent[screen]()}

      {/* Nav buttons */}
      <div className="flex justify-between mt-6 no-print">
        <button
          onClick={() => setScreen(s => Math.max(0, s - 1))}
          disabled={screen === 0}
          className="px-5 py-2.5 border border-gold/20 rounded-lg text-dim text-sm hover:text-cream transition-all disabled:opacity-30"
        >
          ← Back
        </button>
        <button
          onClick={() => { scheduleSave(); setScreen(s => Math.min(SCREENS.length - 1, s + 1)) }}
          disabled={screen === SCREENS.length - 1}
          className="px-5 py-2.5 bg-gold hover:bg-gold-light text-navy font-semibold rounded-lg text-sm transition-all disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
