// What each role may see and do. The backend enforces the same rules; this just hides what you can't use.
export const TAB_LABELS = { floor: 'Floor', menu: 'Menu board', orders: 'Ticket rail', team: 'Team' }

export const TABS_BY_ROLE = {
  admin: ['floor', 'menu', 'orders', 'team'],
  staff: ['floor', 'menu', 'orders'],
  kitchen: ['orders', 'menu'],
}

export const can = (role) => {
  const r = (role || '').toLowerCase()

  return {
    manageTables: r === 'admin',
    setTableStatus: r === 'admin' || r === 'staff',
    manageMenu: r === 'admin',
    manageUsers: r === 'admin',
    toggleAvailability: r === 'admin' || r === 'kitchen',
    createOrder: r === 'admin' || r === 'staff',
    seePrices: r === 'admin' || r === 'staff',
    advanceStatus: r === 'admin' || r === 'kitchen' || r === 'staff',
    cancelOrder: r === 'admin' || r === 'staff',
  }
}

// Ticket lifecycle: who can push a ticket to its next stage
export const NEXT = {
  pending: { to: 'preparing', label: 'Start cooking', roles: ['kitchen', 'admin'] },
  preparing: { to: 'ready', label: 'Mark ready', roles: ['kitchen', 'admin'] },
  ready: { to: 'served', label: 'Mark served', roles: ['staff', 'admin'] },
  served: { to: 'closed', label: 'Close bill', roles: ['staff', 'admin'] },
}

export const CANCEL = {
  pending: ['staff', 'admin'],
  preparing: ['admin'],
  ready: ['admin'],
  served: ['admin'],
}

export const WAITING = {
  pending: 'Waiting for the kitchen',
  preparing: 'In the kitchen',
  ready: 'Waiting for a server',
  served: 'Waiting for the bill',
}