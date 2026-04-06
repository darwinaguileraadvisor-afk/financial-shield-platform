import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { signIn, session } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState('')
  const [loading, setLoading] = useState(false)

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (session) {
      navigate('/dashboard', { replace: true })
    }
  }, [session, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setDebugInfo('')
    setLoading(true)

    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || url === 'https://placeholder.supabase.co') {
      setError('Supabase URL not configured. Check .env file and restart dev server.')
      setLoading(false)
      return
    }
    if (!key || key === 'placeholder-key') {
      setError('Supabase Anon Key not configured. Check .env file and restart dev server.')
      setLoading(false)
      return
    }

    try {
      const { error: sbError } = await signIn(email, password)

      if (sbError) {
        setError(sbError)
        setDebugInfo('Check that the user exists in Supabase → Authentication → Users')
        setLoading(false)
        return
      }

      // Session update fires onAuthStateChange → useEffect above handles redirect
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError('Unexpected error: ' + msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div
              className="w-12 h-14 bg-gold flex items-center justify-center text-navy font-bold text-xl"
              style={{ clipPath: 'polygon(50% 0%, 100% 15%, 100% 70%, 50% 100%, 0% 70%, 0% 15%)' }}
            >
              FS
            </div>
            <div className="text-left">
              <div className="font-display text-2xl text-gold leading-tight">Financial Shield</div>
              <div className="text-xs text-dim tracking-widest uppercase mt-0.5">Advisor Platform</div>
            </div>
          </div>
          <p className="text-dim text-sm">Internal tool — agents only</p>
        </div>

        {/* Card */}
        <div className="bg-navy-mid rounded-2xl border border-gold/20 p-8 card-gold-top">
          <h2 className="font-display text-xl text-cream mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-dim mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="input-gold w-full bg-white/5 border border-gold/25 rounded-lg px-4 py-3 text-cream text-sm placeholder-dim/50 focus:bg-gold/5"
                placeholder="agent@financialshield.com"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-dim mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="input-gold w-full bg-white/5 border border-gold/25 rounded-lg px-4 py-3 text-cream text-sm placeholder-dim/50 focus:bg-gold/5"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-4 py-3">
                <div className="text-red-300 text-sm font-medium">{error}</div>
                {debugInfo && <div className="text-red-400/60 text-xs mt-1">{debugInfo}</div>}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-light text-navy font-semibold rounded-lg py-3 text-sm tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <div className="text-dim text-xs">
            Connected to: <span className="text-gold/70">{import.meta.env.VITE_SUPABASE_URL || 'NOT SET'}</span>
          </div>
        </div>

        <p className="text-center text-dim text-xs mt-3">
          Contact your administrator to create an account.
        </p>
      </div>
    </div>
  )
}
