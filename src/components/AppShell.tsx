import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useClient } from '../context/ClientContext'
import { clientDisplayName, calcAge } from '../types'
import { useTheme } from '../hooks/useTheme'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/wants-analysis', label: 'Wants Analysis', icon: '📋' },
  { path: '/banking', label: 'Banking Calculator', icon: '🛡️' },
  { path: '/retirement', label: 'Retirement Tool', icon: '📊' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const { activeClient, setActiveClient } = useClient()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { theme, toggleTheme } = useTheme()

  const clientAge = activeClient ? calcAge(activeClient.date_of_birth) : null

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-navy">
      {/* Sidebar */}
      <aside
        className={`app-sidebar flex-shrink-0 flex flex-col border-r border-gold/20 transition-all duration-200 ${sidebarOpen ? 'w-64' : 'w-14'}`}
        style={{ background: 'linear-gradient(180deg,#0d1e3a 0%,#0a1628 100%)' }}
      >
        {/* Brand */}
        <div className="px-4 py-6 border-b border-gold/10 flex items-center gap-3">
          <div
            className="w-8 h-9 bg-gold flex-shrink-0 flex items-center justify-center text-navy font-bold text-xs"
            style={{ clipPath: 'polygon(50% 0%, 100% 15%, 100% 70%, 50% 100%, 0% 70%, 0% 15%)' }}
          >
            FS
          </div>
          {sidebarOpen && (
            <div>
              <div className="font-display text-gold text-sm leading-tight">Financial Shield</div>
              <div className="text-dim text-[9px] tracking-widest uppercase mt-0.5">Advisor Platform</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="ml-auto text-dim hover:text-gold text-xs"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all border ${
                  isActive
                    ? 'bg-gold/10 text-gold border-gold/25 font-medium'
                    : 'text-dim/80 border-transparent hover:bg-gold/5 hover:text-gold/80'
                }`
              }
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gold/10">
          {sidebarOpen && (
            <div className="px-3 py-2 text-xs text-dim truncate mb-2">
              {user?.email}
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-dim hover:text-red-400 hover:bg-red-900/20 text-sm transition-all"
          >
            <span>↩</span>
            {sidebarOpen && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="app-topbar border-b border-gold/15 px-6 py-3 flex items-center justify-between flex-shrink-0"
          style={{ background: '#0d1e3a' }}>
          <div className="flex items-center gap-3">
            {activeClient ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-gold text-xs font-bold">
                  {activeClient.first_name[0]}{activeClient.last_name[0]}
                </div>
                <div>
                  <div className="text-cream text-sm font-medium">{clientDisplayName(activeClient)}</div>
                  <div className="text-dim text-xs">
                    {clientAge ? `Age ${clientAge}` : ''}
                    {activeClient.monthly_expenses ? ` · $${activeClient.monthly_expenses.toLocaleString()}/mo` : ''}
                  </div>
                </div>
                <button
                  onClick={() => setActiveClient(null)}
                  className="text-dim hover:text-gold text-xs border border-gold/20 rounded px-2 py-0.5 ml-1"
                >
                  Switch
                </button>
              </div>
            ) : (
              <div className="text-dim text-sm">No client selected</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 text-dim hover:text-gold text-xs border border-gold/20 rounded-lg px-3 py-1.5 transition-all"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  )
}
