import { useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('admin')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const data = await api.login(username, password)
      login(data.access_token, username)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    try {
      await api.register(username, password, role)
      setInfo('Account created — you can log in now.')
      setMode('login')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 360, margin: '60px auto' }}>
      <h2>{mode === 'login' ? 'Log in' : 'Create account'}</h2>
      {error && <div className="error">{error}</div>}
      {info && <div style={{ color: '#155724' }}>{info}</div>}

      <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
        <div>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {mode === 'register' && (
          <div>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="kitchen">Kitchen</option>
            </select>
          </div>
        )}
        <button className="primary" type="submit">
          {mode === 'login' ? 'Log in' : 'Register'}
        </button>
      </form>

      <p style={{ marginTop: 12 }}>
        {mode === 'login' ? (
          <>No account? <a href="#" onClick={() => setMode('register')}>Register</a></>
        ) : (
          <>Already have an account? <a href="#" onClick={() => setMode('login')}>Log in</a></>
        )}
      </p>
    </div>
  )
}
