import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import styles from '../styles/Home.module.css'

function fmt(n) { return n != null ? `$${Number(n).toFixed(2)}` : '' }

function PriceDelta({ delta }) {
  if (delta == null || delta === 0) return null
  const up = delta > 0
  return <span className={up ? styles.priceUp : styles.priceDown}>{up ? '▲' : '▼'} {fmt(Math.abs(delta))}</span>
}

function Spinner() { return <span className={styles.spinner} /> }

// ── Splash screen ─────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div className={styles.splash}>
      <div className={styles.splashInner}>
        <img src="/logo.png" alt="PantryPal" className={styles.splashLogo} />
        <div className={styles.splashSub}>Track groceries · discover recipes</div>
        <div className={styles.splashSpinner}><Spinner /></div>
      </div>
    </div>
  )
}

// ── Landing page ──────────────────────────────────────────────────────────
function LandingPage({ onSignIn }) {
  return (
    <div className={styles.landing}>
      <div className={styles.landingCard}>
        <div className={styles.landingLogoWrap}>
          <img src="/logo.png" alt="PantryPal" className={styles.landingLogo} />
        </div>
        <p className={styles.landingSub}>Track your groceries, scan receipts, get recipe ideas, and never forget what you need at the store.</p>
        <div className={styles.landingFeatures}>
          <div className={styles.landingFeature}><span>📷</span> Scan receipts with AI</div>
          <div className={styles.landingFeature}><span>🧺</span> Track your pantry</div>
          <div className={styles.landingFeature}><span>🍳</span> Get recipe suggestions</div>
          <div className={styles.landingFeature}><span>🛒</span> Smart shopping cart</div>
        </div>
        <button className={styles.landingSignIn} onClick={onSignIn}>
          <svg width="18" height="18" viewBox="0 0 24 24" style={{flexShrink:0}}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google to access your pantry
        </button>
        <p className={styles.landingNote}>Free · No subscription · Your data stays private</p>
      </div>
    </div>
  )
}

export default function PantryPal() {
  const [tab, setTab] = useState('pantry')
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)

  // Pantry
  const [pantry, setPantry] = useState([])
  const [pantryLoading, setPantryLoading] = useState(false)
  const [pantryFilter, setPantryFilter] = useState('all')
  const [editingItem, setEditingItem] = useState(null)
  const [movingItem, setMovingItem] = useState(null)
  const [showActions, setShowActions] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualStatus, setManualStatus] = useState('fresh')
  const [manualCount, setManualCount] = useState('')
  const [manualDate, setManualDate] = useState('')
  const [manualCategory, setManualCategory] = useState('Other')

  // Categories
  const [categories, setCategories] = useState([])
  const [newCatName, setNewCatName] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('📦')
  const [showAddCat, setShowAddCat] = useState(false)
  const [dragItem, setDragItem] = useState(null)
  const [dragOverCat, setDragOverCat] = useState(null)

  // Scan
  const [previewSrc, setPreviewSrc] = useState(null)
  const [imgBase64, setImgBase64] = useState(null)
  const [imgMime, setImgMime] = useState(null)
  const [receiptText, setReceiptText] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanResult, setScanResult] = useState(null)

  // History
  const [receipts, setReceipts] = useState([])
  const [receiptsLoading, setReceiptsLoading] = useState(false)
  const [expandedReceipt, setExpandedReceipt] = useState(null)

  // Recipes
  const [recipes, setRecipes] = useState([])
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [openSteps, setOpenSteps] = useState({})
  const [savedRecipes, setSavedRecipes] = useState([])
  const [showSaved, setShowSaved] = useState(false)

  // Cart
  const [cart, setCart] = useState([])
  const [cartLoading, setCartLoading] = useState(false)
  const [cartItemName, setCartItemName] = useState('')
  const [cartItemQty, setCartItemQty] = useState('')

  const [toast, setToast] = useState('')
  const [confirmDialog, setConfirmDialog] = useState(null)

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(''), 2800) }, [])

  useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest('[data-actions]')) setShowActions(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function confirm(message, onConfirm) { setConfirmDialog({ message, onConfirm }) }
  function confirmYes() { if (confirmDialog?.onConfirm) confirmDialog.onConfirm(); setConfirmDialog(null) }
  function confirmNo() { setConfirmDialog(null) }

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Show splash for at least 2 seconds
    setTimeout(() => setShowSplash(false), 2000)
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) { loadPantry(); loadCategories(); loadReceipts(); loadCart(); loadSavedRecipes() }
    else if (!authLoading) { setPantry([]); setReceipts([]); setCart([]); setSavedRecipes([]) }
  }, [user, authLoading])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  }
  async function signOut() {
    await supabase.auth.signOut(); setPantry([]); setReceipts([]); setCart([]); showToast('Signed out')
  }

  // ── Categories ────────────────────────────────────────────────────────────
  async function loadCategories() {
    if (!user) return
    const res = await fetch(`/api/categories?user_id=${user.id}`)
    const data = await res.json()
    setCategories(data.categories || [])
  }

  async function addCategory() {
    if (!newCatName.trim() || !user) return
    const res = await fetch(`/api/categories?user_id=${user.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName.trim(), emoji: newCatEmoji })
    })
    const data = await res.json()
    setCategories(c => [...c, data.category])
    setNewCatName(''); setNewCatEmoji('📦'); setShowAddCat(false)
    showToast(`Category added: ${newCatName}`)
  }

  async function deleteCategory(id, catName) {
    const itemsInCat = pantry.filter(i => i.category === catName)
    for (const item of itemsInCat) {
      await fetch(`/api/pantry?user_id=${user.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, category: 'Uncategorized' })
      })
    }
    setCategories(c => c.filter(x => x.id !== id))
    setPantry(p => p.map(i => i.category === catName ? { ...i, category: 'Uncategorized' } : i))
    await fetch(`/api/categories?user_id=${user.id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
    })
    showToast('Category deleted')
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────
  function onDragStart(item) { setDragItem(item) }
  function onDragOver(e, catName) { e.preventDefault(); setDragOverCat(catName) }
  async function onDrop(catName) {
    if (!dragItem || dragItem.category === catName) { setDragItem(null); setDragOverCat(null); return }
    setPantry(p => p.map(i => i.id === dragItem.id ? { ...i, category: catName } : i))
    await fetch(`/api/pantry?user_id=${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dragItem.id, category: catName })
    })
    setDragItem(null); setDragOverCat(null)
    showToast(`Moved to ${catName}`)
  }

  // ── Pantry ────────────────────────────────────────────────────────────────
  async function loadPantry() {
    if (!user) return
    setPantryLoading(true)
    try { const res = await fetch(`/api/pantry?user_id=${user.id}`); const data = await res.json(); setPantry(data.items || []) } catch (e) { console.error(e) }
    setPantryLoading(false)
  }

  async function addManual() {
    const name = manualName.trim()
    if (!name || !user) return
    await fetch(`/api/pantry?user_id=${user.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, status: manualStatus, qty: manualCount ? `x${manualCount}` : '', last_purchased: manualDate || null, category: manualCategory })
    })
    setManualName(''); setManualCount(''); setManualDate('')
    showToast(`Added: ${name}`); loadPantry()
  }

  async function updateItem(id, fields) {
    setPantry(p => p.map(i => i.id === id ? { ...i, ...fields } : i))
    await fetch(`/api/pantry?user_id=${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields })
    })
  }

  async function removeItem(id, name) {
    setPantry(p => p.filter(i => i.id !== id))
    await fetch(`/api/pantry?user_id=${user.id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
    })
    showToast(`Removed: ${name}`)
  }

  async function clearPantry() {
    setPantry([])
    await fetch(`/api/pantry?user_id=${user.id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clearAll: true })
    })
    showToast('Pantry cleared')
  }

  async function clearCategory(catName) {
    setPantry(p => p.filter(i => (i.category || 'Uncategorized') !== catName))
    await fetch(`/api/pantry?user_id=${user.id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clearCategory: catName })
    })
    showToast(`${catName} cleared`)
  }

  async function addLowItemsToCart() {
    const lowItems = pantry.filter(i => i.status === 'low' || i.status === 'out')
    if (!lowItems.length) { showToast('No low or out items found'); return }
    await fetch(`/api/cart?user_id=${user.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: lowItems.map(i => ({ name: i.name, qty: '', category: i.category || 'Other', source: 'pantry' })) })
    })
    showToast(`${lowItems.length} items added to cart`); loadCart()
  }

  // ── Image ─────────────────────────────────────────────────────────────────
  function loadFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 1200; let w = img.width, h = img.height
        if (w > maxSize || h > maxSize) { if (w > h) { h = Math.round(h * maxSize / w); w = maxSize } else { w = Math.round(w * maxSize / h); h = maxSize } }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        const compressed = canvas.toDataURL('image/jpeg', 0.7)
        setPreviewSrc(compressed); setImgBase64(compressed.split(',')[1]); setImgMime('image/jpeg')
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }
  function clearImage() { setPreviewSrc(null); setImgBase64(null); setImgMime(null) }

  // ── Scan ──────────────────────────────────────────────────────────────────
  async function doScan(body) {
    if (!user) { showToast('Please sign in to scan receipts'); return }
    setScanLoading(true); setScanResult(null)
    try {
      const res = await fetch('/api/parse-receipt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, userId: user.id })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      clearImage(); setReceiptText('')
      setScanResult({ receipt: data.receipt, items: data.items })
      showToast(`${data.items.length} items added to pantry`)
      loadPantry(); loadReceipts()
    } catch (e) { setScanResult({ error: e.message || 'Could not parse receipt. Please try again.' }) }
    setScanLoading(false)
  }

  // ── History ───────────────────────────────────────────────────────────────
  async function loadReceipts() {
    if (!user) return
    setReceiptsLoading(true)
    try { const res = await fetch(`/api/receipts?user_id=${user.id}`); const data = await res.json(); setReceipts(data.receipts || []) } catch (e) { console.error(e) }
    setReceiptsLoading(false)
  }
  async function deleteReceipt(id) {
    setReceipts(r => r.filter(x => x.id !== id))
    await fetch(`/api/receipts?user_id=${user.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    showToast('Receipt deleted')
  }

  // ── Recipes ───────────────────────────────────────────────────────────────
  async function getRecipes() {
    const avail = pantry.filter(i => i.status !== 'out').map(i => i.name)
    if (avail.length < 2) { showToast('Add at least 2 items to your pantry first'); return }
    setRecipeLoading(true); setRecipes([])
    try {
      const res = await fetch('/api/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: avail }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setRecipes(data.recipes || [])
    } catch (e) { showToast('Could not load recipes. Try again.') }
    setRecipeLoading(false)
  }

  async function loadSavedRecipes() {
    if (!user) return
    const res = await fetch(`/api/saved-recipes?user_id=${user.id}`)
    const data = await res.json()
    setSavedRecipes(data.recipes || [])
  }

  async function saveRecipe(recipe) {
    if (!user) { showToast('Sign in to save recipes'); return }
    await fetch(`/api/saved-recipes?user_id=${user.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipe })
    })
    showToast(`Saved: ${recipe.title}`); loadSavedRecipes()
  }

  async function unsaveRecipe(id) {
    setSavedRecipes(s => s.filter(r => r.id !== id))
    await fetch(`/api/saved-recipes?user_id=${user.id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
    })
    showToast('Recipe removed')
  }

  async function addRecipeIngredientsToCart(recipe) {
    const needed = recipe.need || []
    if (!needed.length) { showToast('No missing ingredients for this recipe!'); return }
    await fetch(`/api/cart?user_id=${user.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: needed.map(n => ({ name: n, qty: '', category: 'Other', source: 'recipe' })) })
    })
    showToast(`${needed.length} ingredients added to cart`); loadCart(); setTab('cart')
  }

  // ── Cart ──────────────────────────────────────────────────────────────────
  async function loadCart() {
    if (!user) return
    setCartLoading(true)
    try { const res = await fetch(`/api/cart?user_id=${user.id}`); const data = await res.json(); setCart(data.items || []) } catch (e) { console.error(e) }
    setCartLoading(false)
  }

  async function addToCart() {
    if (!cartItemName.trim() || !user) return
    await fetch(`/api/cart?user_id=${user.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ name: cartItemName.trim(), qty: cartItemQty, category: 'Other', source: 'manual' }] })
    })
    setCartItemName(''); setCartItemQty(''); showToast(`Added: ${cartItemName}`); loadCart()
  }

  async function toggleCartItem(id, checked) {
    setCart(c => c.map(i => i.id === id ? { ...i, checked } : i))
    await fetch(`/api/cart?user_id=${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, checked })
    })
  }

  async function removeCartItem(id) {
    setCart(c => c.filter(i => i.id !== id))
    await fetch(`/api/cart?user_id=${user.id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
    })
  }

  async function clearCheckedCart() {
    setCart(c => c.filter(i => !i.checked))
    await fetch(`/api/cart?user_id=${user.id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clearChecked: true })
    })
    showToast('Checked items removed')
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = pantryFilter === 'all' ? pantry : pantry.filter(i => i.status === pantryFilter)
  const stats = { total: pantry.length, fresh: pantry.filter(i => i.status === 'fresh').length, low: pantry.filter(i => i.status === 'low').length }
  const catNames = [...categories.map(c => c.name), 'Uncategorized']
  const groupedPantry = catNames.reduce((acc, cat) => {
    acc[cat] = filtered.filter(i => (i.category || 'Uncategorized') === cat)
    return acc
  }, {})
  const knownCats = new Set(catNames)
  const orphans = filtered.filter(i => !knownCats.has(i.category || 'Uncategorized'))
  if (orphans.length) groupedPantry['Uncategorized'] = [...(groupedPantry['Uncategorized'] || []), ...orphans]
  const savedIds = new Set(savedRecipes.map(r => r.title))
  const cartCheckedCount = cart.filter(i => i.checked).length

  // ── Render: splash ────────────────────────────────────────────────────────
  if (authLoading || showSplash) return <SplashScreen />

  // ── Render: landing ───────────────────────────────────────────────────────
  if (!user) return <LandingPage onSignIn={signInWithGoogle} />

  // ── Render: app ───────────────────────────────────────────────────────────
  return (
    <div className={styles.app}>

      {/* HEADER */}
      <header className={styles.header}>
        <button className={styles.brandBtn} onClick={() => setTab('pantry')}>
          <img src="/logo.png" alt="PantryPal logo" className={styles.headerLogo} />
          <div>
            <div className={styles.appTitle}>PantryPal</div>
          </div>
        </button>

          {/* SIGN OUT — right side */}
        <div className={styles.userArea}>
          {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="" className={styles.avatar} />}
          <button className={styles.authBtn} onClick={signOut}>Sign out</button>
        </div>
      </header>

      <div className={styles.content}>

      {/* ══ PANTRY ══ */}
      {tab === 'pantry' && (
        <section>
          <div className={styles.statsRow}>
            <div className={styles.statCard}><div className={styles.statVal}>{stats.total}</div><div className={styles.statLbl}>Tracked</div></div>
            <div className={styles.statCard}><div className={styles.statVal}>{stats.fresh}</div><div className={styles.statLbl}>In stock</div></div>
            <div className={styles.statCard}><div className={styles.statVal}>{stats.low}</div><div className={styles.statLbl}>Running low</div></div>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,flexWrap:'nowrap'}}>
            <div style={{display:'flex',gap:4,flex:1,flexWrap:'nowrap'}}>
              {['all','fresh','low','out'].map(f => (
                <button key={f} className={pantryFilter===f?`${styles.chip} ${styles.chipOn}`:styles.chip} onClick={()=>setPantryFilter(f)} style={{padding:'5px 9px',fontSize:11}}>
                  {f==='all'?'All':f==='fresh'?'✓ Stock':f==='low'?'↓ Low':'✕ Out'}
                </button>
              ))}
            </div>
            <div style={{position:'relative',flexShrink:0}} data-actions>
              <button className={styles.chip} onClick={()=>setShowActions(a=>!a)} style={{fontSize:11}}>⚙ Actions</button>
              {showActions && (
                <div className={styles.actionsDropdown}>
                  <button className={styles.actionItem} onClick={()=>{addLowItemsToCart();setShowActions(false)}}>🛒 Add low/out to cart</button>
                  <button className={`${styles.actionItem} ${styles.actionDanger}`} onClick={()=>{setShowActions(false);confirm('Clear your entire pantry? This cannot be undone.',clearPantry)}}>🗑 Clear entire pantry</button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.manualAddBox}>
            <div className={styles.manualRow1}>
              <input type="text" value={manualName} placeholder="Item name…" onChange={e=>setManualName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addManual()} style={{flex:2,minWidth:0}} />
              <input type="number" value={manualCount} placeholder="Qty" onChange={e=>setManualCount(e.target.value)} min="0" style={{width:60}} />
              <select value={manualStatus} onChange={e=>setManualStatus(e.target.value)} style={{flex:1}}>
                <option value="fresh">In stock</option><option value="low">Low</option><option value="out">Out</option>
              </select>
            </div>
            <div className={styles.manualRow2}>
              <select value={manualCategory} onChange={e=>setManualCategory(e.target.value)} style={{flex:1,padding:'7px 10px',border:'1px solid #e0e0e0',borderRadius:8,fontSize:13,fontFamily:'inherit'}}>
                {categories.map(c=><option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
                <option value="Other">📦 Other</option>
              </select>
              <input type="date" value={manualDate} onChange={e=>setManualDate(e.target.value)} className={styles.dateInput} />
              <button onClick={addManual} className={styles.addBtn}>+ Add</button>
            </div>
          </div>

          <div style={{marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <span className={styles.sectionLabel} style={{margin:0}}>Categories</span>
              <button className={styles.chip} onClick={()=>setShowAddCat(!showAddCat)}>+ Add category</button>
            </div>
            {showAddCat && (
              <div style={{display:'flex',gap:6,marginBottom:8}}>
                <input type="text" value={newCatEmoji} onChange={e=>setNewCatEmoji(e.target.value)} style={{width:44,textAlign:'center',padding:'7px 4px',border:'1px solid #e0e0e0',borderRadius:8,fontSize:18}} maxLength={2} />
                <input type="text" value={newCatName} placeholder="Category name…" onChange={e=>setNewCatName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCategory()} style={{flex:1,padding:'7px 11px',border:'1px solid #e0e0e0',borderRadius:8,fontSize:14,fontFamily:'inherit'}} />
                <button onClick={addCategory} className={styles.addBtn}>Add</button>
              </div>
            )}
          </div>

          {pantryLoading ? (
            <div className={styles.loadRow}><Spinner /> Loading…</div>
          ) : (
            Object.entries(groupedPantry).map(([catName, items]) => {
              const catObj = categories.find(c=>c.name===catName)
              const emoji = catObj?.emoji || '📦'
              return (
                <div key={catName} className={`${styles.categoryGroup} ${dragOverCat===catName?styles.dragOver:''}`}
                  onDragOver={e=>onDragOver(e,catName)} onDrop={()=>onDrop(catName)} onDragLeave={()=>setDragOverCat(null)}>
                  <div className={styles.categoryHeader}>
                    <span>{emoji} {catName}</span>
                    <span className={styles.categoryCount}>{items.length}</span>
                    <div style={{marginLeft:'auto',display:'flex',gap:4,alignItems:'center'}}>
                      {items.length>0&&(
                        <button className={styles.catClearBtn} onClick={()=>confirm(`Clear all ${items.length} item${items.length!==1?'s':''} in "${catName}"?`,()=>clearCategory(catName))}>Clear</button>
                      )}
                      {catName!=='Uncategorized'&&catObj&&(
                        <button className={styles.iconBtn} onClick={()=>deleteCategory(catObj.id,catName)}>✕</button>
                      )}
                    </div>
                  </div>
                  {items.length===0 ? (
                    <div className={styles.emptyCategory}>Drag items here</div>
                  ) : (
                    <div className={styles.itemsGrid}>
                      {items.map(item=>(
                        <div key={item.id} className={styles.itemCard} draggable onDragStart={()=>onDragStart(item)}>
                          {editingItem===item.id ? (
                            <div style={{display:'flex',flexDirection:'column',gap:4}}>
                              <input defaultValue={item.name} onBlur={e=>updateItem(item.id,{name:e.target.value})} style={{fontSize:13,fontWeight:600,padding:'3px 6px',border:'1px solid #3cb87a',borderRadius:5,width:'100%'}} autoFocus />
                              <input defaultValue={item.qty} placeholder="Qty (e.g. x2, 500ml)" onBlur={e=>updateItem(item.id,{qty:e.target.value})} style={{fontSize:12,padding:'3px 6px',border:'1px solid #e0e0e0',borderRadius:5,width:'100%'}} />
                              <button onClick={()=>setEditingItem(null)} style={{fontSize:11,padding:'3px 0',background:'#3cb87a',color:'#fff',border:'none',borderRadius:5,cursor:'pointer'}}>Done</button>
                            </div>
                          ) : (
                            <>
                              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                                <div className={styles.itemName} title={item.name}>{item.name}</div>
                                <div style={{display:'flex',gap:2}}>
                                  <button className={styles.iconBtn} onClick={()=>setMovingItem(movingItem===item.id?null:item.id)} title="Move to category">📂</button>
                                  <button className={styles.iconBtn} onClick={()=>setEditingItem(item.id)} title="Edit">✏️</button>
                                </div>
                              </div>
                              {movingItem===item.id&&(
                                <div className={styles.moveCatBox}>
                                  <div className={styles.moveCatLabel}>Move to:</div>
                                  {categories.map(c=>(
                                    <button key={c.id} className={styles.moveCatBtn}
                                      onClick={()=>{updateItem(item.id,{category:c.name});setMovingItem(null);showToast(`Moved to ${c.name}`)}}>
                                      {c.emoji} {c.name}
                                    </button>
                                  ))}
                                  <button className={styles.moveCatBtn} onClick={()=>{updateItem(item.id,{category:'Uncategorized'});setMovingItem(null);showToast('Moved to Uncategorized')}}>📦 Uncategorized</button>
                                </div>
                              )}
                              <div className={styles.itemRow2}>
                                <span className={styles.itemQty}>{item.qty||''}</span>
                                {item.last_price!=null&&<span className={styles.itemPrice}>{fmt(item.last_price)}</span>}
                              </div>
                              {item.last_purchased&&(
                                <div className={styles.itemDate}>🗓 {new Date(item.last_purchased).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</div>
                              )}
                              <div className={styles.itemFoot}>
                                <select className={`${styles.statusSel} ${styles['s_'+item.status]}`} value={item.status} onChange={e=>updateItem(item.id,{status:e.target.value})}>
                                  <option value="fresh">✓ In stock</option>
                                  <option value="low">↓ Low</option>
                                  <option value="out">✕ Out</option>
                                </select>
                                <button className={styles.iconBtn} onClick={()=>removeItem(item.id,item.name)}>✕</button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </section>
      )}

      {/* ══ SCAN ══ */}
      {tab==='scan'&&(
        <section>
          <p className={styles.sectionLabel}>Upload a receipt photo</p>
          {!previewSrc&&(
            <div className={styles.uploadBtns}>
              <label className={styles.uploadLabel}>📁 Choose from files<input type="file" accept="image/*" onChange={e=>loadFile(e.target.files[0])} hidden /></label>
              <label className={styles.uploadLabel}>📷 Take a photo<input type="file" accept="image/*" capture="environment" onChange={e=>loadFile(e.target.files[0])} hidden /></label>
            </div>
          )}
          {previewSrc&&(
            <div style={{marginBottom:12}}>
              <img src={previewSrc} alt="Receipt" style={{width:'100%',maxHeight:280,objectFit:'contain',borderRadius:10,border:'1px solid #eee',display:'block'}} />
              <button onClick={clearImage} style={{marginTop:6,fontSize:12,padding:'4px 10px',cursor:'pointer'}}>✕ Clear</button>
            </div>
          )}
          {previewSrc&&!scanLoading&&<button className={styles.scanBtn} onClick={()=>doScan({imageBase64:imgBase64,imageMime:imgMime})}>✨ Read receipt with AI</button>}
          {scanLoading&&<div className={styles.loadRow}><Spinner /> Scanning receipt… this may take a few seconds</div>}
          <div className={styles.divider}>or paste receipt text</div>
          <textarea className={styles.textarea} value={receiptText} onChange={e=>setReceiptText(e.target.value)} rows={5} placeholder="Paste receipt text, grocery list, or type items and prices…" />
          {!scanLoading&&<button className={styles.scanBtn} style={{marginTop:8,opacity:!receiptText.trim()?0.5:1}} onClick={()=>{if(receiptText.trim())doScan({text:receiptText})}}>✓ Parse text with AI</button>}
          {scanResult&&!scanResult.error&&(
            <div className={styles.scanSuccess}>
              <div className={styles.scanSuccessHead}><span>✓ {scanResult.items.length} items added</span><span className={styles.storeName}>{scanResult.receipt?.store_name}</span></div>
              <div className={styles.scanItemList}>
                {scanResult.items.map((item,i)=>(
                  <div key={i} className={styles.scanItem}>
                    <span className={styles.scanItemName}>{item.name}</span>
                    <span className={styles.scanItemRight}>{item.price!=null&&<span className={styles.scanItemPrice}>{fmt(item.price)}</span>}<PriceDelta delta={item.price_delta} /></span>
                  </div>
                ))}
              </div>
              <button className={styles.addBtn} style={{marginTop:12,width:'100%'}} onClick={()=>setTab('pantry')}>View pantry →</button>
            </div>
          )}
          {scanResult?.error&&<div className={styles.errBox}>{scanResult.error}</div>}
        </section>
      )}

      {/* ══ HISTORY ══ */}
      {tab==='history'&&(
        <section>
          {receiptsLoading?<div className={styles.loadRow}><Spinner /> Loading receipts…</div>
          :receipts.length===0?<div className={styles.empty}>No receipts yet — scan one from the Scan tab.</div>
          :receipts.map(r=>(
            <div key={r.id} className={styles.receiptCard}>
              <div className={styles.receiptHeader} onClick={()=>setExpandedReceipt(expandedReceipt===r.id?null:r.id)}>
                <div className={styles.receiptMeta}>
                  <div className={styles.receiptStore}>{r.store_name}</div>
                  <div className={styles.receiptDate}>
                    {r.receipt_date?new Date(r.receipt_date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):new Date(r.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}
                    {' · '}{r.item_count} item{r.item_count!==1?'s':''}
                    {r.total_amount!=null&&<> · <strong>{fmt(r.total_amount)}</strong></>}
                  </div>
                </div>
                <div className={styles.receiptActions}>
                  <button className={styles.iconBtn} onClick={e=>{e.stopPropagation();deleteReceipt(r.id)}}>🗑</button>
                  <span className={styles.chevron}>{expandedReceipt===r.id?'▲':'▼'}</span>
                </div>
              </div>
              {expandedReceipt===r.id&&(
                <div className={styles.receiptItems}>
                  <div className={styles.receiptItemsHead}><span>Item</span><span>Qty</span><span>Price</span><span>Change</span></div>
                  {(r.receipt_items||[]).map(item=>(
                    <div key={item.id} className={styles.receiptItemRow}>
                      <span className={styles.riName}>{item.name}</span>
                      <span className={styles.riQty}>{item.qty||'—'}</span>
                      <span className={styles.riPrice}>{item.price!=null?fmt(item.price):'—'}</span>
                      <span><PriceDelta delta={item.price_delta} /></span>
                    </div>
                  ))}
                  {!(r.receipt_items||[]).length&&<div className={styles.receiptEmpty}>No item details saved.</div>}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* ══ RECIPES ══ */}
      {tab==='recipes'&&(
        <section>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <button className={styles.scanBtn} style={{flex:1}} onClick={getRecipes} disabled={recipeLoading}>
              {recipeLoading?'Finding matches…':'✨ Suggest recipes from my pantry'}
            </button>
            <button className={`${styles.chip} ${showSaved?styles.chipOn:''}`} onClick={()=>setShowSaved(!showSaved)}>
              ❤️ Saved {savedRecipes.length>0&&`(${savedRecipes.length})`}
            </button>
          </div>
          {recipeLoading&&<div className={styles.loadRow}><Spinner /> Finding the best recipe matches…</div>}
          {showSaved&&(
            <div style={{marginBottom:16}}>
              <div className={styles.sectionLabel}>Saved recipes</div>
              {savedRecipes.length===0?<div className={styles.empty}>No saved recipes yet — heart one below!</div>
              :savedRecipes.map(r=>(
                <div key={r.id} className={styles.recipeCard}>
                  <div className={styles.recipeTop}>
                    <div><div className={styles.recipeName}>{r.title}</div><div className={styles.recipeTime}>⏱ {r.time}</div></div>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <button onClick={()=>addRecipeIngredientsToCart(r)} className={styles.chip}>🛒</button>
                      <button onClick={()=>unsaveRecipe(r.id)} className={styles.chip}>🗑</button>
                    </div>
                  </div>
                  <div className={styles.recipeDesc}>{r.description}</div>
                  <div className={styles.tags}>
                    {(r.have||[]).map(x=><span key={x} className={`${styles.tag} ${styles.tagHave}`}>✓ {x}</span>)}
                    {(r.need||[]).map(x=><span key={x} className={`${styles.tag} ${styles.tagNeed}`}>+ {x}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!recipeLoading&&recipes.length===0&&pantry.filter(i=>i.status!=='out').length<2&&!showSaved&&(
            <div className={styles.empty}>Add at least 2 items to your pantry first.</div>
          )}
          {recipes.map((r,i)=>{
            const isSaved=savedIds.has(r.title)
            return(
              <div key={i} className={styles.recipeCard}>
                <div className={styles.recipeTop}>
                  <div><div className={styles.recipeName}>{r.title}</div><div className={styles.recipeTime}>⏱ {r.time}</div></div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <span className={styles.matchBadge}>{Math.round(r.match_pct)}%</span>
                    <button onClick={()=>isSaved?null:saveRecipe(r)} style={{background:'none',border:'none',cursor:isSaved?'default':'pointer',fontSize:18}}>{isSaved?'❤️':'🤍'}</button>
                  </div>
                </div>
                <div className={styles.recipeDesc}>{r.description}</div>
                <div className={styles.tags}>
                  {r.have?.map(x=><span key={x} className={`${styles.tag} ${styles.tagHave}`}>✓ {x}</span>)}
                  {r.need?.map(x=><span key={x} className={`${styles.tag} ${styles.tagNeed}`}>+ {x}</span>)}
                </div>
                <div style={{display:'flex',gap:8,marginTop:8,alignItems:'center'}}>
                  <button className={styles.stepsToggle} onClick={()=>setOpenSteps(s=>({...s,[i]:!s[i]}))}>
                    {openSteps[i]?'▲ Hide steps':'▼ Show steps'}
                  </button>
                  {r.need?.length>0&&<button className={styles.chip} onClick={()=>addRecipeIngredientsToCart(r)}>🛒 Add missing to cart</button>}
                </div>
                {openSteps[i]&&(
                  <div className={styles.stepsBody}>
                    {r.steps?.map((s,n)=><div key={n} className={styles.step}><span className={styles.stepN}>{n+1}.</span><span>{s}</span></div>)}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}

      {/* ══ CART ══ */}
      {tab==='cart'&&(
        <section>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div className={styles.sectionLabel} style={{margin:0}}>Shopping cart — {cart.length} item{cart.length!==1?'s':''}</div>
            {cartCheckedCount>0&&<button className={styles.chip} onClick={clearCheckedCart}>🗑 Remove checked ({cartCheckedCount})</button>}
          </div>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <input type="text" value={cartItemName} placeholder="Add item…" onChange={e=>setCartItemName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addToCart()} style={{flex:2,padding:'9px 11px',border:'1px solid #e0e0e0',borderRadius:8,fontSize:14,fontFamily:'inherit',minWidth:0}} />
            <input type="text" value={cartItemQty} placeholder="Qty" onChange={e=>setCartItemQty(e.target.value)} style={{width:64,padding:'9px 8px',border:'1px solid #e0e0e0',borderRadius:8,fontSize:14,fontFamily:'inherit'}} />
            <button className={styles.addBtn} onClick={addToCart}>+ Add</button>
          </div>
          <button className={styles.chip} style={{marginBottom:12}} onClick={addLowItemsToCart}>↓ Pull in low/out pantry items</button>
          {cartLoading?<div className={styles.loadRow}><Spinner /> Loading cart…</div>
          :cart.length===0?<div className={styles.empty}>Cart is empty — add items above or pull from pantry</div>
          :(
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {['manual','pantry','recipe'].map(source=>{
                const sourceItems=cart.filter(i=>i.source===source)
                if(!sourceItems.length)return null
                const label=source==='manual'?'✏️ Added manually':source==='pantry'?'🧺 From pantry':'🍳 From recipe'
                return(
                  <div key={source}>
                    <div style={{fontSize:11,fontWeight:600,color:'#999',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{label}</div>
                    {sourceItems.map(item=>(
                      <div key={item.id} className={`${styles.cartItem} ${item.checked?styles.cartItemChecked:''}`}>
                        <input type="checkbox" checked={item.checked} onChange={e=>toggleCartItem(item.id,e.target.checked)} className={styles.cartCheck} />
                        <span className={styles.cartItemName}>{item.name}</span>
                        {item.qty&&<span className={styles.cartItemQty}>{item.qty}</span>}
                        <button className={styles.iconBtn} onClick={()=>removeCartItem(item.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      </div>

      {toast&&<div className={styles.toast}>{toast}</div>}

      {/* BOTTOM NAV */}
      <nav className={styles.bottomNav}>
        {[['pantry','📋','My Pantry'],['cart','🛒','Cart'],['scan','📷','Scan'],['history','🧾','History'],['recipes','🍳','Recipes']].map(([id, icon, label]) => (
          <button key={id}
            className={tab === id ? `${styles.bottomNavItem} ${styles.bottomNavActive}` : styles.bottomNavItem}
            onClick={() => setTab(id)}>
            <span className={styles.bottomNavIcon}>{icon}</span>
            <span className={styles.bottomNavLabel}>{label}</span>
            {id === 'cart' && cart.length > 0 && <span className={styles.cartBadge}>{cart.length}</span>}
          </button>
        ))}
      </nav>

      {confirmDialog&&(
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <div className={styles.confirmMsg}>{confirmDialog.message}</div>
            <div className={styles.confirmBtns}>
              <button className={styles.confirmNo} onClick={confirmNo}>Cancel</button>
              <button className={styles.confirmYes} onClick={confirmYes}>Yes, clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
