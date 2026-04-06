import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useClient } from '../../context/ClientContext'
import type { Client, ClientStatus } from '../../types'
import { clientDisplayName, calcAge } from '../../types'

const STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Active',
  follow_up: 'Follow-Up',
  closed: 'Closed',
  inactive: 'Inactive',
}

const STATUS_COLORS: Record<ClientStatus, string> = {
  active: 'bg-green-900/40 text-green-400 border-green-500/30',
  follow_up: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30',
  closed: 'bg-gray-800/60 text-gray-400 border-gray-600/30',
  inactive: 'bg-gray-800/60 text-gray-400 border-gray-600/30',
}

const TOOL_LABELS: Record<string, string> = {
  wants_analysis: 'Wants Analysis',
  banking_calculator: 'Banking Calc',
  retirement_tool: 'Retirement Tool',
}

type SortKey = 'newest' | 'name' | 'last_activity'

interface NewClientForm {
  first_name: string
  last_name: string
  email: string
  phone: string
  date_of_birth: string
  spouse_name: string
  monthly_expenses: string
  monthly_income: string
  annual_income_p1: string
  annual_income_p2: string
}

const emptyForm: NewClientForm = {
  first_name: '', last_name: '', email: '', phone: '',
  date_of_birth: '', spouse_name: '',
  monthly_expenses: '', monthly_income: '',
  annual_income_p1: '', annual_income_p2: '',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { setActiveClient } = useClient()
  const navigate = useNavigate()

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewClientForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Three-dot menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadClients() }, [])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadClients() {
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    setClients((data as Client[]) || [])
    setLoading(false)
  }

  async function createClient() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError('First and last name are required.')
      return
    }
    setSaving(true)
    setFormError('')
    const { data, error } = await supabase.from('clients').insert({
      agent_id: user!.id,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      date_of_birth: form.date_of_birth || null,
      spouse_name: form.spouse_name || null,
      monthly_expenses: form.monthly_expenses ? parseFloat(form.monthly_expenses) : null,
      monthly_income: form.monthly_income ? parseFloat(form.monthly_income) : null,
      annual_income_p1: form.annual_income_p1 ? parseFloat(form.annual_income_p1) : null,
      annual_income_p2: form.annual_income_p2 ? parseFloat(form.annual_income_p2) : null,
      status: 'active',
      wants_analysis_data: {},
      banking_calculator_data: {},
      retirement_tool_data: {},
    }).select().single()

    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowModal(false)
    setForm(emptyForm)
    const newClient = data as Client
    setClients(prev => [newClient, ...prev])
    setActiveClient(newClient)
    navigate('/banking')
  }

  async function updateStatus(clientId: string, status: ClientStatus) {
    setOpenMenuId(null)
    const { error } = await supabase.from('clients').update({ status }).eq('id', clientId)
    if (!error) setClients(prev => prev.map(c => c.id === clientId ? { ...c, status } : c))
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return
    setDeleting(true)
    const { error } = await supabase.from('clients').delete().eq('id', deleteConfirmId)
    setDeleting(false)
    if (!error) {
      setClients(prev => prev.filter(c => c.id !== deleteConfirmId))
    }
    setDeleteConfirmId(null)
  }

  const filtered = clients
    .filter(c => {
      const name = clientDisplayName(c).toLowerCase()
      if (search && !name.includes(search.toLowerCase())) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortKey === 'name') return clientDisplayName(a).localeCompare(clientDisplayName(b))
      if (sortKey === 'last_activity') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  function openClient(client: Client) {
    setActiveClient(client)
    navigate('/banking')
  }

  return (
    <div className="p-6 pb-10 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-cream">Client Dashboard</h1>
          <p className="text-dim text-sm mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setForm(emptyForm); setFormError('') }}
          className="bg-gold hover:bg-gold-light text-navy font-semibold px-5 py-2.5 rounded-lg text-sm tracking-wide transition-all"
        >
          + New Client
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Search clients…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-gold bg-navy-mid border border-gold/20 rounded-lg px-4 py-2 text-cream text-sm placeholder-dim/50 w-64"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ClientStatus | 'all')}
          className="input-gold bg-navy-mid border border-gold/20 rounded-lg px-3 py-2 text-cream text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="follow_up">Follow-Up</option>
          <option value="inactive">Inactive</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          className="input-gold bg-navy-mid border border-gold/20 rounded-lg px-3 py-2 text-cream text-sm"
        >
          <option value="newest">Newest First</option>
          <option value="name">By Name</option>
          <option value="last_activity">Last Activity</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-dim text-sm py-12 text-center">Loading clients…</div>
      ) : filtered.length === 0 ? (
        <div className="text-dim text-sm py-12 text-center">
          {search || statusFilter !== 'all' ? 'No clients match your filters.' : 'No clients yet. Create your first client above.'}
        </div>
      ) : (
        <div className="bg-navy-mid rounded-xl border border-gold/15 overflow-visible">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="border-b border-gold/10">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-dim font-medium">Client</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-dim font-medium">Age</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-dim font-medium">Monthly Exp.</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-dim font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-dim font-medium">Last Tool</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-dim font-medium">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, i) => {
                const age = calcAge(client.date_of_birth)
                const flipUp = i >= filtered.length - 3
                return (
                  <tr
                    key={client.id}
                    className={`border-b border-gold/5 hover:bg-gold/5 cursor-pointer transition-colors ${
                      i === filtered.length - 1 ? 'border-b-0' : ''
                    }`}
                    onClick={() => openClient(client)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-gold text-xs font-bold flex-shrink-0">
                          {client.first_name[0]}{client.last_name[0]}
                        </div>
                        <div>
                          <div className="text-cream text-sm font-medium">{clientDisplayName(client)}</div>
                          {client.email && <div className="text-dim text-xs">{client.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-cream text-sm">{age ?? '—'}</td>
                    <td className="px-4 py-4 text-cream text-sm">
                      {client.monthly_expenses ? `$${client.monthly_expenses.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[client.status]}`}>
                        {STATUS_LABELS[client.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-dim text-xs">
                      {client.last_tool_used ? TOOL_LABELS[client.last_tool_used] || client.last_tool_used : '—'}
                    </td>
                    <td className="px-4 py-4 text-dim text-xs">
                      {new Date(client.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="relative inline-block" ref={openMenuId === client.id ? menuRef : undefined}>
                        <button
                          onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === client.id ? null : client.id) }}
                          className="text-dim hover:text-gold text-lg px-2 py-0.5 rounded hover:bg-gold/10 transition-colors leading-none"
                          title="Actions"
                        >
                          ⋯
                        </button>
                        {openMenuId === client.id && (
                          <div className={`absolute right-0 z-30 bg-navy-mid border border-gold/20 rounded-xl shadow-lg py-1 w-48 ${flipUp ? 'bottom-8' : 'top-8'}`}>
                            <button
                              onClick={() => updateStatus(client.id, 'follow_up')}
                              className="w-full text-left px-4 py-2.5 text-sm text-cream hover:bg-gold/10 transition-colors"
                            >
                              📋 Mark as Follow-Up
                            </button>
                            <button
                              onClick={() => updateStatus(client.id, 'inactive')}
                              className="w-full text-left px-4 py-2.5 text-sm text-cream hover:bg-gold/10 transition-colors"
                            >
                              🔕 Mark as Inactive
                            </button>
                            <button
                              onClick={() => updateStatus(client.id, 'active')}
                              className="w-full text-left px-4 py-2.5 text-sm text-cream hover:bg-gold/10 transition-colors"
                            >
                              ✅ Mark as Active
                            </button>
                            <div className="border-t border-gold/10 my-1" />
                            <button
                              onClick={() => { setDeleteConfirmId(client.id); setOpenMenuId(null) }}
                              className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
                            >
                              🗑 Delete Client
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-mid rounded-2xl border border-red-500/30 p-7 w-full max-w-sm">
            <h2 className="font-display text-xl text-cream mb-2">Delete Client?</h2>
            <p className="text-dim text-sm mb-6">
              This will permanently delete the client and all their data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 border border-gold/20 text-dim hover:text-cream rounded-lg py-2.5 text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg py-2.5 text-sm transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-mid rounded-2xl border border-gold/20 p-7 w-full max-w-lg card-gold-top max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl text-cream">New Client</h2>
              <button onClick={() => setShowModal(false)} className="text-dim hover:text-cream text-xl">×</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-dim mb-1.5">First Name *</label>
                  <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg px-3 py-2.5 text-cream text-sm"
                    placeholder="John" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-dim mb-1.5">Last Name *</label>
                  <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg px-3 py-2.5 text-cream text-sm"
                    placeholder="Smith" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-dim mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg px-3 py-2.5 text-cream text-sm"
                    placeholder="john@email.com" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-dim mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg px-3 py-2.5 text-cream text-sm"
                    placeholder="(555) 000-0000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-dim mb-1.5">Date of Birth</label>
                  <input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                    className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg px-3 py-2.5 text-cream text-sm" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-dim mb-1.5">Spouse Name</label>
                  <input value={form.spouse_name} onChange={e => setForm(f => ({ ...f, spouse_name: e.target.value }))}
                    className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg px-3 py-2.5 text-cream text-sm"
                    placeholder="Optional" />
                </div>
              </div>

              <div className="border-t border-gold/10 pt-4">
                <p className="text-xs uppercase tracking-widest text-dim mb-3">Financial Info</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-dim mb-1.5">Monthly Expenses</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold text-sm">$</span>
                      <input type="number" value={form.monthly_expenses} onChange={e => setForm(f => ({ ...f, monthly_expenses: e.target.value }))}
                        className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg pl-7 pr-3 py-2.5 text-cream text-sm"
                        placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-dim mb-1.5">Monthly Income</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold text-sm">$</span>
                      <input type="number" value={form.monthly_income} onChange={e => setForm(f => ({ ...f, monthly_income: e.target.value }))}
                        className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg pl-7 pr-3 py-2.5 text-cream text-sm"
                        placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-dim mb-1.5">Annual Income (P1)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold text-sm">$</span>
                      <input type="number" value={form.annual_income_p1} onChange={e => setForm(f => ({ ...f, annual_income_p1: e.target.value }))}
                        className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg pl-7 pr-3 py-2.5 text-cream text-sm"
                        placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-dim mb-1.5">Annual Income (P2)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold text-sm">$</span>
                      <input type="number" value={form.annual_income_p2} onChange={e => setForm(f => ({ ...f, annual_income_p2: e.target.value }))}
                        className="input-gold w-full bg-white/5 border border-gold/20 rounded-lg pl-7 pr-3 py-2.5 text-cream text-sm"
                        placeholder="0" />
                    </div>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-4 py-3 text-red-300 text-sm">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 border border-gold/20 text-dim hover:text-cream rounded-lg py-2.5 text-sm transition-all">
                  Cancel
                </button>
                <button onClick={createClient} disabled={saving}
                  className="flex-1 bg-gold hover:bg-gold-light text-navy font-semibold rounded-lg py-2.5 text-sm transition-all disabled:opacity-50">
                  {saving ? 'Creating…' : 'Create Client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
