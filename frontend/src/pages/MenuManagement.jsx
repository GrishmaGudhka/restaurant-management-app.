import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function MenuManagement() {
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')

  const load = () => api.getMenu().then(setItems).catch((e) => setError(e.message))

  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.createMenuItem({ name, category, price: parseFloat(price) })
      setName(''); setCategory(''); setPrice('')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.deleteMenuItem(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <h2>Menu</h2>
      {error && <div className="error">{error}</div>}

      <form onSubmit={handleAdd} className="card">
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <input
          placeholder="Price"
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <button className="primary" type="submit">Add item</button>
      </form>

      {items.map((item) => (
        <div className="card" key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>{item.name}</strong> — ₹{item.price.toFixed(2)}
            {item.category && <span className="badge" style={{ marginLeft: 8 }}>{item.category}</span>}
            {!item.is_available && <span className="badge" style={{ marginLeft: 8 }}>unavailable</span>}
          </div>
          <button onClick={() => handleDelete(item.id)}>Delete</button>
        </div>
      ))}
      {items.length === 0 && <p>No menu items yet — add one above.</p>}
    </div>
  )
}
