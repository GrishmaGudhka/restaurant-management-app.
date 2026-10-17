import { categoryColor } from '../lib/categories'
import { NEXT, CANCEL, WAITING, can } from '../lib/permissions'

const money = (n) => `₹${n.toFixed(2)}`
const minutesSince = (iso, now) => Math.max(0, Math.floor((now - Date.parse(iso)) / 60000))

// How long has this ticket been in its current situation, and is that getting worrying?
function urgency(order, now) {
  if (order.status === 'pending' || order.status === 'preparing') {
    const m = minutesSince(order.created_at, now)
    return { level: m < 10 ? 'ok' : m < 20 ? 'warn' : 'late', label: `${m} min` }
  }
  const m = minutesSince(order.status_changed_at, now)
  if (order.status === 'ready') return { level: m < 5 ? 'ok' : m < 10 ? 'warn' : 'late', label: `ready ${m} min` }
  return { level: 'ok', label: `served ${m} min` }
}

export default function TicketCard({ order, role, now, onAdvance, onCancel }) {
  const u = urgency(order, now)
  const next = NEXT[order.status]
  const canAdvance = next && next.roles.includes(role)
  const canCancel = (CANCEL[order.status] || []).includes(role)
  const seePrices = can(role).seePrices
  const billView = seePrices && order.status === 'served'

  return (
    <article className={`ticket ${u.level}`}>
      <header className="ticket-head">
        <div>
          <div className="tnum">T{order.table_number ?? order.table_id}</div>
          <div className="meta">#{String(order.id).padStart(3, '0')}{order.created_by_name ? ` · ${order.created_by_name}` : ''}</div>
        </div>
        <span className="age">{u.label}</span>
      </header>

      <ul className="tlines">
        {order.items.map((item) => (
          <li key={item.id}>
            <div className="row">
              <span>
                <span className="dot" style={{ '--c': categoryColor(item.menu_item.category) }} />
                <b className="q">{item.quantity}×</b>{item.menu_item.name}
              </span>
              {billView && <span>{money(item.quantity * item.unit_price)}</span>}
            </div>
            {item.note && <span className="note">{item.note}</span>}
          </li>
        ))}
      </ul>

      <footer className="ticket-foot">
        {seePrices && <div className="ticket-total"><span>Total</span><span>{money(order.total)}</span></div>}
        {canAdvance
          ? <button className="stamp btn-block" onClick={() => onAdvance(order, next.to)}>{next.label}</button>
          : <div className="waiting">{WAITING[order.status]}</div>}
        {canCancel && <button className="void-link" onClick={() => onCancel(order)}>Cancel ticket</button>}
      </footer>
    </article>
  )
}
