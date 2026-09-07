import { useEffect, useState } from 'react'
import { api } from '../api/client'

const STATUS_FLOW = ['pending', 'preparing', 'ready', 'served', 'closed']

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [tables, setTables] = useState([])
  const [menu, setMenu] = useState([])
  const [tableId, setTableId] = useState('')
  const [lines, setLines] = useState([]) // { menu_item_id, quantity }
  const [error, setError] = useState('')

  const load = () => {
    api.getOrders().then(setOrders).catch((e) => setError(e.message))
    api.getTables().then(setTables).catch(() => {})
    api.getMenu().then(setMenu).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const addLine = () => setLines([...lines, { menu_item_id: '', quantity: 1 }])
  const updateLine = (i, field, value) => {
    const copy = [...lines]
    copy[i][field] = value
    setLines(copy)
  }
  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i))

  const handleCreateOrder = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.createOrder({
        table_id: parseInt(tableId),
        items: lines
          .filter((l) => l.menu_item_id)
          .map((l) => ({ menu_item_id: parseInt(l.menu_item_id), quantity: parseInt(l.quantity) })),
      })
      setTableId(''); setLines([])
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const advanceStatus = async (order) => {
    const idx = STATUS_FLOW.indexOf(order.status)
    const next = STATUS_FLOW[idx + 1]
    if (!next) return
    try {
      await api.updateOrderStatus(order.id, next)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <h2>Orders</h2>
      {error && <div className="error">{error}</div>}

      <form onSubmit={handleCreateOrder} className="card">
        <h3 style={{ marginTop: 0 }}>New order</h3>
        <select value={tableId} onChange={(e) => setTableId(e.target.value)} required>
          <option value="">Select table</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>Table {t.number}</option>
          ))}
        </select>

        {lines.map((line, i) => (
          <div key={i}>
            <select
              value={line.menu_item_id}
              onChange={(e) => updateLine(i, 'menu_item_id', e.target.value)}
              required
            >
              <option value="">Select item</option>
              {menu.map((m) => (
                <option key={m.id} value={m.id}>{m.name} — ₹{m.price}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={line.quantity}
              onChange={(e) => updateLine(i, 'quantity', e.target.value)}
              style={{ width: 60 }}
            />
            <button type="button" onClick={() => removeLine(i)}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={addLine}>+ Add item</button>
        <div style={{ marginTop: 8 }}>
          <button className="primary" type="submit" disabled={!tableId || lines.length === 0}>
            Place order
          </button>
        </div>
      </form>

      <h3>Active orders</h3>
      {orders.map((order) => (
        <div className="card" key={order.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>Order #{order.id} — Table {order.table_id}</strong>
            <span className="badge">{order.status}</span>
          </div>
          <ul>
            {order.items.map((item) => (
              <li key={item.id}>{item.quantity} × {item.menu_item.name}</li>
            ))}
          </ul>
          <div>Total: ₹{order.total.toFixed(2)}</div>
          {order.status !== 'closed' && (
            <button className="primary" style={{ marginTop: 8 }} onClick={() => advanceStatus(order)}>
              Mark as {STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]}
            </button>
          )}
        </div>
      ))}
      {orders.length === 0 && <p>No orders yet.</p>}
    </div>
  )
}
