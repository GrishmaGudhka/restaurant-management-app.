import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function TableView() {
  const [tables, setTables] = useState([])
  const [number, setNumber] = useState('')
  const [capacity, setCapacity] = useState('')
  const [error, setError] = useState('')

  const load = () => api.getTables().then(setTables).catch((e) => setError(e.message))

  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.createTable({ number: parseInt(number), capacity: parseInt(capacity) })
      setNumber(''); setCapacity('')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const cycleStatus = async (table) => {
    const next = { free: 'occupied', occupied: 'reserved', reserved: 'free' }[table.status]
    try {
      await api.updateTableStatus(table.id, next)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <h2>Tables</h2>
      {error && <div className="error">{error}</div>}

      <form onSubmit={handleAdd} className="card">
        <input placeholder="Table number" type="number" value={number} onChange={(e) => setNumber(e.target.value)} required />
        <input placeholder="Capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
        <button className="primary" type="submit">Add table</button>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {tables.map((t) => (
          <div
            className="card"
            key={t.id}
            style={{ width: 140, textAlign: 'center', cursor: 'pointer' }}
            onClick={() => cycleStatus(t)}
            title="Click to cycle status"
          >
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>Table {t.number}</div>
            <div>Seats {t.capacity}</div>
            <span className={`badge ${t.status}`}>{t.status}</span>
          </div>
        ))}
      </div>
      {tables.length === 0 && <p>No tables yet — add one above.</p>}
    </div>
  )
}
