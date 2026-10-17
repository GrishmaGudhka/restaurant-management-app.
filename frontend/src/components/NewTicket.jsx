import { useMemo, useState } from 'react'
import { api } from '../api/client'
import { groupByCategory, categoryColor } from '../lib/categories'

export default function NewTicket({ tables, menu, onDone, onCancel }) {
  const [tableId, setTableId] = useState(null)
  const [cart, setCart] = useState([]) // { id, name, price, category, quantity, note }
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const groups = useMemo(() => groupByCategory(menu), [menu])
  const total = cart.reduce((sum, l) => sum + l.price * l.quantity, 0)

  const add = (m) =>
    setCart((c) =>
      c.some((l) => l.id === m.id)
        ? c.map((l) => (l.id === m.id ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l))
        : [...c, { id: m.id, name: m.name, price: m.price, category: m.category, quantity: 1, note: '' }]
    )
  const change = (id, delta) =>
    setCart((c) => c.map((l) => (l.id === id ? { ...l, quantity: Math.min(50, l.quantity + delta) } : l)).filter((l) => l.quantity > 0))
  const setNote = (id, note) => setCart((c) => c.map((l) => (l.id === id ? { ...l, note } : l)))

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      await api.createOrder({
        table_id: tableId,
        items: cart.map((l) => ({ menu_item_id: l.id, quantity: l.quantity, note: l.note.trim() || null })),
      })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="composer">
      <div>
        <h3>1. Pick the table</h3>
        <div className="table-picker">
          {tables.map((t) => (
            <button key={t.id} type="button" className={`pick ${tableId === t.id ? 'on' : ''}`} onClick={() => setTableId(t.id)}>
              <span className="dot" style={{ background: `var(--st-${t.status})` }} />T{t.number}
            </button>
          ))}
          {tables.length === 0 && <span className="empty-note">No tables yet. An admin needs to add some on the Floor tab.</span>}
        </div>

        <h3>2. Tap dishes to add them</h3>
        {groups.map((g) => (
          <div key={g.key} className="dish-group">
            <div className="dish-group-title" style={{ '--c': g.color }}><span className="sw" />{g.key}</div>
            <div className="dish-grid">
              {g.items.map((m) => (
                <button key={m.id} type="button" className="dish" style={{ '--c': categoryColor(m.category) }} disabled={!m.is_available} onClick={() => add(m)}>
                  <span className="dn">{m.name}</span>
                  <span className="dp">{m.is_available ? `₹${m.price}` : 'Sold out'}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {menu.length === 0 && <span className="empty-note">The menu is empty.</span>}
      </div>

      <div className="cart">
        <h3>3. Ticket</h3>
        {cart.length === 0 && <p className="empty-note">Nothing added yet.</p>}
        {cart.map((l) => (
          <div className="cart-line" key={l.id}>
            <div className="cart-top">
              <span><span className="dot" style={{ '--c': categoryColor(l.category) }} />{l.name}</span>
              <span className="qty">
                <button type="button" onClick={() => change(l.id, -1)} aria-label={`One less ${l.name}`}>−</button>
                <b>{l.quantity}</b>
                <button type="button" onClick={() => change(l.id, 1)} aria-label={`One more ${l.name}`}>+</button>
              </span>
            </div>
            <input className="note" placeholder="Note for the kitchen (e.g. no onion)" maxLength={200} value={l.note} onChange={(e) => setNote(l.id, e.target.value)} />
          </div>
        ))}
        <div className="cart-total"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
        {error && <div className="error">{error}</div>}
        <button className="stamp" disabled={busy || !tableId || cart.length === 0} onClick={send}>
          {busy ? 'Sending…' : 'Send to kitchen'}
        </button>
        <button className="void-link" type="button" onClick={onCancel}>Close without sending</button>
      </div>
    </div>
  )
}
