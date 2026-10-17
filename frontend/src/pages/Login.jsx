import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

function Seal({ size = 30, color = '#B8862F' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
      <circle cx="17" cy="17" r="15.5" stroke={color} strokeWidth="1.3" />
      <circle cx="17" cy="17" r="12" stroke={color} strokeWidth="0.6" opacity="0.55" />
      <text x="17" y="22.5" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="14" fill={color}>CT</text>
    </svg>
  )
}

export default function Login() {
  const { login } = useAuth()
  const [needsSetup, setNeedsSetup] = useState(null) // null = still checking
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.setupStatus().then((s) => setNeedsSetup(s.needs_setup)).catch((e) => { setError(e.message); setNeedsSetup(false) })
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      login(needsSetup ? await api.setup(username, password) : await api.login(username, password))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="login-screen">
      <svg className="login-watermark" viewBox="0 0 34 34" fill="none">
        <circle cx="17" cy="17" r="15.5" stroke="#D9A94A" strokeWidth="0.4" />
        <circle cx="17" cy="17" r="12" stroke="#D9A94A" strokeWidth="0.2" />
        <text x="17" y="22.5" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="14" fill="#D9A94A">CT</text>
      </svg>

      <div className="chit login-card" style={{ width: 340 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Seal />
          <h1 style={{ fontSize: 22 }}>The Corner Table</h1>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 0, marginBottom: 18 }}>
          {needsSetup ? 'first-time setup: create the admin account' : 'back of house'}
        </p>

        {error && <div className="error">{error}</div>}

        {needsSetup !== null && (
          <form onSubmit={submit}>
            <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%' }} minLength={3} required />
            <input type="password" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%' }} minLength={6} required />
            <button className="stamp" type="submit" style={{ width: '100%', marginTop: 6 }}>
              {needsSetup ? 'Create admin account' : 'Log in'}
            </button>
          </form>
        )}

        <p style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-soft)' }}>
          {needsSetup
            ? 'Staff and kitchen accounts are added later from the Team tab.'
            : 'No account? Ask your admin to add you.'}
        </p>
      </div>
    </div>
  )
}
