import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import styles from '../styles/Home.module.css'

function fmt(n) { return n != null ? `$${Number(n).toFixed(2)}` : '' }

function PriceDelta({ delta }) {
  if (delta == null || delta === 0) return null
  const up = delta > 0
  return (
    <span className={up ? styles.priceUp : styles.priceDown}>
      {up ? '▲' : '▼'} {fmt(Math.abs(delta))}
    </span>
  )
}

function Spinner() {
  return <span className={styles.spinner} />
}

export default function PantryPal() {
  const [tab, setTab] = useState('pantry')
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [pantry, setPantry] = useState([])
  const [pantryLoading, setPantryLoading] = useState(false)
  const [pantryFilter, setPantryFilter] = useState('all')
  const [manualName, setManualName] = useState('')
  const [manualStatus, setManualStatus] = useState('fresh')

  const [previewSrc, setPreviewSrc] = useState(null)
  const [imgBase64, setImgBase64] = useState(null)
  const [imgMime, setImgMime] = useState(null)
  const [receiptText, setReceiptText] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanResult, setScanResult] = useState(null)

  const [receipts, setReceipts] = useState([])
  const [receiptsLoading, setReceiptsLoading] = useState(false)
  const [expandedReceipt, setExpandedReceipt] = useState(null)

  const [recipes, setRecipes] = useState([])
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [openSteps, setOpenSteps] = useState({})

  const [toast, setToast] = useState('')

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      loadPantry()
      loadReceipts()
    } else if (!authLoading) {
      setPantry([])
      setReceipts([])
    }
  }, [user, authLoading])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setPantry([])
    setReceipts([])
    showToast('Signed out')
  }

  async function loadPantry() {
    if (!user) return
    setPantryLoading(true)
    const res = await fetch(`/api/pantry?user_id=${user.id}`)
    const data = await res.json()
    setPantry(data.items || [])
    setPantryLoading(false)
  }

  async function addManual() {
    const name = manualName.trim()
    if (!name || !user) return
    await fetch(`/api/pantry?user_id=${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, status: manualStatus, qty: '' })
    })
    setManualName('')
    showToast(`Added: ${name}`)
    loadPantry()
  }

  async function updateStatus(id, status) {
    setPantry(p => p.map(i => i.id === id ? { ...i, status } : i))
    await fetch(`/api/pantry?user_id=${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    })
  }

  async function removeItem(id, name) {
    setPantry(p => p.filter(i => i.id !== id))
    await fetch(`/api/pantry?user_id=${user.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    showToast(`Removed: ${name}`)
  }

  function loadFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 1200
        let w = img.width, h = img.height
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
          else { w = Math.round(w * maxSize / h); h = maxSize }
        }
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        const compressed = canvas.toDataURL('image/jpeg', 0.7)
        const base64 = compressed.split(',')[1]
        setPreviewSrc(compressed)
        setImgBase64(base64)
        setImgMime('image/jpeg')
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  function clearImage() {
    setPreviewSrc(null)
    setImgBase64(null)
    setImgMime(null)
  }

  async function doScan(body) {
    if (!user) {
      showToast('Sign in to scan receipts')
      return
    }
    setScanLoading(true)
    setScanResult(null)
    try {
      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, userId: user.id })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setScanResult({ receipt: data.receipt, items: data.items })
      clearImage()
      setReceiptText('')
      showToast(`${data.items.length} items added to pantry`)
      loadPantry()
      loadReceipts()
    } catch (e) {
      setScanResult({ error: e.message || 'Could not parse receipt' })
    }
    setScanLoading(false)
  }

  async function loadReceipts() {
    if (!user) return
    setReceiptsLoading(true)
    const res = await fetch(`/api/receipts?user_id=${user.id}`)
    const data = await res.json()
    setReceipts(data.receipts || [])
    setReceiptsLoading(false)
  }

  async function deleteReceipt(id) {
    setReceipts(r => r.filter(x => x.id !== id))
    await fetch(`/api/receipts?user_id=${user.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    showToast('Receipt deleted')
  }

  async function getRecipes() {
    const avail = pantry.filter(i => i.status !== 'out').map(i => i.name)
    if (avail.length < 2) return
    setRecipeLoading(true)
    setRecipes([])
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: avail })
      })
      const data = await res.json()
      setRecipes(data.recipes || [])
    } catch {
      setRecipes([])
    }
    setRecipeLoading(false)
  }

  const filtered = pantryFilter === 'all' ? pantry : pantry.filter(i => i.status === pantryFilter)
  const stats = {
    total: pantry.length,
    fresh: pantry.filter(i => i.status === 'fresh').length,
    low: pantry.filter(i => i.status === 'low').length,
  }

  if (authLoading) {
    return <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh'}}><Spinner /></div>
  }

  return (
    <div className={styles.app}>

      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <span style={{fontSize:28}}>🧺</span>
          <div>
            <div className={styles.appTitle}>PantryPal</div>
            <div className={styles.appSub}>Track groceries · discover recipes</div>
          </div>
        </div>
        <div>
          {user ? (
            <div className={styles.userArea}>
              {user.user_metadata?.avatar_url && (
                <img src={user.user_metadata.avatar_url} alt="" className={styles.avatar} />
              )}
              <button className={styles.authBtn} onClick={signOut}>Sign out</button>
            </div>
          ) : (
            <button className={styles.googleBtn} onClick={signInWithGoogle}>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{flexShrink:0}}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      {!user && (
        <div className={styles.guestBanner}>
          <strong>Sign in</strong> to save your pantry and access it from any device.
        </div>
      )}

      {/* TABS */}
      <nav className={styles.tabs}>
        {[['pantry','📋','Pantry'],['scan','📷','Scan'],['history','🧾','History'],['recipes','🍳','Recipes']].map(([id, icon, label]) => (
          <button key={id}
            className={tab === id ? `${styles.tabBtn} ${styles.activeTab}` : styles.tabBtn}
            onClick={() => setTab(id)}>
            {icon} {label}
          </button>
        ))}
      </nav>

      {/* ── PANTRY ── */}
      {tab === 'pantry' && (
        <section>
          <div className={styles.statsRow}>
            <div className={styles.statCard}><div className={styles.statVal}>{stats.total}</div><div className={styles.statLbl}>Tracked</div></div>
            <div className={styles.statCard}><div className={styles.statVal}>{stats.fresh}</div><div className={styles.statLbl}>In stock</div></div>
            <div className={styles.statCard}><div className={styles.statVal}>{stats.low}</div><div className={styles.statLbl}>Running low</div></div>
          </div>

          <div className={styles.filterRow}>
            {['all','fresh','low','out'].map(f => (
              <button key={f}
                className={pantryFilter === f ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                onClick={() => setPantryFilter(f)}>
                {f === 'all' ? 'All' : f === 'fresh' ? '✓ In stock' : f === 'low' ? '↓ Low' : '✕ Out'}
              </button>
            ))}
          </div>

          <div className={styles.inputRow}>
            <input type="text" value={manualName} placeholder="Add item manually…"
              onChange={e => setManualName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addManual()} />
            <select value={manualStatus} onChange={e => setManualStatus(e.target.value)}>
              <option value="fresh">In stock</option>
              <option value="low">Low</option>
              <option value="out">Out</option>
            </select>
            <button onClick={addManual}>+ Add</button>
          </div>

          {pantryLoading ? (
            <div className={styles.loadRow}><Spinner /> Loading…</div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              {stats.total === 0 ? 'No items yet — scan a receipt or add items above' : 'Nothing in this category'}
            </div>
          ) : (
            <div className={styles.itemsGrid}>
              {filtered.map(item => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemName} title={item.name}>{item.name}</div>
                  <div className={styles.itemRow2}>
                    <span className={styles.itemQty}>{item.qty || ''}</span>
                    {item.last_price != null && <span className={styles.itemPrice}>{fmt(item.last_price)}</span>}
                  </div>
                  <div className={styles.itemFoot}>
                    <select
                      className={`${styles.statusSel} ${styles['s_' + item.status]}`}
                      value={item.status}
                      onChange={e => updateStatus(item.id, e.target.value)}>
                      <option value="fresh">✓ In stock</option>
                      <option value="low">↓ Low</option>
                      <option value="out">✕ Out</option>
                    </select>
                    <button className={styles.iconBtn} onClick={() => removeItem(item.id, item.name)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── SCAN ── */}
      {tab === 'scan' && (
        <section>
          {!user && (
            <div className={styles.warnBanner}>Sign in to save scanned receipts to your account.</div>
          )}

          <p className={styles.sectionLabel}>Upload a receipt photo</p>

          {!previewSrc && (
            <div className={styles.uploadBtns}>
              <label className={styles.uploadLabel}>
                📁 Choose from files
                <input type="file" accept="image/*" onChange={e => loadFile(e.target.files[0])} hidden />
              </label>
              <label className={styles.uploadLabel}>
                📷 Take a photo
                <input type="file" accept="image/*" capture="environment" onChange={e => loadFile(e.target.files[0])} hidden />
              </label>
            </div>
          )}

          {previewSrc && (
            <div style={{marginBottom:12}}>
              <img src={previewSrc} alt="Receipt" style={{width:'100%',maxHeight:280,objectFit:'contain',borderRadius:10,border:'1px solid #eee',display:'block'}} />
              <button onClick={clearImage} style={{marginTop:6,fontSize:12,padding:'4px 10px',cursor:'pointer'}}>✕ Clear</button>
            </div>
          )}

          {previewSrc && !scanLoading && (
            <button className={styles.scanBtn} onClick={() => doScan({ imageBase64: imgBase64, imageMime })}>
              ✨ Read receipt with AI
            </button>
          )}

          {scanLoading && (
            <div className={styles.loadRow}><Spinner /> Scanning receipt…</div>
          )}

          <div className={styles.divider}>or paste receipt text</div>

          <textarea
            className={styles.textarea}
            value={receiptText}
            onChange={e => setReceiptText(e.target.value)}
            rows={5}
            placeholder="Paste receipt text, grocery list, or type items and prices…"
          />

          {!scanLoading && (
            <button
              className={styles.scanBtn}
              style={{marginTop:8}}
              disabled={!receiptText.trim()}
              onClick={() => doScan({ text: receiptText })}>
              ✓ Parse text with AI
            </button>
          )}

          {scanResult && !scanResult.error && (
            <div className={styles.scanSuccess}>
              <div className={styles.scanSuccessHead}>
                <span>✓ {scanResult.items.length} items added</span>
                <span className={styles.storeName}>{scanResult.receipt?.store_name}</span>
              </div>
              <div className={styles.scanItemList}>
                {scanResult.items.map((item, i) => (
                  <div key={i} className={styles.scanItem}>
                    <span className={styles.scanItemName}>{item.name}</span>
                    <span className={styles.scanItemRight}>
                      {item.price != null && <span className={styles.scanItemPrice}>{fmt(item.price)}</span>}
                      <PriceDelta delta={item.price_delta} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {scanResult?.error && (
            <div className={styles.errBox}>{scanResult.error}</div>
          )}
        </section>
      )}

      {/* ── HISTORY ── */}
      {tab === 'history' && (
        <section>
          {!user ? (
            <div className={styles.empty}>Sign in to view your receipt history.</div>
          ) : receiptsLoading ? (
            <div className={styles.loadRow}><Spinner /> Loading receipts…</div>
          ) : receipts.length === 0 ? (
            <div className={styles.empty}>No receipts yet — scan one from the Scan tab.</div>
          ) : receipts.map(r => (
            <div key={r.id} className={styles.receiptCard}>
              <div className={styles.receiptHeader} onClick={() => setExpandedReceipt(expandedReceipt === r.id ? null : r.id)}>
                <div className={styles.receiptMeta}>
                  <div className={styles.receiptStore}>{r.store_name}</div>
                  <div className={styles.receiptDate}>
                    {r.receipt_date
                      ? new Date(r.receipt_date).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' })
                      : new Date(r.created_at).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' })
                    }
                    {' · '}{r.item_count} item{r.item_count !== 1 ? 's' : ''}
                    {r.total_amount != null && <> · <strong>{fmt(r.total_amount)}</strong></>}
                  </div>
                </div>
                <div className={styles.receiptActions}>
                  <button className={styles.iconBtn}
                    onClick={e => { e.stopPropagation(); deleteReceipt(r.id) }}>🗑</button>
                  <span className={styles.chevron}>{expandedReceipt === r.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expandedReceipt === r.id && (
                <div className={styles.receiptItems}>
                  <div className={styles.receiptItemsHead}>
                    <span>Item</span><span>Qty</span><span>Price</span><span>Change</span>
                  </div>
                  {(r.receipt_items || []).map(item => (
                    <div key={item.id} className={styles.receiptItemRow}>
                      <span className={styles.riName}>{item.name}</span>
                      <span className={styles.riQty}>{item.qty || '—'}</span>
                      <span className={styles.riPrice}>{item.price != null ? fmt(item.price) : '—'}</span>
                      <span><PriceDelta delta={item.price_delta} /></span>
                    </div>
                  ))}
                  {(r.receipt_items || []).length === 0 && (
                    <div className={styles.receiptEmpty}>No item details saved.</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* ── RECIPES ── */}
      {tab === 'recipes' && (
        <section>
          <button className={styles.scanBtn} style={{marginBottom:16}} onClick={getRecipes} disabled={recipeLoading}>
            {recipeLoading ? 'Finding matches…' : '✨ Suggest recipes from my pantry'}
          </button>

          {pantry.filter(i => i.status !== 'out').length < 2 && !recipeLoading && recipes.length === 0 && (
            <div className={styles.empty}>Add at least a couple of items to your pantry first.</div>
          )}

          {recipes.map((r, i) => (
            <div key={i} className={styles.recipeCard}>
              <div className={styles.recipeTop}>
                <div>
                  <div className={styles.recipeName}>{r.title}</div>
                  <div className={styles.recipeTime}>⏱ {r.time}</div>
                </div>
                <span className={styles.matchBadge}>{Math.round(r.match_pct)}% match</span>
              </div>
              <div className={styles.recipeDesc}>{r.description}</div>
              <div className={styles.tags}>
                {r.have?.map(x => <span key={x} className={`${styles.tag} ${styles.tagHave}`}>✓ {x}</span>)}
                {r.need?.map(x => <span key={x} className={`${styles.tag} ${styles.tagNeed}`}>+ {x}</span>)}
              </div>
              <button className={styles.stepsToggle}
                onClick={() => setOpenSteps(s => ({ ...s, [i]: !s[i] }))}>
                {openSteps[i] ? '▲ Hide steps' : '▼ Show steps'}
              </button>
              {openSteps[i] && (
                <div className={styles.stepsBody}>
                  {r.steps?.map((s, n) => (
                    <div key={n} className={styles.step}>
                      <span className={styles.stepN}>{n + 1}.</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
