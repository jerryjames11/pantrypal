import { useState, useEffect, useRef } from 'react'
import styles from '../styles/Tour.module.css'

export default function Tour({ steps, onComplete, onSkip }) {
  const [current, setCurrent] = useState(0)
  const [pos, setPos] = useState(null)
  const boxRef = useRef(null)
  const step = steps[current]

  useEffect(() => { setCurrent(0) }, [steps])

  useEffect(() => {
    if (!step?.target) { setPos({ centered: true }); return }
    const el = document.querySelector(step.target)
    if (!el) { setPos({ centered: true }); return }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => {
      const rect = el.getBoundingClientRect()
      setPos({ rect, vw: window.innerWidth, vh: window.innerHeight })
      el.setAttribute('data-tour-highlight', 'true')
    }, 300)
    return () => { if (el) el.removeAttribute('data-tour-highlight') }
  }, [current, step])

  function clearHighlight() {
    if (step?.target) {
      const el = document.querySelector(step.target)
      if (el) el.removeAttribute('data-tour-highlight')
    }
  }

  function next() {
    clearHighlight()
    if (current < steps.length - 1) setCurrent(c => c + 1)
    else onComplete()
  }

  function prev() { clearHighlight(); if (current > 0) setCurrent(c => c - 1) }
  function skip() { clearHighlight(); onSkip() }

  function getStyle() {
    if (!pos || pos.centered || !pos.rect) {
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1002 }
    }
    const { rect, vw, vh } = pos
    const W = 280, H = 200, M = 14
    let top = rect.bottom + M
    if (top + H > vh) top = rect.top - H - M
    if (top < 10) top = 10
    let left = rect.left + rect.width / 2 - W / 2
    left = Math.max(10, Math.min(left, vw - W - 10))
    return { position: 'fixed', top, left, width: W, zIndex: 1002 }
  }

  return (
    <>
      <div className={styles.overlay} onClick={skip} />
      {pos?.rect && (
        <div style={{
          position: 'fixed',
          top: pos.rect.top - 6, left: pos.rect.left - 6,
          width: pos.rect.width + 12, height: pos.rect.height + 12,
          borderRadius: 10, zIndex: 1001, pointerEvents: 'none',
          boxShadow: '0 0 0 4000px rgba(0,0,0,0.6)',
          border: '2px solid #3cb87a'
        }} />
      )}
      <div ref={boxRef} className={styles.tooltip} style={getStyle()}>
        <div className={styles.stepCount}>{current + 1} / {steps.length}</div>
        <div className={styles.stepTitle}>{step?.title}</div>
        <div className={styles.stepBody}>{step?.body}</div>
        <div className={styles.btnRow}>
          <button className={styles.skipBtn} onClick={skip}>Skip</button>
          <div style={{ display: 'flex', gap: 6 }}>
            {current > 0 && <button className={styles.prevBtn} onClick={prev}>← Back</button>}
            <button className={styles.nextBtn} onClick={next}>
              {current === steps.length - 1 ? 'Done ✓' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
