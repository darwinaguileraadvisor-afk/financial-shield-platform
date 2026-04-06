import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Client } from '../types'
import { supabase } from '../lib/supabase'

interface ClientContextType {
  activeClient: Client | null
  setActiveClient: (client: Client | null) => void
  refreshClient: () => Promise<void>
  saveToolData: (
    tool: 'wants_analysis_data' | 'banking_calculator_data' | 'retirement_tool_data',
    data: Record<string, unknown>
  ) => Promise<void>
}

const ClientContext = createContext<ClientContextType | null>(null)

export function ClientProvider({ children }: { children: ReactNode }) {
  const [activeClient, setActiveClient] = useState<Client | null>(null)

  const refreshClient = useCallback(async () => {
    if (!activeClient) return
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('id', activeClient.id)
      .single()
    if (data) setActiveClient(data as Client)
  }, [activeClient])

  const saveToolData = useCallback(async (
    tool: 'wants_analysis_data' | 'banking_calculator_data' | 'retirement_tool_data',
    data: Record<string, unknown>
  ) => {
    if (!activeClient) return
    await supabase
      .from('clients')
      .update({ [tool]: data, updated_at: new Date().toISOString(), last_tool_used: tool.replace('_data', '') })
      .eq('id', activeClient.id)
    setActiveClient(prev => prev ? { ...prev, [tool]: data } : prev)
  }, [activeClient])

  return (
    <ClientContext.Provider value={{ activeClient, setActiveClient, refreshClient, saveToolData }}>
      {children}
    </ClientContext.Provider>
  )
}

export function useClient() {
  const ctx = useContext(ClientContext)
  if (!ctx) throw new Error('useClient must be used within ClientProvider')
  return ctx
}
