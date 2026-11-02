// Dynamic Category & Unique Color Management Utility

export const PRESET_CATEGORIES = [
  { key: 'Starters', color: '#5A9A5C' }, // Green
  { key: 'Mains', color: '#C4572B' },    // Terracotta / Rust
  { key: 'Breads', color: '#D2A03A' },   // Gold / Mustard
  { key: 'Desserts', color: '#B0558A' }, // Berry / Pink
  { key: 'Drinks', color: '#3F7DA8' },   // Slate Blue
  { key: 'Sides', color: '#7B6AA6' },    // Muted Purple
]

export const CATEGORIES = PRESET_CATEGORIES
export const OTHER = { key: 'Other', color: '#8C8577' }

// Extended palette of distinct colors chosen specifically to avoid overlapping preset colors
const EXTENDED_PALETTE = [
  '#E67E22', // Bright Amber Orange (Distinct from Mains)
  '#1ABC9C', // Turquoise Teal
  '#2ECC71', // Bright Emerald Green
  '#9B59B6', // Deep Violet
  '#E74C3C', // Coral Red
  '#34495E', // Slate Charcoal
  '#D35400', // Burnt Cinnamon
  '#16A085', // Dark Cyan
  '#8E44AD', // Rich Plum
  '#F39C12', // Golden Sun
  '#2980B9', // Ocean Blue
  '#27AE60', // Forest Green
  '#C0392B', // Crimson
  '#884EA0'  // Royal Purple
]

// Normalization helper so "Pastry", "pastries", and "Pastries" resolve consistently
const norm = (s) => (s || '').trim().toLowerCase().replace(/s$/, '')

/**
 * Dynamically retrieves all unique categories and assigns an unused color to every new category
 */
export function getUniqueCategories(items = []) {
  const map = new Map()
  const usedColors = new Set()

  // 1. Register preset categories first
  PRESET_CATEGORIES.forEach((cat) => {
    const normKey = norm(cat.key)
    map.set(normKey, cat)
    usedColors.add(cat.color.toUpperCase())
  })

  // Filter palette so custom categories only pick colors NOT used by preset categories
  const availablePalette = EXTENDED_PALETTE.filter(
    (hex) => !usedColors.has(hex.toUpperCase())
  )

  let customIndex = 0

  // 2. Assign distinct unused palette colors to each new custom category
  items.forEach((item) => {
    if (item.category && item.category.trim()) {
      const rawName = item.category.trim()
      const normKey = norm(rawName)

      if (!map.has(normKey)) {
        const color = availablePalette[customIndex % availablePalette.length]
        customIndex++
        map.set(normKey, { key: rawName, color })
      }
    }
  })

  return Array.from(map.values())
}

/**
 * Finds category details by name, leveraging dynamic categories from items list
 */
export const findCategory = (name, items = []) => {
  if (!name || !name.trim()) return OTHER

  const cleanName = name.trim()
  const normKey = norm(cleanName)

  // Check preset categories first
  const presetMatch = PRESET_CATEGORIES.find((c) => norm(c.key) === normKey)
  if (presetMatch) return presetMatch

  // Check dynamic categories built from current items
  const allCats = getUniqueCategories(items)
  const dynamicMatch = allCats.find((c) => norm(c.key) === normKey)
  if (dynamicMatch) return dynamicMatch

  // Deterministic fallback if items array is empty
  let hash = 0
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash)
  }
  const fallbackColor = EXTENDED_PALETTE[Math.abs(hash) % EXTENDED_PALETTE.length]
  return { key: cleanName, color: fallbackColor }
}

export const categoryColor = (name, items = []) => findCategory(name, items).color

/**
 * Dynamically groups menu or order items by category
 */
export function groupByCategory(items = []) {
  const uniqueCats = getUniqueCategories(items)
  const groupsMap = new Map()

  uniqueCats.forEach((catObj) => {
    groupsMap.set(norm(catObj.key), { key: catObj.key, color: catObj.color, items: [] })
  })

  items.forEach((item) => {
    const catName = (item.category || 'Other').trim()
    const normKey = norm(catName)

    if (groupsMap.has(normKey)) {
      groupsMap.get(normKey).items.push(item)
    } else {
      const catObj = findCategory(catName, items)
      groupsMap.set(normKey, { key: catObj.key, color: catObj.color, items: [item] })
    }
  })

  return Array.from(groupsMap.values()).filter((g) => g.items.length > 0)
}