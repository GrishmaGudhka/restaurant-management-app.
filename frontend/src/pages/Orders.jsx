import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { can } from '../lib/permissions'
import TicketCard from '../components/TicketCard'
import NewTicket from '../components/NewTicket'

const LANES = [
  { key: 'pending', title: 'New' },
  { key: 'preparing', title: 'Cooking' },
  { key: 'ready', title: 'Ready to serve' },
  { key: 'served', title: 'Awaiting bill' },
]
const EMPTY = { pending: 'No new tickets', preparing: 'Nothing on the stove', ready: 'Nothing waiting on the pass', served: 'No open bills' }

export default function Orders() {
  const { role } = useAuth()
  const canCreate = can(role).createOrder
  const seePrices = can(role).seePrices
  const lanes = role === 'kitchen' ? LANES.slice(0, 3) : LANES // the kitchen doesn't deal with bills

  const [orders, setOrders] = useState([])
  const [tables, setTables] = useState([])
  const [menu, setMenu] = useState([])
  const [history, setHistory] = useState([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [composing, setComposing] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [o, t, m, h] = await Promise.all([
        api.getOrders('active'),
        canCreate ? api.getTables() : [],
        canCreate ? api.getMenu() : [],
        historyOpen && seePrices ? api.getOrders('history') : null,
      ])
      setOrders(o); setTables(t); setMenu(m)
      if (h) setHistory(h)
      setNow(Date.now())
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [canCreate, seePrices, historyOpen])

  // The rail refreshes by itself, so a ticket fired at the front of house shows up in the kitchen within seconds
  useEffect(() => {
    load()
    const poll = setInterval(load, 6000)
    return () => clearInterval(poll)
  }, [load])

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 15000) // keeps the minute counters moving
    return () => clearInterval(tick)
  }, [])

  const advance = async (order, to) => {
    try { await api.setOrderStatus(order.id, to); await load() } catch (err) { setError(err.message) }
  }
  const cancel = (order) => {
    if (window.confirm(`Cancel ticket #${String(order.id).padStart(3, '0')} for Table ${order.table_number}?`)) advance(order, 'cancelled')
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}

      <div className="board-bar">
        <span className="live"><span className="pulse" />{orders.length} open ticket{orders.length === 1 ? '' : 's'} · updates automatically</span>
        {canCreate && !composing && <button className="stamp" onClick={() => setComposing(true)}>New ticket</button>}
      </div>

      {composing && canCreate && (
        <NewTicket tables={tables} menu={menu} onCancel={() => setComposing(false)} onDone={() => { setComposing(false); load() }} />
      )}

      <div className="board">
        {lanes.map((lane) => {
          const inLane = orders.filter((o) => o.status === lane.key)
          return (
            <section className="lane" key={lane.key}>
              <div className="lane-head"><h3>{lane.title}</h3><span className="lane-count">{inLane.length}</span></div>
              {inLane.map((o) => <TicketCard key={o.id} order={o} role={role} now={now} onAdvance={advance} onCancel={cancel} />)}
              {inLane.length === 0 && <div className="lane-empty">{EMPTY[lane.key]}</div>}
            </section>
          )
        })}
      </div>

      {seePrices && (
        <details className="history" onToggle={(e) => setHistoryOpen(e.currentTarget.open)}>
          <summary>Closed and cancelled in the last 24 hours</summary>
          {history.length === 0 && <p className="empty-note">Nothing yet.</p>}
          {history.map((o) => (
            <div className="hist-row" key={o.id}>
              <span>#{String(o.id).padStart(3, '0')}</span>
              <span>T{o.table_number}</span>
              <span className={`status-pill ${o.status}`}>{o.status}</span>
              <span className="grow">{o.items.map((i) => `${i.quantity}× ${i.menu_item.name}`).join(', ')}</span>
              <span>{o.status === 'closed' ? `₹${o.total.toFixed(2)}` : '—'}</span>
            </div>
          ))}
        </details>
      )}
    </div>
  )
}
