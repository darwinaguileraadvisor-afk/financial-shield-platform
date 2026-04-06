// ─── Financial Shield Banking Calculator — Core Engine ─────────────────────
// Copied EXACTLY from financial_shield_calculator.html
// DO NOT simplify, rewrite, or change any formulas.

export interface ProjectionRow {
  year: number
  age: number
  premium: number
  loan: number
  outOfPocket: number
  totalOutOfPocket: number
  loanInterest: number
  accumulatedLoan: number
  accumulatedValue: number
  cashValue: number
  cashSurrenderValue: number
  grossDeathBenefit: number
  netDeathBenefit: number
  phase: 1 | 2
}

export interface ProjectionResult {
  rows: ProjectionRow[]
  faceAmount: number
  annualPremium: number
  hasIllustration: boolean
  premiumScaleRatio: number
  growthRate: number
  loanInterestRate: number
}

export interface LedgerRow {
  year: number
  age: number
  av: number
  csv: number
  netDB: number
}

export interface IllustrationData {
  ledgerRows?: LedgerRow[]
  faceAmount?: number
  annualPremiumRef?: number
  issueAge?: number
  apb?: number
  dbOptionB?: boolean
  currentCreditingRate?: string
  chargesByYear?: Record<number, number>
}

// ─── calcProjection — exact port from financial_shield_calculator.html ────────
export function calcProjection(
  age: number,
  monthlyExpenses: number,
  refData: IllustrationData | null,
  years = 30,
  growthRate = 0.0684,
  loanInterestRate = 0.05
): ProjectionResult {
  const annualPremium = monthlyExpenses * 12 * 1.25

  const hasIllustration = !!(refData && refData.ledgerRows && refData.ledgerRows.length > 0)

  // Premium scale ratio — if our premium differs from illustration's, scale DB
  const premiumScaleRatio =
    hasIllustration && refData!.annualPremiumRef && refData!.annualPremiumRef > 0
      ? annualPremium / refData!.annualPremiumRef
      : 1

  // Fallback face amount (when no illustration)
  const baseFaceMultiple = Math.max(10, 35 - (age - 30) * 0.4)
  const faceAmount =
    hasIllustration && refData!.faceAmount
      ? refData!.faceAmount * premiumScaleRatio
      : annualPremium * baseFaceMultiple

  // Always project for full `years` duration.
  // The policy-charge block below uses illustration data when yr <= ledgerRows.length,
  // and falls back to the formula-based approximation for remaining years.
  const projYears = years

  const rows: ProjectionRow[] = []
  let accumulatedValue = 0
  let accumulatedLoan = 0
  let loanPrincipal = 0       // cumulative principal borrowed
  let loanInterestTotal = 0   // simple interest on principal (never compounds)
  let totalOutOfPocket = 0

  for (let yr = 1; yr <= projYears; yr++) {
    const currentAge = age + yr - 1
    const premium = annualPremium
    const isPhase1 = yr <= 7
    const loan = isPhase1 ? premium * 0.8 : premium * 1.0
    const outOfPocket = isPhase1 ? premium * 0.2 : 0
    totalOutOfPocket += outOfPocket

    // ── Loan accumulation — TRUE simple interest ──
    // Each year we add new principal, then charge 5% on the TOTAL principal to date.
    // That annual interest charge accumulates in loanInterestTotal.
    // Interest never earns interest — only principal is the base for the charge.
    loanPrincipal = loanPrincipal + loan
    loanInterestTotal = loanInterestTotal + loanPrincipal * loanInterestRate
    accumulatedLoan = loanPrincipal + loanInterestTotal
    const loanInterest = loanPrincipal * loanInterestRate  // this year's charge only (for display)

    // ── Policy Charges (deducted from AV each year) ──
    // PRIMARY: Back-calculate from carrier's own AV progression.
    // Formula: charge = prevAV + illPremium - (currAV / (1 + illRate))
    // FALLBACK: Formula-based approximation
    let policyCharge = 0
    if (
      hasIllustration &&
      refData!.annualPremiumRef &&
      refData!.ledgerRows &&
      yr <= refData!.ledgerRows.length
    ) {
      // Back-calculate from carrier's AV — uses CARRIER's original crediting rate
      const illRate = refData!.currentCreditingRate
        ? parseFloat(refData!.currentCreditingRate) / 100
        : 0.0684
      const illRows = refData!.ledgerRows!
      const currIll = illRows[yr - 1]
      const prevIll = yr > 1 ? illRows[yr - 2] : null
      const illPremium = refData!.annualPremiumRef!
      if (prevIll && currIll) {
        const impliedCharge = prevIll.av + illPremium - currIll.av / (1 + illRate)
        // Sanity cap: charge can't exceed 75% of premium (would wipe out the policy)
        const cappedCharge = Math.min(Math.max(0, impliedCharge), illPremium * 0.75)
        policyCharge = cappedCharge * premiumScaleRatio
      } else if (currIll) {
        const impliedCharge = illPremium - currIll.av / (1 + illRate)
        const cappedCharge = Math.min(Math.max(0, impliedCharge), illPremium * 0.75)
        policyCharge = cappedCharge * premiumScaleRatio
      }
    } else {
      // Fallback for years beyond illustration data or no illustration at all
      const coiAge = age + yr - 1
      const premExpense = yr <= 10 ? annualPremium * 0.08 : annualPremium * 0.05
      const expenseCharge = yr <= 10 ? (annualPremium / 15000) * 725 : 0
      const policyFee = 72
      const avCharge = yr <= 10 ? accumulatedValue * 0.0025 : 0
      const coiBase = (annualPremium / 15000) * 176 * Math.pow(1.15, Math.max(0, coiAge - 47))
      policyCharge = premExpense + expenseCharge + policyFee + avCharge + coiBase
    }

    // ── Accumulated Value ──
    // AV = (prevAV + premium − policyCharge) × (1 + creditingRate)
    accumulatedValue = (accumulatedValue + annualPremium - policyCharge) * (1 + growthRate)
    if (accumulatedValue < 0) accumulatedValue = 0

    // ── Cash Value = AV minus accumulated loan ──
    const cashValue = Math.max(0, accumulatedValue - accumulatedLoan)

    // ── Death Benefit ──
    let grossDeathBenefit: number
    if (hasIllustration && yr <= refData!.ledgerRows!.length) {
      // Use illustration data while available
      const illRow = refData!.ledgerRows![yr - 1]
      grossDeathBenefit = illRow.netDB * premiumScaleRatio
    } else {
      // Fallback: face amount + AV (Option B style)
      grossDeathBenefit = faceAmount + accumulatedValue
    }
    // Net DB = Gross DB minus accumulated loan balance (loan repaid from DB at death)
    const netDeathBenefit = Math.max(0, grossDeathBenefit - accumulatedLoan)

    rows.push({
      year: yr,
      age: currentAge,
      premium,
      loan,
      outOfPocket,
      totalOutOfPocket,
      loanInterest,
      accumulatedLoan,
      accumulatedValue,
      cashValue,
      cashSurrenderValue: cashValue,
      grossDeathBenefit,
      netDeathBenefit,
      phase: isPhase1 ? 1 : 2,
    })
  }

  return { rows, faceAmount, annualPremium, hasIllustration, premiumScaleRatio, growthRate, loanInterestRate }
}

export function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString()
}

export function fmtShort(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + Math.round(n).toLocaleString()
}
