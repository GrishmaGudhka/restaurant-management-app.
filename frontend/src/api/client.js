const BASE_URL = 'http://127.0.0.1:8000'

async function request(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (options.body && !(options.body instanceof URLSearchParams)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      detail = data.detail || detail
    } catch {
      // ignore parse failure, keep statusText
    }
    throw new Error(detail)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  login: (username, password) => {
    const body = new URLSearchParams({ username, password })
    return request('/auth/login', { method: 'POST', body })
  },
  register: (username, password, role) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, role }) }),

  getMenu: () => request('/menu/'),
  createMenuItem: (item) => request('/menu/', { method: 'POST', body: JSON.stringify(item) }),
  deleteMenuItem: (id) => request(`/menu/${id}`, { method: 'DELETE' }),

  getTables: () => request('/tables/'),
  createTable: (table) => request('/tables/', { method: 'POST', body: JSON.stringify(table) }),
  updateTableStatus: (id, status) =>
    request(`/tables/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getOrders: (status) => request(`/orders/${status ? `?status=${status}` : ''}`),
  createOrder: (order) => request('/orders/', { method: 'POST', body: JSON.stringify(order) }),
  updateOrderStatus: (id, status) =>
    request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}
