import { can } from '../lib/permissions'

export default function TicketCard({ order, role, now, onAdvance, onCancel }) {
  const perms = can(role)
  const seePrices = perms.seePrices

  // Elapsed minutes since creation
  const createdMs = new Date(order.created_at).getTime()
  const ageMins = Math.floor((now - createdMs) / 60000)

  // Ordering round calculations
  const items = order.items || []
  const maxRound = Math.max(...items.map((i) => i.round || 1), 1)

  // Next status mapping
  const nextStatus = {
    pending: 'preparing',
    preparing: 'ready',
    ready: 'served',
    served: 'closed',
  }[order.status]

  const nextLabel = {
    pending: 'Start cooking',
    preparing: 'Pass to rail',
    ready: 'Served',
    served: 'Settle bill & close',
  }[order.status]

  const formatMoney = (val) => `₹${Number(val || 0).toFixed(2)}`

  // Financial breakdown calculations
  const itemsSubtotal = items.reduce(
    (acc, item) => acc + (item.unit_price || 0) * (item.quantity || 1),
    0
  )
  const subtotal = order.subtotal ?? itemsSubtotal
  const taxRate = order.tax_rate ?? 5.0
  const discountAmount = order.discount_amount ?? 0.0
  const taxable = Math.max(0, subtotal - discountAmount)
  const taxAmount = taxable * (taxRate / 100)
  const serviceChargeRate = order.service_charge_rate ?? 0.0
  const serviceChargeAmount = taxable * (serviceChargeRate / 100)
  // Compute grand total from subtotal + GST tax + service charge
  const total = taxable + taxAmount + serviceChargeAmount
  
  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank', 'width=350,height=650')
    if (!printWindow) return

    const itemsHtml = items
      .map(
        (i) => {
          const roundSuffix = maxRound > 1 ? ` <span style="font-size:10px; color:#666;">(R${i.round || 1})</span>` : ''
          return `
          <tr>
            <td>${i.quantity}× ${i.menu_item?.name || 'Dish'}${roundSuffix}</td>
            <td style="text-align: right;">${formatMoney(i.unit_price * i.quantity)}</td>
          </tr>
          ${i.note ? `<tr><td colspan="2" style="font-size: 11px; color: #555; padding-left: 10px;">Note: ${i.note}</td></tr>` : ''}
        `
        }
      )
      .join('')

    const formattedTime = new Date(order.created_at).toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
    })

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${String(order.id).padStart(3, '0')}</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 72mm;
              margin: 0 auto;
              padding: 10px 4px;
              color: #000;
              font-size: 13px;
              line-height: 1.3;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; margin: 4px 0; }
            td { vertical-align: top; padding: 2px 0; }
            .summary-row { font-size: 12px; }
            .total-row { font-size: 15px; font-weight: bold; }
            .footer { margin-top: 12px; font-size: 11px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 18px;">The Corner Table</div>
          <div class="center">Restaurant & Bar</div>
          <div class="divider"></div>
          <div><strong>Order #:</strong> ${String(order.id).padStart(3, '0')}</div>
          <div><strong>Table #:</strong> ${order.table_number || order.table_id}</div>
          <div><strong>Date:</strong> ${formattedTime}</div>
          ${order.created_by_name ? `<div><strong>Server:</strong> ${order.created_by_name}</div>` : ''}
          <div class="divider"></div>
          <table>
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th style="text-align: left;">Item</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="divider"></div>
          <table>
            <tr class="summary-row">
              <td>Subtotal:</td>
              <td style="text-align: right;">${formatMoney(subtotal)}</td>
            </tr>
            ${
              discountAmount > 0
                ? `
            <tr class="summary-row">
              <td>Discount:</td>
              <td style="text-align: right;">-${formatMoney(discountAmount)}</td>
            </tr>`
                : ''
            }
            ${
              taxRate > 0
                ? `
            <tr class="summary-row">
              <td>GST / Tax (${taxRate}%):</td>
              <td style="text-align: right;">${formatMoney(taxAmount)}</td>
            </tr>`
                : ''
            }
            ${
              serviceChargeRate > 0
                ? `
            <tr class="summary-row">
              <td>Service Charge (${serviceChargeRate}%):</td>
              <td style="text-align: right;">${formatMoney(serviceChargeAmount)}</td>
            </tr>`
                : ''
            }
            <tr class="divider"><td colspan="2"></td></tr>
            <tr class="total-row">
              <td>Total Payable:</td>
              <td style="text-align: right;">${formatMoney(total)}</td>
            </tr>
          </table>
          <div class="divider"></div>
          <div class="footer">
            Thank you for dining with us!<br/>
            Please visit again.
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className={`ticket-card status-${order.status}`}>
      <div className="ticket-header">
        <div className="table-info">
          <span className="table-badge">Table {order.table_number || order.table_id}</span>
          <span className="order-id">#{String(order.id).padStart(3, '0')}</span>
          {maxRound > 1 && (
            <span className="round-badge" style={{ fontSize: '11px', marginLeft: '6px', opacity: 0.85 }}>
              Round {maxRound}
            </span>
          )}
        </div>
        <span className={`age-badge ${ageMins > 15 ? 'urgent' : ''}`}>
          {ageMins < 1 ? 'Just now' : `${ageMins}m ago`}
        </span>
      </div>

      <div className="ticket-items">
        {items.map((item, idx) => {
          const itemRound = item.round || 1
          const isLatestRound = itemRound === maxRound && maxRound > 1
          const isPastRound = itemRound < maxRound

          return (
            <div
              className={`item-row ${isPastRound ? 'past-round' : ''}`}
              key={item.id || idx}
              style={{ opacity: isPastRound ? 0.55 : 1.0 }}
            >
              <span className="qty">{item.quantity}×</span>
              <span className="item-name">
                {item.menu_item?.name || 'Dish'}
                {isLatestRound && (
                  <strong style={{ color: '#059669', marginLeft: '4px', fontSize: '10px' }}>(NEW)</strong>
                )}
                {isPastRound && (
                  <span style={{ color: '#6b7280', marginLeft: '4px', fontSize: '10px' }}>
                    (R{itemRound})
                  </span>
                )}
              </span>
              {seePrices && (
                <span className="item-price">
                  {formatMoney(item.unit_price * item.quantity)}
                </span>
              )}
              {item.note && <div className="item-note">Note: {item.note}</div>}
            </div>
          )
        })}
      </div>

      <div className="ticket-footer">
        {seePrices && (
          <div className="ticket-breakdown" style={{ width: '100%', marginBottom: '8px' }}>
            {taxAmount > 0 && (
              <div
                className="breakdown-sub"
                style={{
                  fontSize: '11px',
                  opacity: 0.8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '2px',
                }}
              >
                <span>Subtotal: {formatMoney(subtotal)}</span>
                <span>Tax ({taxRate}%): {formatMoney(taxAmount)}</span>
              </div>
            )}
            <div
              className="ticket-total"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>Total:</span>
              <strong>{formatMoney(total)}</strong>
            </div>
          </div>
        )}

        <div className="ticket-actions">
          {seePrices &&
            (order.status === 'served' || order.status === 'ready' || order.status === 'closed') && (
              <button
                className="ghost print-btn"
                onClick={handlePrintReceipt}
                title="Print Customer Receipt"
              >
                🖨️ Print Receipt
              </button>
            )}

          {nextStatus && perms.advanceStatus && (
            <button className="stamp advance-btn" onClick={() => onAdvance(order, nextStatus)}>
              {nextLabel}
            </button>
          )}

          {perms.cancelOrder && order.status !== 'closed' && (
            <button className="ghost cancel-btn" onClick={() => onCancel(order)}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}