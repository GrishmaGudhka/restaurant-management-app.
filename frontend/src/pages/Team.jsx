import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const ROLE_INFO = [
  ['admin', 'Everything: tables, menu, team, all ticket stages, voids'],
  ['staff', 'Floor status, takes orders, serves, closes bills, cancels new tickets'],
  ['kitchen', 'Sees the ticket rail without prices, cooks, marks dishes sold out'],
]

export default function Team() {
  const { username: me } = useAuth()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ username: '', password: '', role: 'staff' })
  const [error, setError] = useState('')

  const load = () => api.getUsers().then(setUsers).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const run = async (action) => {
    try { await action(); setError(''); await load() } catch (err) { setError(err.message) }
  }

  const addUser = (e) => {
    e.preventDefault()
    run(async () => {
      await api.createUser(form)
      setForm({ username: '', password: '', role: form.role })
    })
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}

      <div className="chit">
        <h3>Add a team member</h3>
        <form onSubmit={addUser}>
          <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} minLength={3} required />
          <input type="password" placeholder="Password (6+)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="staff">Staff</option>
            <option value="kitchen">Kitchen</option>
            <option value="admin">Admin</option>
          </select>
          <button className="stamp" type="submit">Add</button>
        </form>
      </div>

      <ul className="menu-list team-list">
        {users.map((u) => (
          <li className={`menu-row ${u.is_active ? '' : 'sold-out'}`} key={u.id}>
            <span className="name">{u.username}</span>
            <span className={`role-chip ${u.role}`}>{u.role}</span>
            {u.username === me && <span className="you">you</span>}
            {!u.is_active && <span className="stock out static">Deactivated</span>}
            <span className="leader" />
            {u.username !== me && (
              <button className="ghost" onClick={() => run(() => api.setUserActive(u.id, !u.is_active))}>
                {u.is_active ? 'Deactivate' : 'Restore'}
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="chit role-help">
        <h3>What each role can do</h3>
        <dl>
          {ROLE_INFO.map(([r, text]) => (
            <div key={r}><dt><span className={`role-chip ${r}`}>{r}</span></dt><dd>{text}</dd></div>
          ))}
        </dl>
      </div>
    </div>
  )
}
