// One place that defines category colours. Used by the menu key, menu list, order composer and tickets.
export const CATEGORIES = [
  { key: 'Starters', color: '#5A9A5C' },
  { key: 'Mains', color: '#C4572B' },
  { key: 'Breads', color: '#D2A03A' },
  { key: 'Desserts', color: '#B0558A' },
  { key: 'Drinks', color: '#3F7DA8' },
  { key: 'Sides', color: '#7B6AA6' },
]
export const OTHER = { key: 'Other', color: '#8C8577' }

// Tolerant matching so "Dessert", "dessert" and "Desserts" all land in the same group
const norm = (s) => (s || '').trim().toLowerCase().replace(/s$/, '')

export const findCategory = (name) => CATEGORIES.find((c) => norm(c.key) === norm(name)) || OTHER
export const categoryColor = (name) => findCategory(name).color

export function groupByCategory(items) {
  const groups = [...CATEGORIES, OTHER].map((c) => ({ ...c, items: [] }))
  items.forEach((it) => groups.find((g) => g.key === findCategory(it.category).key).items.push(it))
  return groups.filter((g) => g.items.length > 0)
}
