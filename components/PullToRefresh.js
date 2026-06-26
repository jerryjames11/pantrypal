import { useRef, useState, useCallback } from 'react'

// Lightweight pull-to-refresh wrapper. Wrap page content in this; it detects
// a downward swipe starting from the very top of the scroll container and
// calls onRefresh once the user pulls past the threshold and releases.
// Purely additive — a visible refresh icon button elsewhere on the page
// still works independently of this gesture.
export default function PullToRefresh({ onRefresh, refreshing, children }) {
  const containerRef = useRef(null)
  const startY = useRef(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [dragging, setDragging] = useState(false)
  const THRESHOLD = 70

  const handleTouchStart = useCallback((e) => {
    const el = containerRef.current
    if (!el) return
    // Only start tracking if we're scrolled to the very top — otherwise this
    // would hijack normal scrolling mid-list.
    if (el.scrollTop <= 0) {
      startY.current = e.touches[0].clientY
      setDragging(true)
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null || refreshing) return
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, 100)) // damped pull, capped
    }
  }, [refreshing])

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > THRESHOLD && !refreshing) {
      onRefresh()
    }
    setPullDistance(0)
    setDragging(false)
    startY.current = null
  }, [pullDistance, refreshing, onRefresh])

  const showHint = dragging && pullDistance > 10

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative' }}
    >
      {(showHint || refreshing) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: 8, background: '#e8f5f0', borderRadius: 8, marginBottom: 12,
          fontSize: 12, color: '#2d8a6b', fontWeight: 600,
          opacity: refreshing ? 1 : Math.min(pullDistance / THRESHOLD, 1),
          transform: `scale(${refreshing ? 1 : Math.min(0.85 + pullDistance / THRESHOLD * 0.15, 1)})`
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={refreshing ? { animation: 'spin 0.8s linear infinite' } : { transform: `rotate(${Math.min(pullDistance / THRESHOLD, 1) * 180}deg)` }}>
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          {refreshing ? 'Refreshing…' : pullDistance > THRESHOLD ? 'Release to refresh' : 'Pull down to refresh'}
        </div>
      )}
      {children}
    </div>
  )
}
