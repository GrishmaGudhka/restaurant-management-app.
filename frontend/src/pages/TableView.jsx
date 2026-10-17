import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { can } from '../lib/permissions'

const STATES = [
  { key: 'free', label: 'Free' },
  { key: 'occupied', label: 'Occupied' },
  { key: 'reserved', label: 'Reserved' },
]

export default function TableView() {
  const { role } = useAuth()
  const perms = can(role)
  const [tables, setTables] = useState([])
  const [number, setNumber] = useState('')
  const [capacity, setCapacity] = useState('')
  const [error, setError] = useState('')

  const load = () => api.getTables().then(setTables).catch((e) => setError(e.message))

  useEffect(() => {
    load()
    const id = setInterval(load, 8000) // pick up changes made by other people / new tickets
    return () => clearInterval(id)
  }, [])

  const run = async (action) => {
    try { await action(); setError(''); await load() } catch (err) { setError(err.message) }
  }

  const addTable = (e) => {
    e.preventDefault()
    run(async () => {
      await api.createTable({ number: parseInt(number), capacity: parseInt(capacity) })
      setNumber(''); setCapacity('')
    })
  }

  const setStatus = (t, status) => t.status !== status && run(() => api.setTableStatus(t.id, status))

  const removeTable = (t) => {
    if (window.confirm(`Remove Table ${t.number} from the floor? Past orders are kept.`)) run(() => api.deleteTable(t.id))
  }

  const counts = tables.reduce((acc, t) => ({ ...acc, [t.status]: (acc[t.status] || 0) + 1 }), { free: 0, occupied: 0, reserved: 0 })

  return (
    <div>
      {error && <div className="error">{error}</div>}

      {tables.length > 0 && (
        <div className="stat-strip">
          {STATES.map((s) => (
            <div className="stat" key={s.key}>
              <span className="dot" style={{ background: `var(--st-${s.key})` }} />
              <span className="n">{counts[s.key]}</span>
              <span className="label">{s.label.toLowerCase()}</span>
            </div>
          ))}
        </div>
      )}

      {perms.manageTables && (
        <div className="chit">
          <h3>Set a new table</h3>
          <form onSubmit={addTable}>
            <input placeholder="Table no." type="number" min="1" value={number} onChange={(e) => setNumber(e.target.value)} required style={{ width: 120 }} />
            <input placeholder="Seats" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} required style={{ width: 90 }} />
            <button className="stamp" type="submit">Set table</button>
          </form>
        </div>
      )}

      <div className="floor">
        {tables.map((t) => (
          <div className={`table-tile ${t.status}`} key={t.id}>
            <div className="num">{t.number}</div>
            <div className="seats">{t.capacity} seats</div>
            <div className="seg" role="group" aria-label={`Table ${t.number} status`}>
              {STATES.map((s) => (
                <button key={s.key} className={t.status === s.key ? `on ${s.key}` : ''} aria-pressed={t.status === s.key}
                  onClick={() => setStatus(t, s.key)}>
                  {s.label}
                </button>
              ))}
            </div>
            {perms.manageTables && <button className="tile-remove" onClick={() => removeTable(t)}>Remove table</button>}
          </div>
        ))}
      </div>
      {tables.length === 0 && (
        <p className="empty-note">{perms.manageTables ? 'No tables yet. Add the first one above.' : 'No tables have been set up yet. Ask an admin.'}</p>
      )}
    </div>
  )
}
