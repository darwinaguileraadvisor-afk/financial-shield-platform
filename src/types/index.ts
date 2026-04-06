export type ClientStatus = 'active' | 'follow_up' | 'closed' | 'inactive'

export interface Client {
  id: string
  created_at: string
  updated_at: string
  agent_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  spouse_name: string | null
  spouse_dob: string | null
  monthly_expenses: number | null
  monthly_income: number | null
  annual_income_p1: number | null
  annual_income_p2: number | null
  wants_analysis_data: Record<string, unknown>
  banking_calculator_data: Record<string, unknown>
  retirement_tool_data: Record<string, unknown>
  status: ClientStatus
  notes: string | null
  last_tool_used: string | null
  meeting_count: number
}

export interface Session {
  id: string
  created_at: string
  client_id: string
  agent_id: string
  tool_used: string
  inputs_snapshot: Record<string, unknown>
  outputs_snapshot: Record<string, unknown>
  duration_seconds: number | null
}

// Computed age from date_of_birth
export function calcAge(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function clientDisplayName(c: Client): string {
  return `${c.first_name} ${c.last_name}`.trim()
}
