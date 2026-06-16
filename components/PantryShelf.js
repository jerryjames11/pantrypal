import { useState, useRef, useCallback, useEffect } from 'react'
import styles from '../styles/PantryShelf.module.css'

// SVG product illustrations per category name keyword
function CategoryIllustration({ categoryName, status }) {
  const name = (categoryName || '').toLowerCase()
  
  const getIllustration = () => {
    if (name.includes('pantry') || name.includes('dry') || name.includes('grain')) {
      return (
        <svg width="36" height="52" viewBox="0 0 36 52">
          <rect x="2" y="2" width="32" height="48" rx="2" fill="#e8c060" stroke="#c09820" strokeWidth="1.5"/>
          <rect x="4" y="5" width="28" height="12" rx="1" fill="#c09820"/>
          <text x="18" y="13" fontSize="5" fill="#fff" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">PANTRY</text>
          <text x="18" y="32" fontSize="18" textAnchor="middle">🍝</text>
          <line x1="4" y1="40" x2="32" y2="40" stroke="#c09820" strokeWidth="0.7"/>
          <text x="18" y="47" fontSize="4" fill="#a07810" textAnchor="middle" fontFamily="sans-serif">500g</text>
        </svg>
      )
    }
    if (name.includes('frozen')) {
      return (
        <svg width="44" height="32" viewBox="0 0 44 32">
          <rect x="1" y="1" width="42" height="30" rx="3" fill="#d0eeff" stroke="#80b8e8" strokeWidth="1.5"/>
          <rect x="4" y="5" width="36" height="14" rx="2" fill="#4090c8"/>
          <text x="22" y="14" fontSize="5" fill="#fff" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">FROZEN</text>
          <text x="22" y="26" fontSize="9" textAnchor="middle">❄️</text>
        </svg>
      )
    }
    if (name.includes('meat') || name.includes('seafood') || name.includes('fish') || name.includes('poultry')) {
      return (
        <svg width="44" height="30" viewBox="0 0 44 30">
          <rect x="1" y="1" width="42" height="28" rx="4" fill="#f8d8b0" stroke="#d4a060" strokeWidth="1.5"/>
          <ellipse cx="22" cy="14" rx="16" ry="9" fill="#e8906a" stroke="#c06040" strokeWidth="1"/>
          <text x="22" y="18" fontSize="6" fill="#fff" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">🥩</text>
        </svg>
      )
    }
    if (name.includes('produce') || name.includes('vegetable') || name.includes('veggie')) {
      return (
        <svg width="38" height="48" viewBox="0 0 38 48">
          <path d="M8 10 Q8 4 19 4 Q30 4 30 10 L34 42 Q34 46 19 46 Q4 46 4 42 Z" fill="#c8e870" stroke="#90b840" strokeWidth="1.5"/>
          <text x="19" y="30" fontSize="18" textAnchor="middle">🥦</text>
          <text x="19" y="42" fontSize="5" fill="#507820" textAnchor="middle" fontFamily="sans-serif">PRODUCE</text>
        </svg>
      )
    }
    if (name.includes('fruit')) {
      return (
        <svg width="36" height="38" viewBox="0 0 36 38">
          <path d="M6 18 Q6 10 18 10 Q30 10 30 18 L28 34 Q28 36 18 36 Q8 36 8 34 Z" fill="#f8a030" stroke="#d07010" strokeWidth="1.5"/>
          <text x="18" y="26" fontSize="14" textAnchor="middle">🍎</text>
        </svg>
      )
    }
    if (name.includes('dairy') || name.includes('milk') || name.includes('egg')) {
      return (
        <svg width="28" height="54" viewBox="0 0 28 54">
          <rect x="3" y="18" width="22" height="34" rx="1" fill="#f0f8ff" stroke="#b0d0f0" strokeWidth="1.5"/>
          <path d="M3 18 L14 6 L25 18Z" fill="#ddf0ff" stroke="#b0d0f0" strokeWidth="1.5"/>
          <rect x="5" y="24" width="18" height="18" rx="1" fill="#3070c0"/>
          <text x="14" y="34" fontSize="4.5" fill="#fff" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">MILK</text>
        </svg>
      )
    }
    if (name.includes('bak') || name.includes('bread')) {
      return (
        <svg width="48" height="36" viewBox="0 0 48 36">
          <path d="M4 32 Q4 12 24 8 Q44 12 44 32 Z" fill="#c87840" stroke="#a05820" strokeWidth="1.5"/>
          <rect x="4" y="28" width="40" height="6" rx="3" fill="#a05820"/>
          <path d="M8 28 Q24 22 40 28" fill="none" stroke="#d89050" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    }
    if (name.includes('toilet') || name.includes('personal') || name.includes('hygiene') || name.includes('bath')) {
      return (
        <svg width="20" height="52" viewBox="0 0 20 52">
          <rect x="6" y="2" width="8" height="7" rx="3" fill="#7040b0"/>
          <path d="M2 9 Q1 16 1 24 L1 46 Q1 50 10 50 Q19 50 19 46 L19 24 Q19 16 18 9 Z" fill="#9060d0" stroke="#6040b0" strokeWidth="1.5"/>
          <text x="10" y="30" fontSize="3.5" fill="#fff" textAnchor="middle" fontFamily="sans-serif">SHAMPOO</text>
        </svg>
      )
    }
    if (name.includes('household') || name.includes('cleaning') || name.includes('clean')) {
      return (
        <svg width="26" height="50" viewBox="0 0 26 50">
          <rect x="9" y="2" width="14" height="28" rx="3" fill="#40a060" stroke="#208040" strokeWidth="1.5"/>
          <rect x="1" y="8" width="10" height="14" rx="2" fill="#30c070" stroke="#208040" strokeWidth="1"/>
          <rect x="9" y="30" width="14" height="18" rx="3" fill="#50b070" stroke="#208040" strokeWidth="1.5"/>
        </svg>
      )
    }
    if (name.includes('pet') || name.includes('dog') || name.includes('cat')) {
      return (
        <svg width="36" height="46" viewBox="0 0 36 46">
          <rect x="2" y="5" width="32" height="39" rx="4" fill="#8B4010" stroke="#6B2800" strokeWidth="1.5"/>
          <path d="M4 5 L18 1 L32 5" fill="#a05020" stroke="#6B2800" strokeWidth="1.5"/>
          <text x="18" y="28" fontSize="16" textAnchor="middle">🐕</text>
          <text x="18" y="40" fontSize="4" fill="#f0c090" textAnchor="middle" fontFamily="sans-serif">PET FOOD</text>
        </svg>
      )
    }
    if (name.includes('snack') || name.includes('candy') || name.includes('sweet')) {
      return (
        <svg width="32" height="44" viewBox="0 0 32 44">
          <rect x="2" y="2" width="28" height="40" rx="4" fill="#e84080" stroke="#c02060" strokeWidth="1.5"/>
          <text x="16" y="26" fontSize="18" textAnchor="middle">🍬</text>
          <text x="16" y="38" fontSize="4" fill="#fff" textAnchor="middle" fontFamily="sans-serif">SNACKS</text>
        </svg>
      )
    }
    if (name.includes('bever') || name.includes('drink') || name.includes('juice')) {
      return (
        <svg width="22" height="56" viewBox="0 0 22 56">
          <rect x="4" y="2" width="14" height="6" rx="2" fill="#c05020"/>
          <path d="M2 8 Q1 14 1 22 L1 50 Q1 54 11 54 Q21 54 21 50 L21 22 Q21 14 20 8 Z" fill="#e07030" stroke="#c05020" strokeWidth="1.5"/>
          <text x="11" y="34" fontSize="3.5" fill="#fff" textAnchor="middle" fontFamily="sans-serif">JUICE</text>
        </svg>
      )
    }
    // Default — PantryPal basket logo
    return (
      <svg width="44" height="44" viewBox="0 0 44 44">
        <rect x="4" y="4" width="36" height="36" rx="8" fill="#e8f5f0" stroke="#4db88a" strokeWidth="1.5"/>
        <text x="22" y="30" fontSize="22" textAnchor="middle">🧺</text>
      </svg>
    )
  }

  return (
    <div className={styles.illustration} data-status={status}>
      {getIllustration()}
    </div>
  )
}

// Individual draggable category item
function ShelfItem({ cat, shelfIndex, onTap, onDragStart, isDragging }) {
  const pressTimer = useRef(null)
  const didDrag = useRef(false)
  const [pressing, setPressing] = useState(false)

  const handlePointerDown = useCallback((e) => {
    didDrag.current = false
    setPressing(true)
    pressTimer.current = setTimeout(() => {
      didDrag.current = true
      setPressing(false)
      onDragStart(e, cat, shelfIndex)
    }, 500)
  }, [cat, shelfIndex, onDragStart])

  const handlePointerUp = useCallback((e) => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    setPressing(false)
    if (!didDrag.current) {
      onTap(cat)
    }
    didDrag.current = false
  }, [cat, onTap])

  const handlePointerCancel = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    setPressing(false)
    didDrag.current = false
  }, [])

  const status = cat._status

  return (
    <div
      className={`${styles.shelfItem} ${pressing ? styles.pressing : ''} ${isDragging ? styles.dragging : ''}`}
      style={{ left: `calc(${(cat.shelf_x || 0.1) * 100}%)`, transform: 'translateX(-50%)' }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      data-cat-id={cat.id}
    >
      {status !== 'ok' && <div className={`${styles.statusDot} ${styles[status]}`} />}
      <CategoryIllustration categoryName={cat.name} status={status} />
      <div className={styles.catLabel}>{cat.emoji} {cat.name}</div>
    </div>
  )
}

export default function PantryShelf({ categories, pantryItems, onCategoryTap, onPositionUpdate }) {
  const [dragging, setDragging] = useState(null) // { cat, startX, startY, currentX, currentY, originShelf }
  const [ghostPos, setGhostPos] = useState(null)
  const shelfRefs = useRef([])
  const containerRef = useRef(null)

  // Compute status for each category
  const catsWithStatus = categories.map(cat => {
    const items = pantryItems.filter(i => i.category === cat.name)
    const hasOut = items.some(i => i.status === 'out')
    const hasLow = items.some(i => i.status === 'low')
    return { ...cat, _status: hasOut ? 'out' : hasLow ? 'low' : 'ok', _count: items.length }
  })

  // Always auto-spread categories across shelves initially
  // Only use saved position if user has explicitly dragged (shelf_x !== default 0.1 or shelf_number > 1)
  const hasCustomPosition = (c) => c.shelf_number > 1 || (c.shelf_number === 1 && c.shelf_x !== null && c.shelf_x !== undefined && c.shelf_x !== 0.1)
  
  const placed = catsWithStatus.filter(c => hasCustomPosition(c))
  const unplaced = catsWithStatus.filter(c => !hasCustomPosition(c))

  // Build shelves from placed items
  const shelves = Array.from({ length: 6 }, (_, i) => ({
    index: i + 1,
    items: placed
      .filter(c => c.shelf_number === i + 1)
      .sort((a, b) => (a.shelf_x || 0) - (b.shelf_x || 0))
  }))

  // Auto-place unplaced categories spread evenly across all 6 shelves
  const xPositions = [0.12, 0.45, 0.78]
  unplaced.forEach(cat => {
    for (let s = 0; s < 6; s++) {
      if (shelves[s].items.length < 3) {
        const slotIndex = shelves[s].items.length
        shelves[s].items.push({ 
          ...cat, 
          shelf_number: s + 1, 
          shelf_x: xPositions[slotIndex] 
        })
        break
      }
    }
  })

  const handleDragStart = useCallback((e, cat, shelfIndex) => {
    e.currentTarget?.setPointerCapture?.(e.pointerId)
    setDragging({ cat, originShelf: shelfIndex, pointerId: e.pointerId })
    setGhostPos({ x: e.clientX, y: e.clientY })
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return
    setGhostPos({ x: e.clientX, y: e.clientY })
  }, [dragging])

  const handlePointerUp = useCallback((e) => {
    if (!dragging) return
    
    // Find which shelf we're over
    let targetShelf = dragging.originShelf
    let targetX = dragging.cat.shelf_x || 0.1

    shelfRefs.current.forEach((ref, idx) => {
      if (!ref) return
      const rect = ref.getBoundingClientRect()
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        targetShelf = idx + 1
        // Calculate x position as fraction of shelf width
        const rawX = (e.clientX - rect.left) / rect.width
        targetX = Math.max(0.02, Math.min(0.85, rawX))
      }
    })

    // Check if shelf has room (max 3, excluding dragged item)
    const shelfItems = shelves[targetShelf - 1]?.items.filter(c => c.id !== dragging.cat.id) || []
    if (shelfItems.length >= 3) {
      // No room — return to origin
      setDragging(null)
      setGhostPos(null)
      return
    }

    // Avoid overlap — nudge if too close to another item
    let finalX = targetX
    shelfItems.forEach(other => {
      const ox = other.shelf_x || 0.1
      if (Math.abs(finalX - ox) < 0.15) {
        finalX = finalX < ox ? ox - 0.16 : ox + 0.16
      }
    })
    finalX = Math.max(0.02, Math.min(0.82, finalX))

    onPositionUpdate(dragging.cat.id, targetShelf, finalX)
    setDragging(null)
    setGhostPos(null)
  }, [dragging, shelves, onPositionUpdate])

  return (
    <div 
      ref={containerRef}
      className={styles.pantryWrap}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className={styles.pantry}>
        <div className={styles.pantryTop} />
        
        {shelves.map((shelf, idx) => (
          <div key={shelf.index} className={styles.shelfRow}>
            <div className={styles.postLeft} />
            <div 
              className={styles.shelfArea}
              ref={el => shelfRefs.current[idx] = el}
            >
              <div className={styles.shelfPlank}>
                {shelf.items.map(cat => (
                  <ShelfItem
                    key={cat.id}
                    cat={cat}
                    shelfIndex={shelf.index}
                    onTap={onCategoryTap}
                    onDragStart={handleDragStart}
                    isDragging={dragging?.cat?.id === cat.id}
                  />
                ))}
                {/* Add slot if shelf has fewer than 3 items */}
                {shelf.items.length < 3 && (
                  <div className={styles.addSlot}>
                    <div className={styles.addSlotInner}>+</div>
                  </div>
                )}
              </div>
              <div className={styles.shelfBoard} />
            </div>
            <div className={styles.postRight} />
          </div>
        ))}

        <div className={styles.pantryBase} />
      </div>

      {/* Drag ghost */}
      {dragging && ghostPos && (
        <div 
          className={styles.dragGhost}
          style={{ left: ghostPos.x, top: ghostPos.y }}
        >
          <CategoryIllustration categoryName={dragging.cat.name} status={dragging.cat._status} />
          <div className={styles.catLabel}>{dragging.cat.emoji} {dragging.cat.name}</div>
        </div>
      )}
    </div>
  )
}
