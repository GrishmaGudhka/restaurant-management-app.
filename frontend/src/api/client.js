const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function clearSession() {
  ;['token', 'username', 'role'].forEach((k) => localStorage.removeItem(k))
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body && !(options.body instanceof URLSearchParams)) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  } catch {
    throw new Error("Can't reach the server. Is the backend running?")
  }

  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      detail = Array.isArray(data.detail) ? data.detail.map((d) => d.msg).join('; ') : data.detail || detail
    } catch {
      // keep statusText
    }
    // expired or deactivated session: send the person back to the login screen
    if (res.status === 401 && token && !path.startsWith('/auth/login')) {
      clearSession()
      window.location.reload()
    }
    throw new Error(detail)
  }
  return res.status === 204 ? null : res.json()
}

const json = (method, body) => ({ method, body: JSON.stringify(body) })

export const api = {
  setupStatus: () => request('/auth/setup-status'),
  setup: (username, password) => request('/auth/setup', json('POST', { username, password })),
  login: (username, password) => request('/auth/login', { method: 'POST', body: new URLSearchParams({ username, password }) }),

  getUsers: () => request('/auth/users'),
  createUser: (user) => request('/auth/users', json('POST', user)),
  setUserActive: (id, is_active) => request(`/auth/users/${id}`, json('PATCH', { is_active })),

  getMenu: () => request('/menu/'),
  createMenuItem: (item) => request('/menu/', json('POST', item)),
  deleteMenuItem: (id) => request(`/menu/${id}`, { method: 'DELETE' }),
  setAvailability: (id, is_available) => request(`/menu/${id}/availability`, json('PATCH', { is_available })),

  getTables: () => request('/tables/'),
  createTable: (table) => request('/tables/', json('POST', table)),
  setTableStatus: (id, status) => request(`/tables/${id}/status`, json('PATCH', { status })),
  deleteTable: (id) => request(`/tables/${id}`, { method: 'DELETE' }),

  getOrders: (scope) => request(`/orders/?scope=${scope}`),
  createOrder: (order) => request('/orders/', json('POST', order)),
  setOrderStatus: (id, status) => request(`/orders/${id}/status`, json('PATCH', { status })),
}
