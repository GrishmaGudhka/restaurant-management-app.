import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { can } from '../lib/permissions'
import {
  categoryColor,
  findCategory,
  getUniqueCategories,
  groupByCategory,
} from '../lib/categories'

export default function MenuManagement() {
  const { role } = useAuth()
  const perms = can(role)
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [selectedCat, setSelectedCat] = useState('Starters')
  const [customCat, setCustomCat] = useState('')
  const [price, setPrice] = useState('')
  const [filter, setFilter] = useState(null) // null = show all
  const [error, setError] = useState('')

  const isNewCategory = selectedCat === '__NEW__'
  const activeCategory = isNewCategory ? customCat : selectedCat

  const load = () => api.getMenu().then(setItems).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const run = async (action) => {
    try { await action(); setError(''); await load() } catch (err) { setError(err.message) }
  }

  const addItem = (e) => {
    e.preventDefault()
    const finalCat = activeCategory.trim()
    if (!finalCat) return

    run(async () => {
      await api.createMenuItem({ name, category: finalCat, price: parseFloat(price) })
      setName('')
      setPrice('')
      setSelectedCat(finalCat)
      setCustomCat('')
    })
  }

  const removeItem = (item) => {
    if (window.confirm(`Remove "${item.name}" from the menu? Past orders are kept.`)) run(() => api.deleteMenuItem(item.id))
  }

  // Get dynamic unique categories from presets + existing items
  const uniqueCategories = getUniqueCategories(items)

  const countFor = (key) => items.filter((i) => findCategory(i.category).key === key).length
  const groups = groupByCategory(items).filter((g) => !filter || g.key.toLowerCase() === filter.toLowerCase())

  return (
    <div>
      {error && <div className="error">{error}</div>}

      {/* Category filter legend with dynamic colors */}
      <div className="legend" aria-label="Category colour key">
        <button className={`legend-chip ${filter === null ? 'on' : ''}`} onClick={() => setFilter(null)}>
          All <span className="ct">{items.length}</span>
        </button>
        {uniqueCategories.map((c) => {
          const itemCnt = countFor(c.key)
          if (itemCnt === 0 && !['Starters', 'Mains', 'Breads', 'Desserts', 'Drinks', 'Sides'].includes(c.key)) {
            return null // hide custom categories with 0 items
          }
          return (
            <button
              key={c.key}
              className={`legend-chip ${filter === c.key ? 'on' : ''}`}
              style={{ '--c': c.color }}
              onClick={() => setFilter(filter === c.key ? null : c.key)}
            >
              <span className="sw" />
              {c.key} <span className="ct">{itemCnt}</span>
            </button>
          )
        })}
      </div>

      {perms.manageMenu && (
        <div className="chit">
          <h3>Add to the board</h3>
          <form onSubmit={addItem} className="add-dish">
            <input
              placeholder="Dish name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            {/* Editable Category Dropdown & Custom Field */}
            <span className="cat-pick" style={{ '--c': categoryColor(activeCategory || 'Other') }}>
              <span className="sw" />
              <select
                value={selectedCat}
                onChange={(e) => {
                  setSelectedCat(e.target.value)
                  if (e.target.value !== '__NEW__') setCustomCat('')
                }}
              >
                {uniqueCategories.map((c) => (
                  <option key={c.key} value={c.key}>{c.key}</option>
                ))}
                <option value="__NEW__">+ Add new category...</option>
              </select>

              {isNewCategory && (
                <input
                  type="text"
                  placeholder="New category name"
                  value={customCat}
                  onChange={(e) => setCustomCat(e.target.value)}
                  required
                  autoFocus
                  style={{
                    marginLeft: '6px',
                    padding: '4px 6px',
                    width: '130px',
                  }}
                />
              )}
            </span>

            <input
              placeholder="Price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              style={{ width: 100 }}
            />
            <button className="stamp" type="submit">Chalk it up</button>
          </form>
        </div>
      )}

      {groups.map((g) => (
        <section className="menu-group" key={g.key} style={{ '--c': g.color }}>
          <h3><span className="sw" />{g.key}<span className="ct">{g.items.length}</span></h3>
          <ul className="menu-list">
            {g.items.map((item) => (
              <li className={`menu-row ${item.is_available ? '' : 'sold-out'}`} key={item.id}>
                <span className="name">{item.name}</span>
                <span className="leader" />
                <span className="price">₹{item.price.toFixed(2)}</span>
                {perms.toggleAvailability ? (
                  <button className={`stock ${item.is_available ? 'in' : 'out'}`} title="Click to change"
                    onClick={() => run(() => api.setAvailability(item.id, !item.is_available))}>
                    {item.is_available ? 'In stock' : 'Sold out'}
                  </button>
                ) : (
                  !item.is_available && <span className="stock out static">Sold out</span>
                )}
                {perms.manageMenu && <button className="ghost" onClick={() => removeItem(item)}>Remove</button>}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {items.length === 0 && <p className="empty-note">{perms.manageMenu ? 'The board is bare. Add the first dish above.' : 'The menu is empty. Ask an admin to add dishes.'}</p>}
    </div>
  )
}