import { useState, useEffect, useCallback } from 'react'
import { track, identify, reset } from '../lib/posthog'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import styles from '../styles/Home.module.css'
import Tour from '../components/Tour'
import PantryShelf from '../components/PantryShelf'
import PullToRefresh from '../components/PullToRefresh'
import { TOURS } from '../lib/tourSteps'

function fmt(n) { return n != null ? `$${Number(n).toFixed(2)}` : '' }
function PriceDelta({ delta }) {
  if (delta == null || delta === 0) return null
  const up = delta > 0
  return <span className={up ? styles.priceUp : styles.priceDown}>{up ? '▲' : '▼'} {fmt(Math.abs(delta))}</span>
}
function Spinner() { return <span className={styles.spinner} /> }

// Small gear-triggered settings popover for a shopping list section header.
// menuKey identifies which list this is for, so only one menu is open at a time.
function GearMenu({ menuKey, gearMenuFor, setGearMenuFor, gearColorPickerFor, setGearColorPickerFor, currentColor, onSetColor, onClearChecked, onClearAll, onArchive, canChangeColor }) {
  const isOpen = gearMenuFor === menuKey
  const isColorOpen = gearColorPickerFor === menuKey
  return (
    <div style={{position:'relative'}} onClick={e=>e.stopPropagation()}>
      <button onClick={()=>{setGearMenuFor(isOpen?null:menuKey);setGearColorPickerFor(null)}} title="List settings" style={{width:18,height:18,padding:0,border:'none',background:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#7a6a52',opacity:0.75}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </button>
      {isOpen && (
        <div style={{position:'absolute',top:'100%',left:0,marginTop:4,background:'#fff',border:'1px solid #e0d8c8',borderRadius:8,boxShadow:'0 4px 12px rgba(0,0,0,0.12)',minWidth:160,zIndex:20,overflow:'hidden'}}>
          {canChangeColor && !isColorOpen && (
            <button onClick={()=>setGearColorPickerFor(menuKey)} style={{display:'block',width:'100%',textAlign:'left',padding:'9px 12px',fontSize:12,fontWeight:600,color:'#333',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Change color</button>
          )}
          {isColorOpen && (
            <div style={{padding:'9px 12px',display:'flex',gap:5,flexWrap:'wrap'}}>
              {Object.entries(LIST_COLORS).map(([key,c])=>(
                <button key={key} onClick={()=>onSetColor(key)} title={c.label} style={{width:20,height:20,borderRadius:'50%',background:c.border,border:currentColor===key?'2px solid #145040':'1px solid rgba(0,0,0,0.15)',cursor:'pointer',padding:0}} />
              ))}
            </div>
          )}
          {!isColorOpen && (
            <>
              <button onClick={onClearChecked} style={{display:'block',width:'100%',textAlign:'left',padding:'9px 12px',fontSize:12,fontWeight:600,color:'#333',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',borderTop:'0.5px solid #f0e6d0'}}>Clear checked items</button>
              {onArchive ? (
                <button onClick={onArchive} style={{display:'block',width:'100%',textAlign:'left',padding:'9px 12px',fontSize:12,fontWeight:600,color:'#c0392b',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',borderTop:'0.5px solid #f0e6d0'}}>Archive this list</button>
              ) : (
                <button onClick={onClearAll} style={{display:'block',width:'100%',textAlign:'left',padding:'9px 12px',fontSize:12,fontWeight:600,color:'#c0392b',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',borderTop:'0.5px solid #f0e6d0'}}>Clear entire list</button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Light pastel palette for per-list header backgrounds — matches the existing
// soft tint style already used for household (green) and shared lists (blue).
const LIST_COLORS = {
  green:      { bg: '#e8f5f0', border: '#4db88a', label: 'Green' },
  blue:       { bg: '#e8f0ff', border: '#6090d0', label: 'Blue' },
  peach:      { bg: '#fbe9e0', border: '#e0a070', label: 'Peach' },
  lavender:   { bg: '#f0e8fb', border: '#b090d8', label: 'Lavender' },
  gray:       { bg: '#f0eee8', border: '#a8a090', label: 'Gray' },
  rose:       { bg: '#fbe8ec', border: '#d88098', label: 'Rose' },
}

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

function LandingPage({ onSignIn }) {
  return (
    <div className={styles.landing}>
      <div className={styles.landingCard}>
        <img src="/logo.png" alt="PantryPal" className={styles.landingLogo} />
        <p className={styles.landingHook}>Shop smarter, cook better, waste less.</p>
        <p className={styles.landingSub}>PantryPal keeps track of your groceries so you always know what you have, what you need, and what to make for your next meal.</p>
        <div className={styles.landingBulletsWrap}>
          <div className={styles.landingBullets}>
            <div className={styles.landingBullet}><span className={styles.landingBulletIcon}>📷</span><span className={styles.landingBulletText}>Scan and log receipts</span></div>
            <div className={styles.landingBullet}><span className={styles.landingBulletIcon}>🧺</span><span className={styles.landingBulletText}>Track your pantry</span></div>
            <div className={styles.landingBullet}><span className={styles.landingBulletIcon}>🍳</span><span className={styles.landingBulletText}>Get recipe suggestions</span></div>
            <div className={styles.landingBullet}><span className={styles.landingBulletIcon}>🛒</span><span className={styles.landingBulletText}>Smart shopping cart</span></div>
          </div>
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
        <Link href="/privacy" className={styles.landingPrivacy}>Privacy Policy</Link>
      </div>
    </div>
  )
}

export default function PantryPal() {
  const [tab, setTab] = useState('home')
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
  const [openCatMenu, setOpenCatMenu] = useState(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [autoCategorizing, setAutoCategorizing] = useState(false)
  const [categorizeReview, setCategorizeReview] = useState(null)
  const [homeHHExpanded, setHomeHHExpanded] = useState(false)
  const [editingHHName, setEditingHHName] = useState(false)
  const [hhNameInput, setHhNameInput] = useState('') // { results: [...], checked: {...} }
  const [pantryViewMode, setPantryViewMode] = useState(() => { if (typeof window !== 'undefined') return localStorage.getItem('pantryViewMode') || 'list'; return 'list' })
  const [pantryRefreshing, setPantryRefreshing] = useState(false)
  const [cartRefreshing, setCartRefreshing] = useState(false)
  const [pullHint, setPullHint] = useState(null) // 'pantry' | 'cart' | null — shown while pull gesture is active
  const [collapsedCats, setCollapsedCats] = useState({})
  const [manualName, setManualName] = useState('')
  const [manualStatus, setManualStatus] = useState('fresh')
  const [manualCount, setManualCount] = useState('')
  const [manualDate, setManualDate] = useState('')
  const [manualCategory, setManualCategory] = useState('Other')

  // Household / pantry view
  const [household, setHousehold] = useState(null)
  const [householdMembers, setHouseholdMembers] = useState([])
  const [pantryView, setPantryView] = useState('household') // 'household' | 'personal'

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
  const [cart, setCart] = useState([]) // personal items only now
  const [householdCart, setHouseholdCart] = useState([])
  const [sharedLists, setSharedLists] = useState([]) // [{id, friend_id, friend_name, items, color}]
  const [archivedLists, setArchivedLists] = useState([])
  const [personalListColor, setPersonalListColor] = useState('gray')
  const [householdListColor, setHouseholdListColor] = useState('green')
  const [isHouseholdOwner, setIsHouseholdOwner] = useState(false)
  const [gearMenuFor, setGearMenuFor] = useState(null) // 'personal' | 'household' | shared_list_id | null
  const [gearColorPickerFor, setGearColorPickerFor] = useState(null) // sub-state: which gear menu's color swatches are open
  const [showArchivedLists, setShowArchivedLists] = useState(false)
  const [openCartSections, setOpenCartSections] = useState({ household: true })
  const [showFriendListPicker, setShowFriendListPicker] = useState(false)
  const [sharedActionSheet, setSharedActionSheet] = useState(null)
  const [sharedRecipeDetail, setSharedRecipeDetail] = useState(null) // { type: 'recipe'|'list', item }
  const [expiringActionSheet, setExpiringActionSheet] = useState(null) // pantry item
  const [expiryRecipes, setExpiryRecipes] = useState(null) // { item, recipes, loading }
  const [cartLoading, setCartLoading] = useState(false)
  const [cartItemName, setCartItemName] = useState('')
  const [cartItemQty, setCartItemQty] = useState('')
  const [cartAddTarget, setCartAddTarget] = useState('personal') // 'personal' | 'household' | shared_list_id
  const [addItemModal, setAddItemModal] = useState(null) // { target: 'personal'|'household'|friendId, label }
  const [addItemModalName, setAddItemModalName] = useState('')
  const [brandSuggestions, setBrandSuggestions] = useState([])
  const [brandSuggestLoading, setBrandSuggestLoading] = useState(false)
  const [addItemModalQty, setAddItemModalQty] = useState('')

  // Profile / social
  const [profileOpen, setProfileOpen] = useState(false)
  const [profilePanel, setProfilePanel] = useState(null) // null | 'edit' | 'friends' | 'household' | 'notifications' | 'shares'
  const [profile, setProfile] = useState(null)
  const [editUsername, setEditUsername] = useState('')
  const [editDisplayName, setEditDisplayName] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [friendSearch, setFriendSearch] = useState('')
  const [friendSearchType, setFriendSearchType] = useState('username')
  const [friendResults, setFriendResults] = useState([])
  const [friendsData, setFriendsData] = useState({ sent: [], received: [] })
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [shares, setShares] = useState([])
  const [householdName, setHouseholdName] = useState('')
  const [householdInviteSearch, setHouseholdInviteSearch] = useState('')
  const [householdInviteResults, setHouseholdInviteResults] = useState([])

  const [toast, setToast] = useState('')
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [activeTour, setActiveTour] = useState(null)
  const [seenTours, setSeenTours] = useState({})
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [showHelpHint, setShowHelpHint] = useState(false)
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false)
  const [showHouseholdWarning, setShowHouseholdWarning] = useState(null) // household_id
  const [pendingJoinRequests, setPendingJoinRequests] = useState([])
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [usernameError, setUsernameError] = useState('')

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(''), 2800) }, [])
  function confirm(message, onConfirm) { setConfirmDialog({ message, onConfirm }) }
  function confirmYes() { if (confirmDialog?.onConfirm) confirmDialog.onConfirm(); setConfirmDialog(null) }
  function confirmNo() { setConfirmDialog(null) }

  // Current household_id for pantry queries
  // While in a household, ALWAYS use household view — personal pantry is inaccessible
  const activeHouseholdId = household ? household.id : null
  const effectivePantryView = household ? 'household' : 'personal'

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => setShowSplash(false), 2000)
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      // Load household first so pantry loads with correct household_id
      loadCategories()
      loadHousehold().then(hhId => loadPantry(hhId))
      loadReceipts()
      loadCart()
      loadSavedRecipes()
      loadProfile()
      loadNotifications()
      loadFriends()
      loadShares()
      // Identify user in PostHog
      identify(user.id, { email: user.email, name: user.user_metadata?.full_name })
      // Check if tutorial has been seen
      checkTutorial()
    } else if (!authLoading) {
      setPantry([]); setReceipts([]); setCart([]); setSavedRecipes([])
    }
  }, [user, authLoading])

  useEffect(() => {
    if (user) {
      loadCategories()
      loadPantry(household ? household.id : null)
    }
  }, [household])

  useEffect(() => {
    if (!user || !tab || !profileLoaded) return
    // Don't show tour until user has dismissed the username prompt
    if (showUsernamePrompt) return
    const tourKey = `tour_${tab}`
    const hasSeenAnyTour = Object.values(seenTours).some(v => v === true)
    // Only auto-start tour for brand new users who haven't seen any tour yet
    if (!hasSeenAnyTour && !seenTours[tourKey] && TOURS[tab]) {
      setTimeout(() => startTour(tab), 800)
    }
  }, [tab, user, seenTours, profileLoaded, showUsernamePrompt])

  useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest('[data-actions]')) setShowActions(false)
      if (!e.target.closest('[data-catmenu]')) setOpenCatMenu(null)
      if (!e.target.closest('[data-catmenu]')) setOpenCatMenu(null)
      if (!e.target.closest('[data-profile]')) { setProfileOpen(false); }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://pantrypal-green.vercel.app' } })
  }
  async function signOut() {
    await supabase.auth.signOut(); setPantry([]); setReceipts([]); setCart([]); reset(); showToast('Signed out')
  }

  // ── Tutorial ─────────────────────────────────────────────────────────────────
  async function checkTutorial() {
    if (!user) return
    const res = await fetch(`/api/profile?user_id=${user.id}`)
    const data = await res.json()
    if (!data.profile?.tutorial_completed) setShowTutorial(true)
  }

  async function completeTutorial() {
    setShowTutorial(false)
    track('tutorial_completed')
    await fetch(`/api/profile?user_id=${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tutorial_completed: true })
    })
  }

  // ── Auto-categorize uncategorized items ─────────────────────────────────────
  async function runAutoCategorize(items) {
    setAutoCategorizing(true)
    try {
      const res = await fetch('/api/categorize-items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ id: i.id, name: i.name })),
          categories: categories.map(c => c.name)
        })
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        showToast(data.error || 'Failed to auto-categorize items')
        setAutoCategorizing(false)
        return
      }
      const results = data.results || []
      // Default-check only items with a confident suggestion
      const checked = {}
      results.forEach(r => { if (r.suggestedCategory) checked[r.id] = true })
      setCategorizeReview({ results, checked })
    } catch (err) {
      console.error('runAutoCategorize error:', err)
      showToast('Something went wrong auto-categorizing items')
    }
    setAutoCategorizing(false)
  }

  async function applyCategorizeReview() {
    if (!categorizeReview) { console.log('applyCategorizeReview: no categorizeReview state'); return }
    const toApply = categorizeReview.results.filter(r => r.suggestedCategory && categorizeReview.checked[r.id])
    console.log('applyCategorizeReview: toApply=', toApply)
    setCategorizeReview(null)
    if (toApply.length === 0) { console.log('applyCategorizeReview: nothing to apply'); return }

    try {
      // Default emoji per standard category name, used only when creating a brand new category
      const emojiMap = {
        'Produce': '🥦', 'Meat & Seafood': '🥩', 'Dairy & Eggs': '🥛', 'Bakery': '🥖',
        'Pantry & Dry Goods': '🥫', 'Frozen': '🧊', 'Toiletries': '🧴', 'Household': '🧹', 'Pet Supplies': '🐾'
      }

      // Create any suggested categories that don't already exist
      const neededNames = [...new Set(toApply.map(r => r.suggestedCategory))]
      const existingNames = new Set(categories.map(c => c.name))
      const missingNames = neededNames.filter(n => !existingNames.has(n))
      console.log('applyCategorizeReview: missingNames=', missingNames)

      if (missingNames.length > 0) {
        const hidParam = household ? `&household_id=${household.id}` : ''
        const created = await Promise.all(missingNames.map(name =>
          fetch(`/api/categories?user_id=${user.id}${hidParam}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, emoji: emojiMap[name] || '📦' })
          }).then(async r => { const j = await r.json(); console.log('create category response:', r.status, j); return j })
        ))
        const newCats = created.map(d => d.category).filter(Boolean)
        if (newCats.length) setCategories(c => [...c, ...newCats])
      }

      const patchResults = await Promise.all(toApply.map(r =>
        fetch(`/api/pantry?user_id=${user.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: r.id, category: r.suggestedCategory })
        }).then(async resp => { const j = await resp.json().catch(()=>({})); return { status: resp.status, body: j, id: r.id } })
      ))
      console.log('applyCategorizeReview: patchResults=', patchResults)

      setPantry(p => p.map(item => {
        const match = toApply.find(r => r.id === item.id)
        return match ? { ...item, category: match.suggestedCategory } : item
      }))
      showToast(`Categorized ${toApply.length} item${toApply.length !== 1 ? 's' : ''}`)
    } catch (err) {
      console.error('applyCategorizeReview error:', err)
      showToast('Something went wrong applying categories')
    }
  }

  function toggleCategorizeCheck(id) {
    setCategorizeReview(prev => prev ? { ...prev, checked: { ...prev.checked, [id]: !prev.checked[id] } } : prev)
  }


  async function updateCategoryPosition(catId, shelfNumber, shelfX) {
    // Optimistic update
    setCategories(cs => cs.map(c => c.id === catId ? { ...c, shelf_number: shelfNumber, shelf_x: shelfX } : c))
    const hidParam = household ? `&household_id=${household.id}` : ''
    await fetch(`/api/categories?user_id=${user.id}${hidParam}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: catId, shelf_number: shelfNumber, shelf_x: shelfX })
    })
  }

  // ── Tour ─────────────────────────────────────────────────────────────────────
  function startTour(tabName) {
    const steps = TOURS[tabName]
    if (!steps) return
    setActiveTour(steps)
  }

  function completeTour() {
    const tourKey = `tour_${tab}`
    setSeenTours(s => ({ ...s, [tourKey]: true }))
    setActiveTour(null)
    if (user) {
      fetch(`/api/profile?user_id=${user.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [tourKey]: true })
      })
    }
  }

  function skipTour() {
    const tourKey = `tour_${tab}`
    setSeenTours(s => ({ ...s, [tourKey]: true }))
    setActiveTour(null)
  }

  // ── Profile ───────────────────────────────────────────────────────────────
  async function loadProfile() {
    if (!user) return
    const res = await fetch(`/api/profile?user_id=${user.id}`)
    const data = await res.json()
    setProfile(data.profile)
    setEditUsername(data.profile?.username || '')
    setEditDisplayName(data.profile?.display_name || '')
    // Load seen tours
    if (data.profile) {
      const seen = {}
      ;['home','pantry','scan','cart','history','recipes'].forEach(t => {
        if (data.profile[`tour_${t}`]) seen[`tour_${t}`] = true
      })
      setSeenTours(seen)
      setProfileLoaded(true)
      // Show username prompt if never shown before
      if (!data.profile?.username_prompt_shown) {
        setShowUsernamePrompt(true)
      }
      if (data.profile.tour_home) {
        setShowHelpHint(true)
        setTimeout(() => setShowHelpHint(false), 5000)
      }
    }
  }

  async function saveProfile() {
    setProfileSaving(true)
    const res = await fetch(`/api/profile?user_id=${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: editUsername.trim(), display_name: editDisplayName.trim() })
    })
    const data = await res.json()
    if (data.error) { showToast(data.error); setProfileSaving(false); return }
    setProfile(data.profile)
    setProfileSaving(false)
    setProfilePanel(null)
    showToast('Profile updated!')
  }

  async function saveUsernameAndContinue() {
    if (!usernameInput.trim()) { dismissUsernamePrompt(); return }
    setUsernameSaving(true); setUsernameError('')
    const res = await fetch(`/api/profile?user_id=${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput.trim().toLowerCase().replace(/[^a-z0-9_]/g,''), username_prompt_shown: true })
    })
    const data = await res.json()
    if (data.error) { setUsernameError(data.error); setUsernameSaving(false); return }
    setProfile(data.profile)
    setShowUsernamePrompt(false)
    showToast('Username set! Friends can now find you.')
    setUsernameSaving(false)
  }

  async function dismissUsernamePrompt() {
    setShowUsernamePrompt(false)
    // Mark as shown so it never appears again
    await fetch(`/api/profile?user_id=${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username_prompt_shown: true })
    })
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  async function loadNotifications() {
    if (!user) return
    const res = await fetch(`/api/notifications?user_id=${user.id}`)
    const data = await res.json()
    // Preserve accepted/joined flags — they're saved to DB so they come back automatically
    setNotifications(data.notifications || [])
    setUnreadCount(data.unread || 0)
  }

  async function markAllNotificationsRead() {
    if (!user) return
    await fetch(`/api/notifications?user_id=${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true })
    })
    setNotifications(ns => ns.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function markAllRead() {
    await fetch(`/api/notifications?user_id=${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true })
    })
    setNotifications(n => n.map(x => ({ ...x, read: true })))
    setUnreadCount(0)
  }

  // ── Friends ───────────────────────────────────────────────────────────────
  async function loadFriends() {
    if (!user) return
    const res = await fetch(`/api/friends?user_id=${user.id}`)
    const data = await res.json()
    setFriendsData(data)
  }

  async function searchFriends() {
    if (!friendSearch.trim()) return
    const res = await fetch(`/api/friends?user_id=${user.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: friendSearchType === 'email' ? 'search_email' : 'search', search: friendSearch })
    })
    const data = await res.json()
    setFriendResults(data.results || [])
  }

  async function sendFriendRequest(friend_id) {
    try {
      const res = await fetch(`/api/friends?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', friend_id })
      })
      const data = await res.json()
      console.log('sendFriendRequest response:', res.status, data)
      if (!res.ok || data.error) {
        showToast(data.error || 'Failed to send friend request')
        return
      }
      showToast('Friend request sent!')
      loadFriends()
      setFriendResults([])
    } catch (err) {
      console.error('sendFriendRequest error:', err)
      showToast('Something went wrong sending the request')
    }
  }

  async function respondToFriendRequest(friend_id, action) {
    try {
      const res = await fetch(`/api/friends?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, friend_id })
      })
      const data = await res.json()
      console.log('respondToFriendRequest response:', res.status, data)
      if (!res.ok || data.error) {
        showToast(data.error || `Failed to ${action} friend request`)
        return
      }
      if (action === 'accept') showToast('Friend added!')
      await loadFriends()
    } catch (err) {
      console.error('respondToFriendRequest error:', err)
      showToast('Something went wrong')
    }
  }

  async function removeFriend(friend_id) {
    await fetch(`/api/friends?user_id=${user.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', friend_id })
    })
    showToast('Friend removed'); loadFriends()
  }

  // ── Shares ────────────────────────────────────────────────────────────────
  async function loadShares() {
    if (!user) return
    const res = await fetch(`/api/shares?user_id=${user.id}`)
    const data = await res.json()
    console.log('loadShares response:', res.status, data)
    setShares(data.shares || [])
  }

  const [shareLinkModal, setShareLinkModal] = useState(null) // { url, type }

  async function generateShareLink(share_type, content, title) {
    try {
      const res = await fetch('/api/share-links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', user_id: user.id, share_type, title, content })
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        showToast(data.error || 'Failed to create share link')
        return
      }
      const url = `https://pantrypal-green.vercel.app/invite/${data.token}`
      setShareLinkModal({ url, type: share_type })
    } catch (err) {
      console.error('generateShareLink error:', err)
      showToast('Something went wrong creating the link')
    }
  }

  async function shareRecipeWithFriend(recipe, friend_id) {
    try {
      const res = await fetch(`/api/shares?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_user: friend_id, share_type: 'recipe', title: recipe.title, content: recipe })
      })
      const data = await res.json()
      console.log('shareRecipeWithFriend response:', res.status, data)
      if (!res.ok || data.error) {
        showToast(data.error || 'Failed to share recipe')
        return
      }
      showToast('Recipe shared!')
    } catch (err) {
      console.error('shareRecipeWithFriend error:', err)
      showToast('Something went wrong sharing the recipe')
    }
  }

  async function shareCartWithFriend(friend_id) {
    try {
      const res = await fetch(`/api/shares?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_user: friend_id, share_type: 'cart', title: 'Shopping cart', content: { items: cart } })
      })
      const data = await res.json()
      console.log('shareCartWithFriend response:', res.status, data)
      if (!res.ok || data.error) {
        showToast(data.error || 'Failed to share cart')
        return
      }
      showToast('Cart shared!')
    } catch (err) {
      console.error('shareCartWithFriend error:', err)
      showToast('Something went wrong sharing the cart')
    }
  }

  // ── Household ─────────────────────────────────────────────────────────────
  async function loadHousehold() {
    if (!user) return
    const res = await fetch(`/api/households?user_id=${user.id}`)
    const data = await res.json()
    console.log('loadHousehold response:', res.status, data)
    setHousehold(data.household || null)
    setHouseholdMembers(data.members || [])
    setPendingJoinRequests(data.pendingRequests || [])
    if (data.household) {
      setPantryView('household')
      return data.household.id // return id so callers can use it immediately
    } else {
      setPantryView('personal')
      return null
    }
  }

  async function createHousehold() {
    if (!householdName.trim()) return
    try {
      const res = await fetch(`/api/households?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name: householdName.trim() })
      })
      const data = await res.json()
      console.log('createHousehold response:', res.status, data)
      if (!res.ok || data.error || !data.household) {
        showToast(data.error || `Failed to create household (status ${res.status})`)
        return
      }
      setHouseholdName('')
      showToast(`"${data.household.name}" created!`)
      const hhId = await loadHousehold()
      await loadPantry(hhId)
    } catch (err) {
      console.error('createHousehold error:', err)
      showToast('Something went wrong creating the household')
    }
  }

  async function searchHouseholdInvite() {
    if (!householdInviteSearch.trim()) return
    const res = await fetch(`/api/friends?user_id=${user.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', search: householdInviteSearch })
    })
    const data = await res.json()
    setHouseholdInviteResults(data.results || [])
  }

  async function inviteToHousehold(invitee_id) {
    try {
      const res = await fetch(`/api/households?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invite', household_id: household.id, invitee_id })
      })
      const data = await res.json()
      console.log('inviteToHousehold response:', res.status, data)
      if (!res.ok || data.error) {
        showToast(data.error || 'Failed to send invitation')
        return
      }
      showToast('Invitation sent!')
      setHouseholdInviteResults([])
    } catch (err) {
      console.error('inviteToHousehold error:', err)
      showToast('Something went wrong sending the invitation')
    }
  }

  async function renameHousehold(newName) {
    if (!newName.trim() || newName.trim() === household?.name) { setEditingHHName(false); return }
    try {
      const res = await fetch(`/api/households?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', household_id: household.id, name: newName.trim() })
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        showToast(data.error || 'Failed to rename household')
        setEditingHHName(false)
        return
      }
      setHousehold(data.household)
      showToast('Household renamed!')
    } catch (err) {
      console.error('renameHousehold error:', err)
      showToast('Something went wrong renaming the household')
    }
    setEditingHHName(false)
  }

  async function approveJoinRequest(memberId) {
    await fetch(`/api/households?user_id=${user.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_join', household_id: household.id, member_id: memberId })
    })
    setPendingJoinRequests(r => r.filter(m => m.user_id !== memberId))
    loadHousehold(); showToast('Member approved!')
  }

  async function rejectJoinRequest(memberId) {
    await fetch(`/api/households?user_id=${user.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject_join', household_id: household.id, member_id: memberId })
    })
    setPendingJoinRequests(r => r.filter(m => m.user_id !== memberId))
    showToast('Request rejected.')
  }

  async function leaveHousehold() {
    await fetch(`/api/households?user_id=${user.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave', household_id: household.id })
    })
    setHousehold(null); setHouseholdMembers([]); setPantryView('personal')
    showToast('Left household'); setProfilePanel(null)
  }

  async function acceptHouseholdInvite(household_id, notif_id) {
    if (pantry.length > 0) {
      setShowHouseholdWarning({ householdId: household_id, notifId: notif_id })
      return false // warning modal will handle the actual join + notification update
    }
    try {
      const res = await fetch(`/api/households?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept_invite', household_id })
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        showToast(data.error || 'Failed to join household')
        return false
      }
      await loadHousehold()
      await loadPantry()
      showToast('Joined household!')
      return true
    } catch (err) {
      console.error('acceptHouseholdInvite error:', err)
      showToast('Something went wrong joining the household')
      return false
    }
  }

  async function confirmJoinHousehold() {
    if (!showHouseholdWarning) return
    const { householdId, notifId } = showHouseholdWarning
    setShowHouseholdWarning(null)
    try {
      const res = await fetch(`/api/households?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept_invite', household_id: householdId })
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        showToast(data.error || 'Failed to join household')
        return
      }
      // Only mark joined in the notification once we know it actually succeeded
      if (notifId) {
        setNotifications(ns => ns.map(n => n.id === notifId ? {...n, data:{...n.data, joined:true}} : n))
        await fetch(`/api/notifications?user_id=${user.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: notifId, data: { joined: true } })
        })
      }
      await loadHousehold()
      await loadPantry()
      showToast('Joined household! Your items were added to the shared pantry.')
    } catch (err) {
      console.error('confirmJoinHousehold error:', err)
      showToast('Something went wrong joining the household')
    }
  }

  async function declineHouseholdInvite(household_id) {
    await fetch(`/api/households?user_id=${user.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline_invite', household_id })
    })
    showToast('Invitation declined'); loadNotifications()
  }

  // ── Categories ────────────────────────────────────────────────────────────
  async function loadCategoriesThenPantry() {
    await loadCategories()
    await loadPantry()
  }

  async function loadCategories() {
    if (!user) return
    const hidParam = household ? `&household_id=${household.id}` : ''
    const res = await fetch(`/api/categories?user_id=${user.id}${hidParam}`)
    const data = await res.json()
    console.log('loadCategories response:', res.status, data)
    if (!res.ok || data.error) {
      showToast(data.error || 'Failed to load categories')
      return []
    }
    const cats = data.categories || []
    setCategories(cats)
    // Collapse ALL categories definitively — overwrite everything
    const collapsed = { 'Uncategorized': true }
    cats.forEach(c => { collapsed[c.name] = true })
    setCollapsedCats(collapsed)
    return cats
  }

  async function addCategory() {
    if (!newCatName.trim() || !user) return
    const hidParam = household ? `&household_id=${household.id}` : ''
    const res = await fetch(`/api/categories?user_id=${user.id}${hidParam}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName.trim(), emoji: newCatEmoji })
    })
    const data = await res.json()
    if (!res.ok || data.error) { showToast(data.error || 'Failed to add category'); return }
    setCategories(c => [...c, data.category])
    setCollapsedCats(c => ({ ...c, [newCatName.trim()]: true }))
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
    const hidParam = household ? `&household_id=${household.id}` : ''
    await fetch(`/api/categories?user_id=${user.id}${hidParam}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
    })
    showToast('Category deleted')
  }

  function toggleCat(catName) { setCollapsedCats(c => ({ ...c, [catName]: c[catName] === false ? true : false })) }
  function onDragStart(item) { setDragItem(item) }
  function onDragOver(e, catName) { e.preventDefault(); setDragOverCat(catName) }
  async function onDrop(catName) {
    if (!dragItem || dragItem.category === catName) { setDragItem(null); setDragOverCat(null); return }
    setPantry(p => p.map(i => i.id === dragItem.id ? { ...i, category: catName } : i))
    await fetch(`/api/pantry?user_id=${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dragItem.id, category: catName })
    })
    setDragItem(null); setDragOverCat(null); showToast(`Moved to ${catName}`)
  }

  // ── Pantry ────────────────────────────────────────────────────────────────
  async function loadPantry(overrideHouseholdId) {
    if (!user) return
    setPantryLoading(true)
    try {
      // While in a household, ALWAYS load household pantry — personal is inaccessible
      const hid = overrideHouseholdId !== undefined
        ? overrideHouseholdId
        : (household ? household.id : null)
      const res = await fetch(`/api/pantry?user_id=${user.id}${hid ? `&household_id=${hid}` : ''}`)
      const data = await res.json()
      const items = data.items || []
      setPantry(items)
      const cats = ['Uncategorized', ...new Set(items.map(i => i.category || 'Uncategorized'))]
      const collapsed = {}
      cats.forEach(c => { collapsed[c] = true })
      setCollapsedCats(collapsed)
    } catch (e) { console.error(e) }
    setPantryLoading(false)
  }

  async function addManual() {
    const name = manualName.trim()
    if (!name || !user) return
    const hid = activeHouseholdId
    await fetch(`/api/pantry?user_id=${user.id}${hid ? `&household_id=${hid}` : ''}`, {
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
    const hid = activeHouseholdId
    await fetch(`/api/pantry?user_id=${user.id}${hid ? `&household_id=${hid}` : ''}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clearAll: true })
    })
    showToast('Pantry cleared')
  }

  async function clearCategory(catName) {
    setPantry(p => p.filter(i => (i.category || 'Uncategorized') !== catName))
    const hid = activeHouseholdId
    await fetch(`/api/pantry?user_id=${user.id}${hid ? `&household_id=${hid}` : ''}`, {
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
        if (w > maxSize || h > maxSize) { if (w > h) { h = Math.round(h*maxSize/w); w = maxSize } else { w = Math.round(w*maxSize/h); h = maxSize } }
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
        body: JSON.stringify({ ...body, userId: user.id, householdId: household ? household.id : null })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      clearImage(); setReceiptText('')
      setScanResult({ receipt: data.receipt, items: data.items })
      showToast(`${data.items.length} items added to pantry`)
      track('receipt_scanned', { item_count: data.items.length, store: data.receipt?.store_name })
      loadPantry(); loadReceipts()
    } catch (e) { setScanResult({ error: e.message || 'Could not parse receipt.' }) }
    setScanLoading(false)
  }

  // ── History ───────────────────────────────────────────────────────────────
  async function loadReceipts() {
    if (!user) return
    setReceiptsLoading(true)
    try { const res = await fetch(`/api/receipts?user_id=${user.id}`); const data = await res.json(); setReceipts(data.receipts || []) } catch(e){}
    setReceiptsLoading(false)
  }
  async function deleteReceipt(id) {
    setReceipts(r => r.filter(x => x.id !== id))
    await fetch(`/api/receipts?user_id=${user.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    showToast('Receipt deleted')
  }

  // ── Expiry nudges ────────────────────────────────────────────────────────
  async function getExpiryRecipes(item) {
    const avail = pantry.filter(i => i.status !== 'out').map(i => i.name)
    if (avail.length < 2) { showToast('Add at least 2 items to your pantry first'); return }
    setExpiryRecipes({ item, recipes: [], loading: true })
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: avail, priorityItem: item.name })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setExpiryRecipes({ item, recipes: data.recipes || [], loading: false })
    } catch (e) {
      showToast('Could not load recipes. Try again.')
      setExpiryRecipes(null)
    }
  }

  async function addExpiringToCart(item) {
    setExpiringActionSheet(null)
    try {
      const res = await fetch(`/api/cart?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ name: item.name, qty: '', category: item.category || 'Other', source: 'manual' }] })
      })
      const data = await res.json()
      if (!res.ok || data.error) { showToast(data.error || 'Failed to add item'); return }
      showToast(`Added ${item.name} to shopping list`)
      loadCart()
    } catch (err) { console.error('addExpiringToCart error:', err); showToast('Something went wrong') }
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
      track('recipes_suggested', { item_count: avail.length })
    } catch(e) { showToast('Could not load recipes. Try again.') }
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
    track('recipe_saved', { title: recipe.title })
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
    if (!needed.length) { showToast('No missing ingredients!'); return }
    await fetch(`/api/cart?user_id=${user.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: needed.map(n => ({ name: n, qty: '', category: 'Other', source: 'recipe' })) })
    })
    showToast(`${needed.length} ingredients added to cart`); loadCart(); setTab('cart')
  }

  // ── Cart ──────────────────────────────────────────────────────────────────
  async function refreshPantryTab() {
    if (pantryRefreshing) return
    setPantryRefreshing(true)
    const started = Date.now()
    await Promise.all([loadCategories(), loadPantry()])
    const elapsed = Date.now() - started
    if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed)) // keep the spin visible briefly so it doesn't feel like a no-op
    setPantryRefreshing(false)
    showToast('Pantry refreshed')
  }

  async function refreshCartTab() {
    if (cartRefreshing) return
    setCartRefreshing(true)
    const started = Date.now()
    await loadCart()
    const elapsed = Date.now() - started
    if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed))
    setCartRefreshing(false)
    showToast('Shopping lists refreshed')
  }

  async function setListColor(listType, color, extra = {}) {
    setGearColorPickerFor(null)
    setGearMenuFor(null)
    // Optimistic local update
    if (listType === 'personal') setPersonalListColor(color)
    else if (listType === 'household') setHouseholdListColor(color)
    else if (listType === 'shared') setSharedLists(ls => ls.map(l => l.id === extra.shared_list_id ? { ...l, color } : l))

    try {
      const res = await fetch(`/api/cart?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_color', list_type: listType, color, ...extra })
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        showToast(data.error || 'Failed to update color')
        loadCart() // revert optimistic update by reloading real state
        return
      }
    } catch (err) {
      console.error('setListColor error:', err)
      showToast('Something went wrong')
      loadCart()
    }
  }

  async function clearListItems(listType, mode, extra = {}) {
    // mode: 'checked' | 'all'
    setGearMenuFor(null)
    const body = mode === 'all' ? { clearAll: true } : { clearChecked: true }
    if (listType === 'household') body.household_id = extra.household_id
    if (listType === 'shared') body.shared_list_id = extra.shared_list_id
    try {
      await fetch(`/api/cart?user_id=${user.id}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      showToast(mode === 'all' ? 'List cleared' : 'Checked items removed')
      loadCart()
    } catch (err) { console.error('clearListItems error:', err); showToast('Something went wrong') }
  }

  async function archiveSharedList(sharedListId) {
    setGearMenuFor(null)
    try {
      const res = await fetch(`/api/cart?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive_list', shared_list_id: sharedListId })
      })
      const data = await res.json()
      if (!res.ok || data.error) { showToast(data.error || 'Failed to archive list'); return }
      showToast('List archived')
      loadCart()
    } catch (err) { console.error('archiveSharedList error:', err); showToast('Something went wrong') }
  }

  async function loadCart() {
    if (!user) return
    setCartLoading(true)
    try {
      const res = await fetch(`/api/cart?user_id=${user.id}`)
      const data = await res.json()
      console.log('loadCart response:', res.status, data)
      setCart(data.personal || [])
      setHouseholdCart(data.household || [])
      setSharedLists(data.sharedLists || [])
      setArchivedLists(data.archivedLists || [])
      setPersonalListColor(data.personalColor || 'gray')
      setHouseholdListColor(data.householdColor || 'green')
      setIsHouseholdOwner(!!data.isHouseholdOwner)
    } catch(e) { console.error('loadCart error:', e) }
    setCartLoading(false)
  }

  // Debounced brand suggestions as the user types in the add-item modal —
  // purely an assist. If nothing is tapped, the user's own typed text is
  // submitted exactly as-is.
  useEffect(() => {
    if (!addItemModal || !addItemModalName.trim() || addItemModalName.trim().length < 2) {
      setBrandSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      setBrandSuggestLoading(true)
      try {
        const res = await fetch('/api/brand-suggestions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemName: addItemModalName.trim() })
        })
        const data = await res.json()
        setBrandSuggestions(data.brands || [])
      } catch (err) {
        console.error('brand-suggestions fetch error:', err)
        setBrandSuggestions([])
      }
      setBrandSuggestLoading(false)
    }, 450) // debounce — wait for a pause in typing before calling out
    return () => clearTimeout(timer)
  }, [addItemModalName, addItemModal])

  function pickBrandSuggestion(brand) {
    // Prefix the brand onto whatever the user already typed, e.g. "Milk" + "Horizon Organic" -> "Horizon Organic Milk"
    setAddItemModalName(prev => `${brand} ${prev.trim()}`.trim())
    setBrandSuggestions([])
  }

  async function submitAddItemModal() {
    if (!addItemModalName.trim() || !user || !addItemModal) return
    const body = { items: [{ name: addItemModalName.trim(), qty: addItemModalQty, category: 'Other', source: 'manual' }] }
    if (addItemModal.target === 'household' && household) body.household_id = household.id
    else if (addItemModal.target !== 'personal' && addItemModal.target !== 'household') body.friend_id = addItemModal.target
    try {
      const res = await fetch(`/api/cart?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok || data.error) { showToast(data.error || 'Failed to add item'); return }
      showToast(`Added: ${addItemModalName}`)
      setAddItemModalName(''); setAddItemModalQty(''); setAddItemModal(null)
      loadCart()
    } catch (err) { console.error('submitAddItemModal error:', err); showToast('Something went wrong') }
  }

  async function addToCart() {
    if (!cartItemName.trim() || !user) return
    const body = { items: [{ name: cartItemName.trim(), qty: cartItemQty, category: 'Other', source: 'manual' }] }
    if (cartAddTarget === 'household' && household) body.household_id = household.id
    else if (cartAddTarget !== 'personal' && cartAddTarget !== 'household') body.friend_id = cartAddTarget
    try {
      const res = await fetch(`/api/cart?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok || data.error) { showToast(data.error || 'Failed to add item'); return }
      setCartItemName(''); setCartItemQty(''); showToast(`Added: ${cartItemName}`); loadCart()
    } catch (err) { console.error('addToCart error:', err); showToast('Something went wrong') }
  }

  async function toggleCartItem(id, checked, listType) {
    const updateLocal = (list) => list.map(i => i.id === id ? { ...i, checked, bought_by_name: checked ? (profile?.display_name || profile?.username) : null } : i)
    if (listType === 'personal') setCart(updateLocal)
    else if (listType === 'household') setHouseholdCart(updateLocal)
    else setSharedLists(ls => ls.map(l => ({ ...l, items: updateLocal(l.items) })))
    try {
      await fetch(`/api/cart?user_id=${user.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, checked })
      })
    } catch (err) { console.error('toggleCartItem error:', err) }
  }

  async function removeCartItem(id, listType) {
    if (listType === 'personal') setCart(c => c.filter(i => i.id !== id))
    else if (listType === 'household') setHouseholdCart(c => c.filter(i => i.id !== id))
    else setSharedLists(ls => ls.map(l => ({ ...l, items: l.items.filter(i => i.id !== id) })))
    try {
      await fetch(`/api/cart?user_id=${user.id}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
      })
    } catch (err) { console.error('removeCartItem error:', err) }
  }

  async function clearCheckedCart(listType, listId) {
    if (listType === 'personal') setCart(c => c.filter(i => !i.checked))
    else if (listType === 'household') setHouseholdCart(c => c.filter(i => !i.checked))
    else setSharedLists(ls => ls.map(l => l.id === listId ? { ...l, items: l.items.filter(i => !i.checked) } : l))
    const body = { clearChecked: true }
    if (listType === 'household') body.household_id = household?.id
    if (listType === 'shared') body.shared_list_id = listId
    try {
      await fetch(`/api/cart?user_id=${user.id}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      showToast('Checked items removed')
    } catch (err) { console.error('clearCheckedCart error:', err) }
  }

  async function dismissRecipeShare(shareId) {
    setShares(s => s.filter(x => x.id !== shareId))
    setSharedActionSheet(null)
    try {
      await fetch(`/api/shares?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', share_id: shareId })
      })
    } catch (err) { console.error('dismissRecipeShare error:', err) }
  }

  async function dismissSharedListCard(sharedListId) {
    setSharedLists(ls => ls.map(l => l.id === sharedListId ? { ...l, dismissed_from_home: true } : l))
    setSharedActionSheet(null)
    try {
      await fetch(`/api/cart?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss_shared_list', shared_list_id: sharedListId })
      })
    } catch (err) { console.error('dismissSharedListCard error:', err) }
  }

  async function addSharedListToCart(list) {
    setSharedActionSheet(null)
    try {
      const res = await fetch(`/api/cart?user_id=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: list.items.map(i => ({ name: i.name, qty: i.qty, category: i.category, source: 'manual' })) })
      })
      const data = await res.json()
      if (!res.ok || data.error) { showToast(data.error || 'Failed to add items'); return }
      showToast('Items added to your cart!')
      loadCart()
    } catch (err) { console.error('addSharedListToCart error:', err); showToast('Something went wrong') }
  }

  function startSharedListWith(friendId, friendName) {
    setShowFriendListPicker(false)
    setCartAddTarget(friendId)
    // If a section for this friend doesn't exist yet locally, add a placeholder so it shows immediately
    setSharedLists(ls => {
      if (ls.some(l => l.friend_id === friendId)) return ls
      return [...ls, { id: `pending-${friendId}`, friend_id: friendId, friend_name: friendName, items: [] }]
    })
    setOpenCartSections(s => ({ ...s, [friendId]: true }))
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = pantryFilter === 'all' ? pantry
    : pantryFilter === 'expiring' ? pantry.filter(i => i.expiry_date && i.status !== 'out' && Math.ceil((new Date(i.expiry_date) - new Date()) / 86400000) <= 3)
    : pantry.filter(i => i.status === pantryFilter)
  const expiringItems = pantry.filter(i => {
    if (!i.expiry_date || i.status === 'out') return false
    const daysLeft = Math.ceil((new Date(i.expiry_date) - new Date()) / 86400000)
    return daysLeft <= 3
  }).sort((a,b) => new Date(a.expiry_date) - new Date(b.expiry_date))
  const stats = { fresh: pantry.filter(i=>i.status==='fresh').length, low: pantry.filter(i=>i.status==='low').length, out: pantry.filter(i=>i.status==='out').length, expiring: expiringItems.length }
  const catNames = ['Uncategorized', ...categories.map(c => c.name)]
  const groupedPantry = catNames.reduce((acc, cat) => { acc[cat] = filtered.filter(i => (i.category||'Uncategorized')===cat); return acc }, {})
  const orphans = filtered.filter(i => !new Set(catNames).has(i.category||'Uncategorized'))
  if (orphans.length) groupedPantry['Uncategorized'] = [...(groupedPantry['Uncategorized']||[]), ...orphans]
  const savedIds = new Set(savedRecipes.map(r => r.title))
  const cartCheckedCount = cart.filter(i => i.checked).length
  const totalCartItems = cart.length + householdCart.length + sharedLists.reduce((sum, l) => sum + l.items.length, 0)
  const acceptedFriends = [...(friendsData.sent||[]).filter(f=>f.status==='accepted'), ...(friendsData.received||[]).filter(f=>f.status==='accepted')]
  const pendingReceived = (friendsData.received||[]).filter(f=>f.status==='pending')

  // ── Render ────────────────────────────────────────────────────────────────
  if (authLoading || showSplash) return <SplashScreen />
  if (!user) return <LandingPage onSignIn={signInWithGoogle} />

  return (
    <div className={styles.app}>

      {/* HEADER */}
      <header id="tour-header" className={styles.header}>
        <button className={styles.brandBtnHome} onClick={() => setTab('home')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
            <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          <img src="/basket.png" alt="PantryPal" className={styles.headerBasket} />
        </button>
        <button className={styles.titleBtnHome} onClick={() => setTab('home')}>
          <img src="/pantrypal-text.png" alt="PantryPal" className={styles.headerTitleImg} />
        </button>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
        <div style={{position:'relative'}}>
          <button className={styles.coachMarkBtn} onClick={()=>{startTour(tab);setShowHelpHint(false)}} title="Show page tour">?</button>
          {showHelpHint && (
            <div className={styles.helpHint}>
              <div className={styles.helpHintArrow}/>
              Tap for help
            </div>
          )}
        </div>
        <div className={styles.profileArea} data-profile>
          <button className={styles.avatarBtn} onClick={() => { setProfileOpen(o => !o); setProfilePanel(null) }}>
            {unreadCount > 0 && <span className={styles.notifDot}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>

          {profileOpen && (
            <div className={styles.profileMenu}>
              {!profilePanel && (
                <>
                  <div className={styles.profileMenuName}>{profile?.display_name || user.email}</div>
                  {profile?.username && (
                    <div style={{display:'flex',alignItems:'center',gap:8,padding:'4px 16px 10px',background:'#f5ede0'}}>
                      <div className={styles.profileMenuUsername}>@{profile.username}</div>
                      <button
                        className={styles.copyUsernameBtn}
                        onClick={() => {
                          navigator.clipboard.writeText(`@${profile.username}`)
                          showToast('Username copied!')
                        }}
                        title="Copy username"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                    </div>
                  )}
                  <div className={styles.profileMenuDivider} />
                  <button className={styles.profileMenuItem} onClick={() => setProfilePanel('edit')}>✏️ Edit profile</button>
                  <button className={styles.profileMenuItem} onClick={() => { setProfilePanel('friends'); loadFriends() }}>
                    👥 Friends {pendingReceived.length > 0 && <span className={styles.menuBadge}>{pendingReceived.length}</span>}
                  </button>
                  <button className={styles.profileMenuItem} onClick={() => { setProfilePanel('household'); loadHousehold() }}>🏠 My Household</button>
                  <button className={styles.profileMenuItem} onClick={() => { setProfilePanel('notifications'); loadNotifications().then(() => markAllNotificationsRead()) }}>
                    🔔 Notifications {unreadCount > 0 && <span className={styles.menuBadge}>{unreadCount}</span>}
                  </button>
                  <button className={styles.profileMenuItem} onClick={() => { setProfilePanel('shares'); loadShares() }}>📬 Shared with me</button>
                  <div className={styles.profileMenuDivider} />
                  <Link href="/privacy" className={styles.profileMenuItem} style={{textDecoration:'none',display:'block'}}>🔒 Privacy Policy</Link>
                  <button className={styles.profileMenuItemDanger} onClick={() => { signOut(); setProfileOpen(false) }}>🚪 Sign out</button>
                </>
              )}

              {/* Edit Profile Panel */}
              {profilePanel === 'edit' && (
                <div className={styles.panelInner}>
                  <button className={styles.panelBack} onClick={() => setProfilePanel(null)}>← Back</button>
                  <div className={styles.panelTitle}>Edit Profile</div>
                  <label className={styles.panelLabel}>Display name</label>
                  <input className={styles.panelInput} value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} placeholder="Your name" />
                  <label className={styles.panelLabel}>Username</label>
                  <input className={styles.panelInput} value={editUsername} onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="username (letters, numbers, _)" />
                  <button className={styles.panelBtn} onClick={saveProfile} disabled={profileSaving}>{profileSaving ? 'Saving…' : 'Save profile'}</button>
                </div>
              )}

              {/* Friends Panel */}
              {profilePanel === 'friends' && (
                <div className={styles.panelInner}>
                  <button className={styles.panelBack} onClick={() => setProfilePanel(null)}>← Back</button>
                  <div className={styles.panelTitle}>Friends</div>
                  {/* Search at top */}
                  <div className={styles.searchTypeRow}>
                    <button className={friendSearchType==='username'?`${styles.searchTypeBtn} ${styles.searchTypeBtnOn}`:styles.searchTypeBtn} onClick={()=>setFriendSearchType('username')}>Username</button>
                    <button className={friendSearchType==='email'?`${styles.searchTypeBtn} ${styles.searchTypeBtnOn}`:styles.searchTypeBtn} onClick={()=>setFriendSearchType('email')}>Email</button>
                  </div>
                  <div style={{display:'flex',gap:6,marginBottom:12}}>
                    <input className={styles.panelInput} style={{flex:1,marginBottom:0}} value={friendSearch} onChange={e=>setFriendSearch(e.target.value)} placeholder={`Search by ${friendSearchType}…`} onKeyDown={e=>e.key==='Enter'&&searchFriends()} />
                    <button className={styles.panelBtn} style={{marginTop:0,padding:'7px 12px'}} onClick={searchFriends}>Search</button>
                  </div>
                  {friendResults.map(u => (
                    <div key={u.id} className={styles.friendRow}>
                      <div className={styles.friendInfo}>
                        <div className={styles.friendName}>{u.display_name || u.username}</div>
                        {u.username && <div className={styles.friendUser}>@{u.username}</div>}
                      </div>
                      <button className={styles.panelBtnSm} onClick={() => sendFriendRequest(u.id)}>+ Add</button>
                    </div>
                  ))}
                  {/* Pending requests */}
                  {pendingReceived.length > 0 && (
                    <>
                      <div className={styles.panelSection}>Pending requests</div>
                      {pendingReceived.map(f => (
                        <div key={f.id} className={styles.friendRow}>
                          <div className={styles.friendInfo}>
                            <div className={styles.friendName}>{f.requester?.display_name || f.requester?.username}</div>
                          </div>
                          <div style={{display:'flex',gap:4}}>
                            <button className={styles.panelBtnSm} onClick={() => respondToFriendRequest(f.requester_id, 'accept')}>✓</button>
                            <button className={styles.panelBtnSmDanger} onClick={() => respondToFriendRequest(f.requester_id, 'decline')}>✕</button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {/* Friends list sorted by most recently added */}
                  <div className={styles.panelSection}>Your friends ({acceptedFriends.length})</div>
                  {acceptedFriends.length === 0
                    ? <div className={styles.empty} style={{fontSize:12}}>No friends added yet</div>
                    : [...acceptedFriends].sort((a,b) => new Date(b.updated_at||b.created_at) - new Date(a.updated_at||a.created_at)).map(f => {
                        const friend = f.addressee_id === user.id ? f.requester : f.addressee
                        const friendId = f.addressee_id === user.id ? f.requester_id : f.addressee_id
                        return (
                          <div key={f.id} className={styles.friendRow}>
                            <div className={styles.friendInfo}>
                              <div className={styles.friendName}>{friend?.display_name || friend?.username}</div>
                              {friend?.username && <div className={styles.friendUser}>@{friend.username}</div>}
                            </div>
                            <button className={styles.panelBtnSmDanger} onClick={() => confirm(`Remove ${friend?.display_name} as friend?`, () => removeFriend(friendId))}>Remove</button>
                          </div>
                        )
                      })
                  }
                </div>
              )}

              {/* Household Panel */}
              {profilePanel === 'household' && (
                <div className={styles.panelInner}>
                  <button className={styles.panelBack} onClick={() => setProfilePanel(null)}>← Back</button>
                  <div className={styles.panelTitle}>My Household</div>
                  {!household ? (
                    <>
                      <div className={styles.panelNote}>Create a household to share your pantry with family or roommates.</div>
                      <label className={styles.panelLabel}>Household name</label>
                      <input className={styles.panelInput} value={householdName} onChange={e => setHouseholdName(e.target.value)} placeholder="e.g. James Family" onKeyDown={e => e.key==='Enter'&&createHousehold()} />
                      <button className={styles.panelBtn} onClick={createHousehold}>Create household</button>
                    </>
                  ) : (
                    <>
                      {household.owner_id === user.id && editingHHName ? (
                        <input
                          autoFocus
                          defaultValue={household.name}
                          onBlur={e=>renameHousehold(e.target.value)}
                          onKeyDown={e=>{ if(e.key==='Enter') renameHousehold(e.target.value); if(e.key==='Escape') setEditingHHName(false) }}
                          style={{width:'100%',padding:'8px 10px',border:'1.5px solid #4db88a',borderRadius:8,fontSize:14,fontWeight:700,color:'#145040',fontFamily:'inherit',background:'#fff',marginBottom:10}}
                        />
                      ) : (
                        <div className={styles.householdName} style={household.owner_id === user.id ? {cursor:'pointer'} : {}} onClick={()=>household.owner_id === user.id && setEditingHHName(true)}>
                          🏠 {household.name}{household.owner_id === user.id && <span style={{fontSize:10,color:'#4db88a',marginLeft:6,fontWeight:600}}>Edit</span>}
                        </div>
                      )}
                      {/* Pending join requests — only for owner */}
                      {pendingJoinRequests.length > 0 && (
                        <>
                          <div className={styles.panelSection} style={{color:'#856404'}}>⏳ Join requests ({pendingJoinRequests.length})</div>
                          {pendingJoinRequests.map(m => (
                            <div key={m.id} className={styles.friendRow} style={{background:'#fff8e6',borderRadius:8,padding:'6px 8px',marginBottom:4}}>
                              <div className={styles.friendInfo}>
                                <div className={styles.friendName}>{m.profile?.display_name || m.profile?.username}</div>
                                {m.profile?.username && <div className={styles.friendUser}>@{m.profile.username}</div>}
                              </div>
                              <div style={{display:'flex',gap:4}}>
                                <button className={styles.panelBtnSm} onClick={()=>approveJoinRequest(m.user_id)}>Approve</button>
                                <button className={styles.panelBtnSmDanger} onClick={()=>rejectJoinRequest(m.user_id)}>Reject</button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                      <div className={styles.panelSection}>Members ({householdMembers.length})</div>
                      {householdMembers.map(m => (
                        <div key={m.id} className={styles.friendRow}>
                          <div className={styles.friendName}>{m.profile?.display_name || m.profile?.username} {m.role==='owner' && <span className={styles.ownerBadge}>Owner</span>}</div>
                          {household.owner_id === user.id && m.user_id !== user.id && (
                            <button className={styles.panelBtnSmDanger} onClick={() => confirm('Remove this member?', () => { fetch(`/api/households?user_id=${user.id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'remove_member', household_id: household.id, member_id: m.user_id }) }); loadHousehold() })}>Remove</button>
                          )}
                        </div>
                      ))}
                      <div className={styles.panelSection}>Invite someone</div>
                      <div style={{display:'flex',gap:6,marginBottom:8}}>
                        <input className={styles.panelInput} style={{flex:1,marginBottom:0}} value={householdInviteSearch} onChange={e=>setHouseholdInviteSearch(e.target.value)} placeholder="Search by username…" onKeyDown={e=>e.key==='Enter'&&searchHouseholdInvite()} />
                        <button className={styles.panelBtn} style={{marginTop:0,padding:'7px 12px'}} onClick={searchHouseholdInvite}>Find</button>
                      </div>
                      {householdInviteResults.map(u => (
                        <div key={u.id} className={styles.friendRow}>
                          <div className={styles.friendName}>{u.display_name || u.username}</div>
                          <button className={styles.panelBtnSm} onClick={() => inviteToHousehold(u.id)}>Invite</button>
                        </div>
                      ))}
                      <button className={styles.panelBtn} style={{marginBottom:8}} onClick={()=>{setTab('pantry');setPantryView('household');setProfileOpen(false)}}>🧺 View household pantry →</button>
                      <button className={styles.panelBtnDanger} onClick={() => confirm('Leave this household? Your items will return to your personal pantry.', leaveHousehold)}>Leave household</button>
                      {household.owner_id === user.id && (
                        <button className={styles.panelBtnDanger} style={{marginTop:4}} onClick={() => confirm('Delete this household? This cannot be undone.', () => { fetch(`/api/households?user_id=${user.id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'delete', household_id: household.id }) }); setHousehold(null); setHouseholdMembers([]); setPantryView('personal'); setProfilePanel(null) })}>Delete household</button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Notifications Panel */}
              {profilePanel === 'notifications' && (
                <div className={styles.panelInner}>
                  <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
                    <button className={styles.panelBack} onClick={() => setProfilePanel(null)}>← Back</button>
                  </div>
                  <div className={styles.panelTitle}>Notifications</div>
                  {notifications.length === 0
                    ? <div className={styles.panelNote}>No notifications yet.</div>
                    : notifications.map(n => (
                    <div key={n.id} className={styles.notifRow}>
                      <div style={{flex:1}}>
                        <div className={styles.notifTitle}>{n.title}</div>
                        <div className={styles.notifBody}>{n.body}</div>
                        {n.type==='friend_request'&&n.data?.from_user&&(
                          n.data?.accepted
                            ? <div style={{fontSize:11,color:'#2d8a6b',fontWeight:600,marginTop:6}}>✓ Friend added</div>
                            : <div style={{display:'flex',gap:6,marginTop:6}}>
                                <button className={styles.panelBtnSm} onClick={async()=>{
                                  const newData = {...n.data, accepted:true}
                                  setNotifications(ns=>ns.map(x=>x.id===n.id?{...x,data:newData}:x))
                                  await fetch(`/api/notifications?user_id=${user.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:n.id,data:newData})})
                                  await respondToFriendRequest(n.data.from_user,'accept')
                                  loadFriends()
                                }}>Accept</button>
                                <button className={styles.panelBtnSmDanger} onClick={async()=>{
                                  setNotifications(ns=>ns.filter(x=>x.id!==n.id))
                                  await respondToFriendRequest(n.data.from_user,'decline')
                                  loadFriends()
                                }}>Decline</button>
                              </div>
                        )}
                        {n.type==='household_invite'&&n.data?.household_id&&(
                          n.data?.joined
                            ? <div style={{fontSize:11,color:'#2d8a6b',fontWeight:600,marginTop:6}}>✓ Joined household</div>
                            : <div style={{display:'flex',gap:6,marginTop:6}}>
                                <button className={styles.panelBtnSm} onClick={async()=>{
                                  const ok = await acceptHouseholdInvite(n.data.household_id, n.id)
                                  if (ok) {
                                    const newData = {...n.data, joined:true}
                                    setNotifications(ns=>ns.map(x=>x.id===n.id?{...x,data:newData}:x))
                                    await fetch(`/api/notifications?user_id=${user.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:n.id,data:newData})})
                                  }
                                }}>Join</button>
                                <button className={styles.panelBtnSmDanger} onClick={async()=>{
                                  setNotifications(ns=>ns.filter(x=>x.id!==n.id))
                                  declineHouseholdInvite(n.data.household_id)
                                }}>Decline</button>
                              </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Shared with me Panel */}
              {profilePanel === 'shares' && (() => {
                const recipeShares = shares.filter(s => s.share_type === 'recipe')
                return (
                <div className={styles.panelInner}>
                  <button className={styles.panelBack} onClick={() => setProfilePanel(null)}>← Back</button>
                  <div className={styles.panelTitle}>Shared with me</div>
                  {recipeShares.length === 0 && sharedLists.length === 0 ? <div className={styles.panelNote}>Nothing shared with you yet.</div> : (
                    <>
                      {recipeShares.map(s => (
                        <div key={`recipe-${s.id}`} className={styles.shareRow}>
                          <div className={styles.shareIcon}>🍳</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div className={styles.shareTitle}>{s.title}</div>
                            <div className={styles.shareFrom}>Recipe from {s.sender?.display_name || s.sender?.username}</div>
                          </div>
                          <button className={styles.panelBtnSm} onClick={() => { saveRecipe(s.content); showToast('Recipe saved!') }}>Save</button>
                        </div>
                      ))}
                      {sharedLists.map(l => (
                        <div key={`list-${l.id}`} className={styles.shareRow}>
                          <div className={styles.shareIcon}>🛒</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div className={styles.shareTitle}>Shared list with {l.friend_name}</div>
                            <div className={styles.shareFrom}>{l.items.filter(i=>i.checked).length} of {l.items.length} done</div>
                          </div>
                          <button className={styles.panelBtnSm} onClick={() => { setTab('cart'); setOpenCartSections(s=>({...s,[l.friend_id]:true})); setProfileOpen(false) }}>Open</button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )})()}
            </div>
          )}
        </div>
        </div>
      </header>

      <div className={styles.content}>

      {/* When in a household, only the household pantry is shown — personal pantry is hidden until they leave */}

      {/* ══ HOME ══ */}
      {tab === 'home' && (
        <section className={styles.homePage}>
          <div className={styles.homeGreeting}>
            Welcome back, {profile?.username ? `@${profile.username}` : (profile?.display_name || user?.user_metadata?.full_name || 'there')} 👋
          </div>
          <div className={styles.homeGreetingSub}>
            {pantry.length === 0
              ? 'Your pantry is empty — scan a receipt to get started'
              : stats.out > 0 && stats.low > 0
                ? `You have ${stats.out + stats.low} items running low or out of stock`
                : stats.out > 0
                  ? `You have ${stats.out} item${stats.out !== 1 ? 's' : ''} out of stock`
                  : stats.low > 0
                    ? `You have ${stats.low} item${stats.low !== 1 ? 's' : ''} running low`
                    : 'All stocked up! 🎉'}
          </div>

          {/* Scan hero */}
          <div className={styles.scanHero} onClick={() => setTab('scan')}>
            <div className={styles.scanHeroLeft}>
              <div className={styles.scanHeroTitle}>Scan a Receipt</div>
              <div className={styles.scanHeroSub}>Your pantry fills automatically</div>
            </div>
            <div style={{width:54,height:54,borderRadius:'50%',background:'linear-gradient(135deg, #4db88a, #1f6b52)',border:'3px solid #2d8a6b',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(0,0,0,0.3)',flexShrink:0}}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>

          {/* Mini stats — each taps to filtered pantry */}
          <div className={styles.homeMiniStats} id="tour-home-pantry">
            <div className={styles.homeMiniStat} onClick={() => { setTab('pantry'); setPantryFilter('fresh') }}>
              <div className={styles.homeMiniStatVal}>{stats.fresh}</div>
              <div className={styles.homeMiniStatLbl}>In stock</div>
            </div>
            <div className={`${styles.homeMiniStat} ${stats.expiring > 0 ? styles.homeMiniStatLow : ''}`} onClick={() => { setTab('pantry'); setPantryFilter('expiring') }}>
              <div className={styles.homeMiniStatVal}>{stats.expiring}</div>
              <div className={styles.homeMiniStatLbl}>Expiring soon</div>
            </div>
            <div className={`${styles.homeMiniStat} ${stats.out > 0 ? styles.homeMiniStatOut : ''}`} onClick={() => { setTab('pantry'); setPantryFilter('out') }}>
              <div className={styles.homeMiniStatVal}>{stats.out}</div>
              <div className={styles.homeMiniStatLbl}>Out of stock</div>
            </div>
          </div>

          {/* Expiring soon */}
          {expiringItems.length > 0 && (
            <div style={{background:'#fff8e6',border:'1.5px solid #f5d87a',borderRadius:12,padding:'10px 12px',marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:700,color:'#856404',marginBottom:6,display:'flex',alignItems:'center',gap:5}}>
                ⚠ Expiring soon
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {expiringItems.slice(0,3).map(item => {
                  const daysLeft = Math.ceil((new Date(item.expiry_date) - new Date()) / 86400000)
                  return (
                    <div key={item.id} onClick={()=>setExpiringActionSheet(item)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',padding:'4px 0'}}>
                      <span style={{fontSize:12,color:'#3d2b0e',fontWeight:600}}>{item.name}</span>
                      <span style={{fontSize:11,color:daysLeft<0?'#991b1b':'#a07820',fontWeight:600}}>{daysLeft<0?`Expired ${Math.abs(daysLeft)}d ago`:daysLeft===0?'Expires today':`${daysLeft}d left`}</span>
                    </div>
                  )
                })}
                {expiringItems.length > 3 && <div style={{fontSize:10,color:'#a07820',marginTop:2}}>+ {expiringItems.length - 3} more expiring soon</div>}
              </div>
            </div>
          )}

          {/* Shopping list preview */}
          <div className={styles.homeShopBox} id="tour-home-shortcuts" onClick={() => setTab('cart')}>
            <div className={styles.homeShopBoxHdr}>
              <div className={styles.homeShopBoxTitle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2d8a6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                Shopping List
              </div>
              {totalCartItems > 0 && <div className={styles.homeShopBadge}>{totalCartItems}</div>}
              <span className={styles.homeShopArrow}>›</span>
            </div>
            {totalCartItems === 0 ? (
              <div className={styles.homeShopEmpty}>No items yet — add from your pantry or manually</div>
            ) : (
              <div className={styles.homeShopItems}>
                {cart.slice(0, 3).map(item => (
                  <div key={item.id} className={styles.homeShopItem}>
                    <div className={styles.homeShopCb} />
                    <span>{item.name}</span>
                  </div>
                ))}
                {cart.length > 3 && <div className={styles.homeShopMore}>+ {cart.length - 3} more items →</div>}
              </div>
            )}
          </div>

          {/* Household */}
          {household ? (
            <div id="tour-home-household" className={`${styles.homeHHBox} ${styles.homeHHActive} ${styles.homeHHJade}`}>
              <div onClick={()=>setHomeHHExpanded(v=>!v)} style={{cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:32}}>
                <div>
                  <div className={styles.homeHHName} style={{display:'flex',alignItems:'center',gap:6}}>
                    🏠 {household.name}
                    <span
                      onClick={(e)=>{ e.stopPropagation(); setProfileOpen(true); setProfilePanel('household') }}
                      style={{display:'inline-flex',alignItems:'center',justifyContent:'center',cursor:'pointer',opacity:0.7}}
                      title="Manage household"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#145040" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    </span>
                  </div>
                  <div className={styles.homeHHSub}>{householdMembers.length} member{householdMembers.length!==1?'s':''}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div className={styles.homeHHPill}>Active</div>
                  <span style={{fontSize:14,color:'#4db88a',fontWeight:600,transition:'transform .2s',transform: homeHHExpanded ? 'rotate(180deg)' : 'none',display:'inline-block'}}>▾</span>
                </div>
              </div>

              {homeHHExpanded && (
                <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid #c8ead8'}} onClick={e=>e.stopPropagation()}>
                  {household.owner_id === user.id && (
                    <div style={{marginBottom:9}}>
                      {editingHHName ? (
                        <input
                          autoFocus
                          defaultValue={household.name}
                          onBlur={e=>renameHousehold(e.target.value)}
                          onKeyDown={e=>{ if(e.key==='Enter') renameHousehold(e.target.value); if(e.key==='Escape') setEditingHHName(false) }}
                          style={{width:'100%',padding:'6px 8px',border:'1.5px solid #4db88a',borderRadius:7,fontSize:11,fontWeight:700,color:'#145040',fontFamily:'inherit',background:'#fff'}}
                        />
                      ) : (
                        <div onClick={()=>setEditingHHName(true)} style={{fontSize:10,color:'#4db88a',fontWeight:600,cursor:'pointer'}}>
                          Edit household name
                        </div>
                      )}
                    </div>
                  )}
                  {householdMembers.map(m => (
                    <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:'0.5px solid #d4ede0'}}>
                      <div style={{width:24,height:24,borderRadius:'50%',background:'#fff',border:'1.5px solid #4db88a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#2d8a6b',flexShrink:0}}>
                        {(m.profile?.display_name || m.profile?.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{fontSize:10,fontWeight:600,color:'#111',flex:1}}>{m.profile?.display_name || m.profile?.username}</div>
                      {m.role==='owner' && <span style={{fontSize:7,background:'#fff',color:'#2d8a6b',borderRadius:4,padding:'1px 5px',fontWeight:600,border:'1px solid #a8d5c2'}}>Owner</span>}
                    </div>
                  ))}

                  {household.owner_id === user.id && (
                    <div style={{display:'flex',gap:5,marginTop:9,marginBottom:9}} onClick={e=>e.stopPropagation()}>
                      <input
                        value={householdInviteSearch}
                        onChange={e=>setHouseholdInviteSearch(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'&&searchHouseholdInvite()}
                        placeholder="Invite by username"
                        style={{flex:1,padding:'6px 8px',border:'1.5px solid #4db88a',borderRadius:7,fontSize:10,background:'#fff',fontFamily:'inherit'}}
                      />
                      <button onClick={searchHouseholdInvite} style={{padding:'6px 10px',background:'#2d8a6b',color:'#fff',border:'none',borderRadius:7,fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Invite</button>
                    </div>
                  )}

                  {householdInviteResults.length > 0 && (
                    <div onClick={e=>e.stopPropagation()} style={{marginBottom:9}}>
                      {householdInviteResults.map(u => (
                        <div key={u.id} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 0',fontSize:10}}>
                          <div style={{flex:1,fontWeight:600}}>{u.display_name || u.username}</div>
                          <button onClick={() => inviteToHousehold(u.id)} style={{fontSize:9,background:'#2d8a6b',color:'#fff',border:'none',borderRadius:5,padding:'3px 8px',cursor:'pointer',fontFamily:'inherit'}}>Invite</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={()=>{setTab('pantry');setPantryView('household')}}
                    style={{width:'100%',padding:8,background:'linear-gradient(135deg,#4db88a,#2d8a6b)',color:'#fff',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}
                  >
                    View household pantry →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div id="tour-home-household" className={`${styles.homeHHBox} ${styles.homeHHEmpty} ${styles.homeHHJade}`}>
              <div style={{fontSize:12,color:'#7a6a52'}}>🏠 No household yet</div>
              <button className={styles.homeHHLink} onClick={() => { setProfileOpen(true); setProfilePanel('household') }}>Create one →</button>
            </div>
          )}

          {/* Shared with me */}
          {(() => {
            const visibleShares = shares.filter(s => !s.dismissed_from_home && s.share_type === 'recipe')
            const visibleLists = sharedLists.filter(l => !l.dismissed_from_home)
            const totalShared = visibleShares.length + visibleLists.length
            return (
              <>
                <div className={styles.homeSectionHeader}>
                  <div className={styles.homeSectionTitle}>Shared with you</div>
                  {totalShared > 0 && <div className={styles.homeSectionCount}>{totalShared} item{totalShared!==1?'s':''}</div>}
                </div>
                {totalShared === 0 ? (
                  !profile?.username ? (
                    <div id="tour-home-shared" className={styles.homeUsernameNudge} onClick={() => { setProfileOpen(true); setProfilePanel('edit') }}>
                      <div className={styles.nudgeIcon}>👤</div>
                      <div style={{flex:1}}>
                        <div className={styles.nudgeTitle}>Set your username</div>
                        <div className={styles.nudgeSub}>Friends need it to find you and share with you</div>
                      </div>
                      <span className={styles.nudgeArrow}>›</span>
                    </div>
                  ) : (
                    <div id="tour-home-shared" className={styles.homeShareEmptyJade}>Nothing shared with you yet</div>
                  )
                ) : (
                  <div id="tour-home-shared" className={styles.homeSharesScrollJade}>
                    {visibleShares.map(s => (
                      <div key={`recipe-${s.id}`} className={styles.homeShareCard} style={{background:'#e8f0ff',cursor:'pointer'}} onClick={()=>setSharedActionSheet({type:'recipe',item:s})}>
                        <span className={styles.homeShareIcon}>🍳</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div className={styles.homeShareTitle}>{s.title}</div>
                          <div className={styles.homeShareFrom}>Recipe from {s.sender?.display_name || s.sender?.username}</div>
                        </div>
                        <span style={{fontSize:14,color:'#aaa'}}>›</span>
                      </div>
                    ))}
                    {visibleLists.map(l => {
                      const total = l.items.length
                      const done = l.items.filter(i=>i.checked).length
                      const allDone = total > 0 && done === total
                      return (
                        <div key={`list-${l.id}`} className={styles.homeShareCard} style={{background: allDone ? '#e8f5f0' : '#f5ede0', cursor:'pointer'}} onClick={()=>setSharedActionSheet({type:'list',item:l})}>
                          <span className={styles.homeShareIcon}>🛒</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div className={styles.homeShareTitle}>Shared list with {l.friend_name}</div>
                            <div className={styles.homeShareFrom} style={allDone?{color:'#2d8a6b',fontWeight:600}:{}}>{total===0?'No items yet':allDone?'All items done':`${done} of ${total} done`}</div>
                          </div>
                          <span style={{fontSize:14,color:'#aaa'}}>›</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )
          })()}
        </section>
      )}

      {/* ══ PANTRY ══ */}
      {tab === 'pantry' && (
        <section>
          {/* View toggle */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:14,fontWeight:600,color:'#145040'}}>My Pantry</span>
              <button onClick={()=>refreshPantryTab()} disabled={pantryRefreshing} aria-label="Refresh" style={{width:24,height:24,padding:0,border:'none',background:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#7a6a52'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={pantryRefreshing?{animation:'spin 0.8s linear infinite'}:{}}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </button>
            </div>
            <div style={{display:'flex',gap:4,background:'#f5ede0',borderRadius:8,padding:2}}>
              <button onClick={()=>{setPantryViewMode('list');localStorage.setItem('pantryViewMode','list')}} style={{padding:'4px 8px',borderRadius:6,border:'none',background:pantryViewMode==='list'?'#2d8a6b':'transparent',color:pantryViewMode==='list'?'#fff':'#7a6a52',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
              <button onClick={()=>{setPantryViewMode('shelf');localStorage.setItem('pantryViewMode','shelf')}} style={{padding:'4px 8px',borderRadius:6,border:'none',background:pantryViewMode==='shelf'?'#2d8a6b':'transparent',color:pantryViewMode==='shelf'?'#fff':'#7a6a52',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="4" rx="1"/><rect x="2" y="10" width="20" height="4" rx="1"/><rect x="2" y="17" width="20" height="4" rx="1"/></svg>
              </button>
            </div>
          </div>

          <PullToRefresh onRefresh={refreshPantryTab} refreshing={pantryRefreshing}>
          {pantryViewMode === 'shelf' ? (
            <PantryShelf
              categories={categories}
              pantryItems={pantry}
              onCategoryTap={(cat) => setExpandedCat(expandedCat === cat.name ? null : cat.name)}
              onPositionUpdate={updateCategoryPosition}
            />
          ) : null}

          {pantryViewMode === 'list' && (
            <>
              {/* Stat cards that double as filters */}
              <div id="tour-stats" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>
                <button onClick={()=>setPantryFilter('fresh')} style={{padding:'8px 4px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',background:pantryFilter==='fresh'?'#145040':'#e8f5f0',textAlign:'center'}}>
                  <div style={{fontSize:15,fontWeight:800,color:pantryFilter==='fresh'?'#fff':'#2d8a6b'}}>{stats.fresh}</div>
                  <div style={{fontSize:9,color:pantryFilter==='fresh'?'#fff':'#5a7a6a'}}>In stock</div>
                </button>
                <button onClick={()=>setPantryFilter('expiring')} style={{padding:'8px 4px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',background:pantryFilter==='expiring'?'#145040':'#fff8e6',textAlign:'center'}}>
                  <div style={{fontSize:15,fontWeight:800,color:pantryFilter==='expiring'?'#fff':'#856404'}}>{stats.expiring}</div>
                  <div style={{fontSize:9,color:pantryFilter==='expiring'?'#fff':'#a07820'}}>Expiring soon</div>
                </button>
                <button onClick={()=>setPantryFilter('out')} style={{padding:'8px 4px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',background:pantryFilter==='out'?'#145040':'#fee2e2',textAlign:'center'}}>
                  <div style={{fontSize:15,fontWeight:800,color:pantryFilter==='out'?'#fff':'#991b1b'}}>{stats.out}</div>
                  <div style={{fontSize:9,color:pantryFilter==='out'?'#fff':'#b91c1c'}}>Out of stock</div>
                </button>
              </div>
              {pantryFilter !== 'all' && (
                <button onClick={()=>setPantryFilter('all')} style={{fontSize:10,color:'#4db88a',fontWeight:600,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',marginBottom:8,padding:0}}>← Show all items</button>
              )}
            </>
          )}

          {showAddItem && (
            <div className={styles.manualAddBox}>
              <div className={styles.manualRow1}>
                <input type="text" value={manualName} placeholder="Item name…" onChange={e=>setManualName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addManual()} style={{flex:2,minWidth:0}} autoFocus />
                <input type="number" value={manualCount} placeholder="Qty" onChange={e=>setManualCount(e.target.value)} min="0" style={{width:60}} />
                <select value={manualStatus} onChange={e=>setManualStatus(e.target.value)} style={{flex:1}}>
                  <option value="fresh">In stock</option><option value="low">Low</option><option value="out">Out</option>
                </select>
              </div>
              <div className={styles.manualRow2}>
                <select value={manualCategory} onChange={e=>setManualCategory(e.target.value)} style={{flex:1,padding:'7px 10px',border:'1px solid rgba(255,255,255,0.4)',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'rgba(255,255,255,0.92)'}}>
                  {categories.map(c=><option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
                  <option value="Other">📦 Other</option>
                </select>
                <input type="date" value={manualDate} onChange={e=>setManualDate(e.target.value)} className={styles.dateInput} />
                <button onClick={()=>{addManual();setShowAddItem(false)}} className={styles.addBtn}>+ Add</button>
                <button onClick={()=>setShowAddItem(false)} className={styles.iconBtn} style={{color:'#fff'}}>✕</button>
              </div>
            </div>
          )}

          <div id="tour-categories" style={{marginBottom:12}}>
            <div id="tour-filters" style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <span className={styles.sectionLabel} style={{margin:0}}>Categories</span>
              <div style={{position:'relative'}} data-actions>
                <button onClick={()=>setShowActions(a=>!a)} title="Actions" style={{width:26,height:26,borderRadius:'50%',border:'1px solid #e0d8c8',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#7a6a52'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
                {showActions && (
                  <div className={styles.actionsDropdown}>
                    <button className={styles.actionItem} onClick={()=>{addLowItemsToCart();setShowActions(false)}}>🛒 Add low/out to cart</button>
                    <button className={`${styles.actionItem} ${styles.actionDanger}`} onClick={()=>{setShowActions(false);confirm('Clear your entire pantry? This cannot be undone.',clearPantry)}}>🗑 Clear entire pantry</button>
                  </div>
                )}
              </div>
              <div style={{flex:1}} />
              <button className={styles.chip} onClick={()=>setShowAddCat(!showAddCat)}>+ Add category</button>
              <button id="tour-add-item" onClick={()=>setShowAddItem(a=>!a)} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 13px',fontSize:12,fontWeight:600,color:'#fff',background:'#145040',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>+ Add item</button>
            </div>
            {showAddCat && (
              <div style={{display:'flex',gap:6,marginBottom:8}}>
                <input type="text" value={newCatEmoji} onChange={e=>setNewCatEmoji(e.target.value)} style={{width:44,textAlign:'center',padding:'7px 4px',border:'1px solid #e0e0e0',borderRadius:8,fontSize:18}} maxLength={2} />
                <input type="text" value={newCatName} placeholder="Category name…" onChange={e=>setNewCatName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCategory()} style={{flex:1,padding:'7px 11px',border:'1px solid #e0e0e0',borderRadius:8,fontSize:14,fontFamily:'inherit'}} />
                <button onClick={addCategory} className={styles.addBtn}>Add</button>
              </div>
            )}
          </div>

          {pantryLoading ? <div className={styles.loadRow}><Spinner /> Loading…</div> : (
            Object.entries(groupedPantry).map(([catName, items]) => {
              const catObj = categories.find(c=>c.name===catName)
              const emoji = catObj?.emoji || '📦'
              return (
                <div key={catName} className={`${styles.categoryGroup} ${dragOverCat===catName?styles.dragOver:''}`}
                  onDragOver={e=>onDragOver(e,catName)} onDrop={()=>onDrop(catName)} onDragLeave={()=>setDragOverCat(null)}>
                  <div className={styles.categoryHeader} onClick={()=>toggleCat(catName)}>
                    <span className={styles.catName}>{emoji} {catName}</span>
                    <div className={styles.catRight} onClick={e=>e.stopPropagation()}>
                      <span className={styles.catItemCount}>Items: {items.length}</span>
                      {catName==='Uncategorized' && items.length>0 && (
                        <button className={styles.autoCatBtn} disabled={autoCategorizing} onClick={()=>runAutoCategorize(items)}>
                          {autoCategorizing ? 'Categorizing…' : 'Auto-categorize'}
                        </button>
                      )}
                      <div style={{position:'relative'}} data-catmenu>
                        <button className={`${styles.catGearBtn} ${openCatMenu===catName?styles.catGearActive:''}`}
                          onClick={()=>setOpenCatMenu(openCatMenu===catName?null:catName)}>⚙</button>
                        {openCatMenu===catName&&(
                          <div className={styles.catGearDropdown}>
                            {items.length>0&&<button className={styles.catGearItem} onClick={()=>{setOpenCatMenu(null);confirm(`Clear all ${items.length} item${items.length!==1?'s':''} in "${catName}"? This cannot be undone.`,()=>clearCategory(catName))}}>🗑 Clear all items</button>}
                            {items.length>0&&<div className={styles.catGearDivider}/>}
                            {catName!=='Uncategorized'&&catObj
                              ?<button className={`${styles.catGearItem} ${styles.catGearDanger}`} onClick={()=>{setOpenCatMenu(null);confirm(`Delete "${catName}"? Items will move to Uncategorized.`,()=>deleteCategory(catObj.id,catName))}}>✕ Delete category</button>
                              :<button className={styles.catGearItem} style={{color:'#aaa',cursor:'default',fontSize:11}}>Cannot delete Uncategorized</button>
                            }
                          </div>
                        )}
                      </div>
                      <span className={`${styles.categoryChevron} ${collapsedCats[catName]===false?styles.categoryChevronOpen:''}`}>▼</span>
                    </div>
                  </div>
                  {collapsedCats[catName] === false && (
                    items.length===0 ? <div className={styles.emptyCategory}>Drag items here</div> : (
                      <div className={styles.itemsGrid}>
                        {items.map(item=>(
                          <div key={item.id} className={styles.itemCard} draggable onDragStart={()=>onDragStart(item)}
                            style={{borderLeftColor:item.status==='low'?'#f59e0b':item.status==='out'?'#ef4444':'#4db88a'}}>
                            {editingItem===item.id ? (
                              <div style={{display:'flex',flexDirection:'column',gap:4,flex:1}}>
                                <input defaultValue={item.name} onBlur={e=>updateItem(item.id,{name:e.target.value})} style={{fontSize:13,fontWeight:600,padding:'3px 6px',border:'1px solid #3cb87a',borderRadius:5,width:'100%'}} autoFocus />
                                <input defaultValue={item.qty} placeholder="Qty" onBlur={e=>updateItem(item.id,{qty:e.target.value})} style={{fontSize:12,padding:'3px 6px',border:'1px solid #e0e0e0',borderRadius:5,width:'100%'}} />
                                <div style={{display:'flex',alignItems:'center',gap:5}}>
                                  <span style={{fontSize:10,color:'#888',flexShrink:0}}>Expires:</span>
                                  <input type="date" defaultValue={item.expiry_date||''} onBlur={e=>updateItem(item.id,{expiry_date:e.target.value})} style={{fontSize:11,padding:'3px 6px',border:'1px solid #e0e0e0',borderRadius:5,flex:1}} />
                                </div>
                                <button onClick={()=>setEditingItem(null)} style={{fontSize:11,padding:'3px 0',background:'#4db88a',color:'#fff',border:'none',borderRadius:5,cursor:'pointer'}}>Done</button>
                              </div>
                            ) : (
                              <>
                                <div className={styles.itemMain}>
                                  <div className={styles.itemName} title={item.name}>{item.name}</div>
                                  <div className={styles.itemSub}>
                                    {item.qty||''}{item.qty&&item.last_price!=null?' · ':''}{item.last_price!=null?fmt(item.last_price):''}
                                    {item.last_purchased?` · 🗓 ${new Date(item.last_purchased).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`:''}
                                  </div>
                                  {item.expiry_date && (() => {
                                    const daysLeft = Math.ceil((new Date(item.expiry_date) - new Date()) / 86400000)
                                    const soon = daysLeft <= 3
                                    const past = daysLeft < 0
                                    return (
                                      <div style={{fontSize:10,marginTop:2,fontWeight:600,color: past?'#991b1b':soon?'#a07820':'#4db88a'}}>
                                        {past ? `⚠ Expired ${Math.abs(daysLeft)}d ago` : soon ? `⚠ Expires in ${daysLeft}d` : `Expires ${new Date(item.expiry_date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`}
                                      </div>
                                    )
                                  })()}
                                </div>
                                <div className={styles.itemRight}>
                                  <select className={`${styles.statusSel} ${styles['s_'+item.status]}`} value={item.status} onChange={e=>updateItem(item.id,{status:e.target.value})}>
                                    <option value="fresh">✓ Stock</option><option value="low">↓ Low</option><option value="out">✕ Out</option>
                                  </select>
                                  <button className={styles.iconBtn} onClick={()=>setMovingItem(movingItem===item.id?null:item.id)}>📂</button>
                                  <button className={styles.iconBtn} onClick={()=>setEditingItem(item.id)}>✏️</button>
                                  <button className={styles.iconBtn} onClick={()=>removeItem(item.id,item.name)}>✕</button>
                                </div>
                                {movingItem===item.id&&(
                                  <div className={styles.moveCatBox}>
                                    <div className={styles.moveCatLabel}>Move to:</div>
                                    <button className={styles.moveCatBtn} onClick={()=>{updateItem(item.id,{category:'Uncategorized'});setMovingItem(null)}}>📦 Uncategorized</button>
                                    {categories.map(c=>(
                                      <button key={c.id} className={styles.moveCatBtn} onClick={()=>{updateItem(item.id,{category:c.name});setMovingItem(null);showToast(`Moved to ${c.name}`)}}>
                                        {c.emoji} {c.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )
            })
          )}
          </PullToRefresh>
        </section>
      )}

      {/* ══ SCAN ══ */}

      {tab==='scan'&&(
        <section>
          <p className={styles.sectionLabel}>Upload a receipt photo</p>
          {!previewSrc&&(
            <div id="tour-scan-upload" className={styles.uploadBtns}>
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
          {previewSrc&&!scanLoading&&<button className={styles.scanBtn} onClick={()=>doScan({imageBase64:imgBase64,imageMime:imgMime})}>📷 Read receipt</button>}
          {scanLoading&&<div className={styles.loadRow}><Spinner /> Scanning receipt…</div>}
          <div className={styles.divider}>or paste receipt text</div>
          <textarea id="tour-scan-text" className={styles.textarea} value={receiptText} onChange={e=>setReceiptText(e.target.value)} rows={5} placeholder="Paste receipt text, grocery list, or type items and prices…" />
          {!scanLoading&&<button className={styles.scanBtn} style={{marginTop:8,opacity:!receiptText.trim()?0.5:1}} onClick={()=>{if(receiptText.trim())doScan({text:receiptText})}}>✓ Parse text</button>}
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
          :<div id="tour-history-list">{receipts.map(r=>(
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
          ))}</div>}
        </section>
      )}

      {/* ══ RECIPES ══ */}
      {tab==='recipes'&&(
        <section>
          <div id="tour-recipes-row" style={{display:'flex',gap:8,marginBottom:16}}>
            <button id="tour-recipes-btn" className={styles.scanBtn} style={{flex:1}} onClick={getRecipes} disabled={recipeLoading}>
              {recipeLoading?'Finding matches…':'🍳 Suggest recipes from my pantry'}
            </button>
            <button id="tour-recipes-saved" className={`${styles.chip} ${showSaved?styles.chipOn:''}`} onClick={()=>setShowSaved(!showSaved)}>
              ❤️ Saved {savedRecipes.length>0&&`(${savedRecipes.length})`}
            </button>
          </div>
          {recipeLoading&&<div className={styles.loadRow}><Spinner /> Finding matches…</div>}
          {showSaved&&(
            <div style={{marginBottom:16}}>
              <div className={styles.sectionLabel}>Saved recipes</div>
              {savedRecipes.length===0?<div className={styles.empty}>No saved recipes yet!</div>
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
                <div style={{display:'flex',gap:8,marginTop:8,alignItems:'center',flexWrap:'wrap'}}>
                  <button className={styles.stepsToggle} onClick={()=>setOpenSteps(s=>({...s,[i]:!s[i]}))}>
                    {openSteps[i]?'▲ Hide steps':'▼ Show steps'}
                  </button>
                  {r.need?.length>0&&<button className={styles.chip} onClick={()=>addRecipeIngredientsToCart(r)}>🛒 Add missing to cart</button>}
                  <div style={{position:'relative'}} data-actions>
                    <button className={styles.chip} onClick={()=>setShowActions(a=>a===`share-${i}`?false:`share-${i}`)}>📤 Share</button>
                    {showActions===`share-${i}`&&(
                      <div className={styles.actionsDropdown}>
                        {acceptedFriends.length===0
                          ? <div className={styles.actionItem} style={{color:'#888',cursor:'default'}}>Add friends first to share</div>
                          : acceptedFriends.map(f=>{
                              const isSender = f.requester_id === user.id
                              const friend = isSender ? f.addressee : f.requester
                              const fid = isSender ? f.addressee_id : f.requester_id
                              return <button key={fid} className={styles.actionItem} onClick={()=>{shareRecipeWithFriend(r,fid);setShowActions(false)}}>{friend?.display_name||friend?.username}</button>
                            })
                        }
                        <div className={styles.catGearDivider} />
                        <button className={styles.actionItem} style={{color:'#2d8a6b',fontWeight:600}} onClick={()=>{generateShareLink('recipe',r,r.title);setShowActions(false)}}>Share via link</button>
                      </div>
                    )}
                  </div>
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
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div className={styles.sectionLabel} style={{margin:0}}>Shopping lists</div>
              <button onClick={()=>refreshCartTab()} disabled={cartRefreshing} aria-label="Refresh" style={{width:24,height:24,padding:0,border:'none',background:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#7a6a52'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={cartRefreshing?{animation:'spin 0.8s linear infinite'}:{}}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </button>
            </div>
            <button className={styles.chip} onClick={()=>setShowFriendListPicker(v=>!v)}>+ Shared list with friend</button>
          </div>

          {showFriendListPicker && (
            <div className={styles.actionsDropdown} style={{position:'relative',marginBottom:12,width:'100%',maxHeight:220,overflowY:'auto'}}>
              {acceptedFriends.length===0
                ? <div className={styles.actionItem} style={{color:'#888',cursor:'default'}}>Add friends first to start a shared list</div>
                : acceptedFriends.map(f=>{
                    const isSender = f.requester_id === user.id
                    const friend = isSender ? f.addressee : f.requester
                    const fid = isSender ? f.addressee_id : f.requester_id
                    const already = sharedLists.some(l => l.friend_id === fid)
                    return <button key={fid} className={styles.actionItem} onClick={()=>startSharedListWith(fid, friend?.display_name||friend?.username)}>{friend?.display_name||friend?.username}{already?' (open)':''}</button>
                  })
              }
            </div>
          )}

          <button id="tour-cart-pull" className={styles.chip} style={{marginBottom:14}} onClick={addLowItemsToCart}>↓ Pull in low/out pantry items</button>

          <PullToRefresh onRefresh={refreshCartTab} refreshing={cartRefreshing}>
          {cartLoading ? <div className={styles.loadRow}><Spinner /> Loading…</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>

              {/* Household section */}
              {household && (
                <div className={styles.cartSection} style={{background:LIST_COLORS[householdListColor].bg,border:`1.5px solid ${LIST_COLORS[householdListColor].border}`}}>
                  <div className={styles.cartSectionHdr} onClick={()=>setOpenCartSections(s=>({...s,household:!s.household}))}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontSize:14}}>🏠</span>
                      <span style={{fontSize:13,fontWeight:700,color:'#145040'}}>{household.name}</span>
                      <span style={{fontSize:11,color:'#5a7a6a'}}>{householdCart.filter(i=>i.checked).length}/{householdCart.length}</span>
                      {isHouseholdOwner && (
                        <GearMenu
                          menuKey="household" gearMenuFor={gearMenuFor} setGearMenuFor={setGearMenuFor}
                          gearColorPickerFor={gearColorPickerFor} setGearColorPickerFor={setGearColorPickerFor}
                          currentColor={householdListColor} canChangeColor={true}
                          onSetColor={(color)=>setListColor('household',color,{household_id:household.id})}
                          onClearChecked={()=>clearListItems('household','checked',{household_id:household.id})}
                          onClearAll={()=>clearListItems('household','all',{household_id:household.id})}
                        />
                      )}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <button onClick={(e)=>{e.stopPropagation();setAddItemModal({target:'household',label:household.name})}} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',fontSize:11,fontWeight:600,color:'#fff',background:'#145040',border:'none',borderRadius:7,cursor:'pointer',fontFamily:'inherit'}}>+ Add</button>
                      <span style={{fontSize:13,color:'#4db88a',transform:openCartSections.household?'rotate(180deg)':'none',display:'inline-block',transition:'transform .15s'}}>▾</span>
                    </div>
                  </div>
                  {openCartSections.household && (
                    <div className={styles.cartSectionBody}>
                      {householdCart.length===0
                        ? <div className={styles.empty} style={{padding:'8px 0'}}>No items yet</div>
                        : householdCart.map(item=>(
                          <div key={item.id} className={`${styles.cartItem} ${item.checked?styles.cartItemChecked:''}`}>
                            <input type="checkbox" checked={item.checked} onChange={e=>toggleCartItem(item.id,e.target.checked,'household')} className={styles.cartCheck} />
                            <span className={styles.cartItemName}>{item.name}</span>
                            {item.qty&&<span className={styles.cartItemQty}>{item.qty}</span>}
                            <span style={{fontSize:10,color:'#5a7a6a',marginLeft:4}}>{item.checked ? `Bought by ${item.bought_by_name||'?'}` : (item.added_by_name?`Added by ${item.added_by_name}`:'')}</span>
                            <button className={styles.iconBtn} onClick={()=>removeCartItem(item.id,'household')}>✕</button>
                          </div>
                        ))
                      }
                      {householdCart.some(i=>i.checked) && <button className={styles.chip} style={{marginTop:6}} onClick={()=>clearCheckedCart('household')}>Remove checked</button>}
                    </div>
                  )}
                </div>
              )}

              {/* Friend shared lists */}
              {sharedLists.map(list => {
                const listColor = list.color || 'blue'
                return (
                <div key={list.id} className={styles.cartSection} style={{background:LIST_COLORS[listColor].bg,border:`1.5px solid ${LIST_COLORS[listColor].border}`}}>
                  <div className={styles.cartSectionHdr} onClick={()=>setOpenCartSections(s=>({...s,[list.friend_id]:!s[list.friend_id]}))}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:16,height:16,borderRadius:'50%',background:'#fff',border:`1.5px solid ${LIST_COLORS[listColor].border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#1a4a8a'}}>{(list.friend_name||'?').charAt(0).toUpperCase()}</div>
                      <span style={{fontSize:13,fontWeight:700,color:'#1a4a8a'}}>With {list.friend_name}</span>
                      <span style={{fontSize:11,color:'#5a7aa0'}}>{list.items.filter(i=>i.checked).length}/{list.items.length}</span>
                      <GearMenu
                        menuKey={list.id} gearMenuFor={gearMenuFor} setGearMenuFor={setGearMenuFor}
                        gearColorPickerFor={gearColorPickerFor} setGearColorPickerFor={setGearColorPickerFor}
                        currentColor={listColor} canChangeColor={true}
                        onSetColor={(color)=>setListColor('shared',color,{shared_list_id:list.id})}
                        onClearChecked={()=>clearListItems('shared','checked',{shared_list_id:list.id})}
                        onArchive={()=>confirm(`Archive this list with ${list.friend_name}? It will move to Archived lists and you can start a new one if needed.`, ()=>archiveSharedList(list.id))}
                      />
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <button onClick={(e)=>{e.stopPropagation();setAddItemModal({target:list.friend_id,label:`With ${list.friend_name}`})}} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',fontSize:11,fontWeight:600,color:'#fff',background:'#145040',border:'none',borderRadius:7,cursor:'pointer',fontFamily:'inherit'}}>+ Add</button>
                      <span style={{fontSize:13,color:LIST_COLORS[listColor].border,transform:openCartSections[list.friend_id]?'rotate(180deg)':'none',display:'inline-block',transition:'transform .15s'}}>▾</span>
                    </div>
                  </div>
                  {openCartSections[list.friend_id] && (
                    <div className={styles.cartSectionBody}>
                      {list.items.length===0
                        ? <div className={styles.empty} style={{padding:'8px 0'}}>No items yet — add one above</div>
                        : list.items.map(item=>(
                          <div key={item.id} className={`${styles.cartItem} ${item.checked?styles.cartItemChecked:''}`}>
                            <input type="checkbox" checked={item.checked} onChange={e=>toggleCartItem(item.id,e.target.checked,'shared')} className={styles.cartCheck} />
                            <span className={styles.cartItemName}>{item.name}</span>
                            {item.qty&&<span className={styles.cartItemQty}>{item.qty}</span>}
                            <span style={{fontSize:10,color:'#5a7aa0',marginLeft:4}}>{item.checked ? `Bought by ${item.bought_by_name||'?'}` : (item.added_by_name?`Added by ${item.added_by_name}`:'')}</span>
                            <button className={styles.iconBtn} onClick={()=>removeCartItem(item.id,'shared')}>✕</button>
                          </div>
                        ))
                      }
                      {list.items.some(i=>i.checked) && <button className={styles.chip} style={{marginTop:6}} onClick={()=>clearCheckedCart('shared',list.id)}>Remove checked</button>}
                    </div>
                  )}
                </div>
              )})}

              {/* Personal section */}
              <div className={styles.cartSection} style={{background:LIST_COLORS[personalListColor].bg,border:`1.5px solid ${LIST_COLORS[personalListColor].border}`}}>
                <div className={styles.cartSectionHdr} onClick={()=>setOpenCartSections(s=>({...s,personal:!s.personal}))}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:14}}>👤</span>
                    <span style={{fontSize:13,fontWeight:700,color:'#333'}}>Personal</span>
                    <span style={{fontSize:11,color:'#999'}}>{cart.filter(i=>i.checked).length}/{cart.length}</span>
                    <GearMenu
                      menuKey="personal" gearMenuFor={gearMenuFor} setGearMenuFor={setGearMenuFor}
                      gearColorPickerFor={gearColorPickerFor} setGearColorPickerFor={setGearColorPickerFor}
                      currentColor={personalListColor} canChangeColor={true}
                      onSetColor={(color)=>setListColor('personal',color)}
                      onClearChecked={()=>clearListItems('personal','checked')}
                      onClearAll={()=>clearListItems('personal','all')}
                    />
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <button onClick={(e)=>{e.stopPropagation();setAddItemModal({target:'personal',label:'Personal'})}} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',fontSize:11,fontWeight:600,color:'#fff',background:'#145040',border:'none',borderRadius:7,cursor:'pointer',fontFamily:'inherit'}}>+ Add</button>
                    <span style={{fontSize:13,color:'#999',transform:openCartSections.personal?'rotate(180deg)':'none',display:'inline-block',transition:'transform .15s'}}>▾</span>
                  </div>
                </div>
                {openCartSections.personal && (
                  <div className={styles.cartSectionBody}>
                    {cart.length===0
                      ? <div className={styles.empty} style={{padding:'8px 0'}}>Cart is empty — add items above or pull from pantry</div>
                      : ['manual','pantry','recipe'].map(source=>{
                          const sourceItems=cart.filter(i=>i.source===source)
                          if(!sourceItems.length)return null
                          const label=source==='manual'?'Added manually':source==='pantry'?'From pantry':'From recipe'
                          return(
                            <div key={source} style={{marginBottom:6}}>
                              <div style={{fontSize:10,fontWeight:600,color:'#999',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{label}</div>
                              {sourceItems.map(item=>(
                                <div key={item.id} className={`${styles.cartItem} ${item.checked?styles.cartItemChecked:''}`}>
                                  <input type="checkbox" checked={item.checked} onChange={e=>toggleCartItem(item.id,e.target.checked,'personal')} className={styles.cartCheck} />
                                  <span className={styles.cartItemName}>{item.name}</span>
                                  {item.qty&&<span className={styles.cartItemQty}>{item.qty}</span>}
                                  <button className={styles.iconBtn} onClick={()=>removeCartItem(item.id,'personal')}>✕</button>
                                </div>
                              ))}
                            </div>
                          )
                        })
                    }
                    {cartCheckedCount>0 && <button className={styles.chip} style={{marginTop:6}} onClick={()=>clearCheckedCart('personal')}>Remove checked ({cartCheckedCount})</button>}
                  </div>
                )}
              </div>

              {/* Archived lists */}
              {archivedLists.length > 0 && (
                <div className={styles.cartSection} style={{background:'#f5f3f0',border:'1px solid #d8d2c8'}}>
                  <div className={styles.cartSectionHdr} onClick={()=>setShowArchivedLists(v=>!v)}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#777'}}>Archived ({archivedLists.length})</span>
                    </div>
                    <span style={{fontSize:13,color:'#999',transform:showArchivedLists?'rotate(180deg)':'none',display:'inline-block',transition:'transform .15s'}}>▾</span>
                  </div>
                  {showArchivedLists && (
                    <div className={styles.cartSectionBody}>
                      {archivedLists.map(list => (
                        <div key={list.id} style={{padding:'6px 0',borderBottom:'0.5px solid #e0dcd4'}}>
                          <div style={{fontSize:12,fontWeight:600,color:'#666'}}>With {list.friend_name}</div>
                          <div style={{fontSize:10,color:'#999'}}>{list.items.length} item{list.items.length!==1?'s':''} · archived {new Date(list.archived_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
          </PullToRefresh>
        </section>
      )}

      </div>

      {/* BOTTOM NAV */}
      <nav id="tour-bottom-nav" className={styles.bottomNav}>
        {/* Home */}
        <button className={tab==='home'?`${styles.bottomNavItem} ${styles.bottomNavActive}`:styles.bottomNavItem} onClick={()=>setTab('home')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z"/><line x1="9" y1="16" x2="15" y2="16"/></svg>
          <span className={styles.bottomNavLabel}>Home</span>
        </button>
        {/* Shop */}
        <button className={tab==='cart'?`${styles.bottomNavItem} ${styles.bottomNavActive}`:styles.bottomNavItem} onClick={()=>setTab('cart')} style={{position:'relative'}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <span className={styles.bottomNavLabel}>Shop</span>
          {totalCartItems>0&&<span className={styles.cartBadge}>{totalCartItems}</span>}
        </button>
        {/* Scan — floating bump */}
        <button className={styles.bottomNavScanWrap} onClick={()=>setTab('scan')}>
          <div className={`${styles.bottomNavScanBump} ${tab==='scan'?styles.bottomNavScanActive:''}`}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <span className={styles.bottomNavLabel} style={{color: tab==='scan' ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: tab==='scan'?700:500}}>Scan</span>
        </button>
        {/* My Pantry */}
        <button className={tab==='pantry'?`${styles.bottomNavItem} ${styles.bottomNavActive}`:styles.bottomNavItem} onClick={()=>setTab('pantry')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="18" rx="1"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="2" y1="17" x2="22" y2="17"/><rect x="5" y="5" width="3" height="4" rx="0.5"/><rect x="14" y="5" width="4" height="4" rx="0.5"/><rect x="5" y="12" width="4" height="4" rx="0.5"/></svg>
          <span className={styles.bottomNavLabel}>My Pantry</span>
        </button>
        {/* Recipes */}
        <button className={tab==='recipes'?`${styles.bottomNavItem} ${styles.bottomNavActive}`:styles.bottomNavItem} onClick={()=>setTab('recipes')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h1a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H3"/><path d="M21 22h-1a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h1"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>
          <span className={styles.bottomNavLabel}>Recipes</span>
        </button>
      </nav>

      {toast&&<div className={styles.toast}>{toast}</div>}

      {activeTour && <Tour steps={activeTour} onComplete={completeTour} onSkip={skipTour} />}

      {addItemModal && (
        <div className={styles.confirmOverlay} onClick={()=>setAddItemModal(null)}>
          <div className={styles.usernamePromptBox} style={{maxWidth:340}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:13,fontWeight:700,color:'#145040',marginBottom:14}}>Add to {addItemModal.label}</div>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,color:'#888',display:'block',marginBottom:4}}>Item name</label>
              <input autoFocus value={addItemModalName} onChange={e=>setAddItemModalName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitAddItemModal()} placeholder="e.g. Paper towels" style={{width:'100%',padding:'9px 11px',border:'1px solid #e0e0e0',borderRadius:8,fontSize:14,fontFamily:'inherit'}} />
              {brandSuggestLoading && (
                <div style={{fontSize:10,color:'#aaa',marginTop:5}}>Looking up brands…</div>
              )}
              {!brandSuggestLoading && brandSuggestions.length > 0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:7}}>
                  {brandSuggestions.map(brand => (
                    <button
                      key={brand}
                      type="button"
                      onClick={()=>pickBrandSuggestion(brand)}
                      style={{fontSize:11,padding:'4px 10px',borderRadius:14,border:'1px solid #4db88a',background:'#e8f5f0',color:'#1a5c45',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}
                    >{brand}</button>
                  ))}
                </div>
              )}
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:'#888',display:'block',marginBottom:4}}>Quantity (optional)</label>
              <input value={addItemModalQty} onChange={e=>setAddItemModalQty(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitAddItemModal()} placeholder="e.g. 2 bunches" style={{width:'100%',padding:'9px 11px',border:'1px solid #e0e0e0',borderRadius:8,fontSize:14,fontFamily:'inherit'}} />
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setAddItemModal(null);setBrandSuggestions([])}} style={{flex:1,padding:9,border:'none',borderRadius:8,background:'#f5ede0',color:'#555',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
              <button onClick={submitAddItemModal} style={{flex:1,padding:9,border:'none',borderRadius:8,background:'#145040',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add item</button>
            </div>
          </div>
        </div>
      )}

      {sharedActionSheet && (
        <div className={styles.confirmOverlay} onClick={()=>setSharedActionSheet(null)}>
          <div className={styles.usernamePromptBox} style={{maxWidth:360,maxHeight:'80vh'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <span style={{fontSize:22}}>{sharedActionSheet.type==='recipe'?'🍳':'🛒'}</span>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:'#145040'}}>
                  {sharedActionSheet.type==='recipe' ? sharedActionSheet.item.title : `Shared list with ${sharedActionSheet.item.friend_name}`}
                </div>
                <div style={{fontSize:11,color:'#888'}}>
                  {sharedActionSheet.type==='recipe'
                    ? `Recipe from ${sharedActionSheet.item.sender?.display_name || sharedActionSheet.item.sender?.username}`
                    : `${sharedActionSheet.item.items.filter(i=>i.checked).length} of ${sharedActionSheet.item.items.length} items checked off`
                  }
                </div>
              </div>
            </div>

            <button
              style={{width:'100%',textAlign:'left',padding:'12px 4px',border:'none',background:'none',fontSize:13,fontWeight:600,color:'#145040',cursor:'pointer',fontFamily:'inherit',borderBottom:'0.5px solid #f0e6d0'}}
              onClick={()=>{
                if (sharedActionSheet.type==='recipe') {
                  const r = sharedActionSheet.item.content || {}
                  const allIngredients = [...(r.have||[]), ...(r.need||[])]
                  const pantryNames = new Set(pantry.filter(i=>i.status!=='out').map(i=>i.name.toLowerCase()))
                  const recomputedHave = allIngredients.filter(ing => pantryNames.has(ing.toLowerCase()))
                  const recomputedNeed = allIngredients.filter(ing => !pantryNames.has(ing.toLowerCase()))
                  setSharedRecipeDetail({
                    title: sharedActionSheet.item.title,
                    description: r.description,
                    time: r.time,
                    steps: r.steps,
                    have: recomputedHave,
                    need: recomputedNeed,
                    sender: sharedActionSheet.item.sender
                  })
                  setSharedActionSheet(null)
                } else {
                  setTab('cart'); setOpenCartSections(s=>({...s,[sharedActionSheet.item.friend_id]:true})); setSharedActionSheet(null)
                }
              }}
            >Open</button>

            <button
              style={{width:'100%',textAlign:'left',padding:'12px 4px',border:'none',background:'none',fontSize:13,fontWeight:600,color:'#145040',cursor:'pointer',fontFamily:'inherit',borderBottom:'0.5px solid #f0e6d0'}}
              onClick={()=>{
                if (sharedActionSheet.type==='recipe') {
                  const ingredients = (sharedActionSheet.item.content?.ingredients || []).map(i => ({ name: i.name || i, qty: i.qty || '', category: 'Other', source: 'recipe' }))
                  fetch(`/api/cart?user_id=${user.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:ingredients})})
                    .then(()=>{ showToast('Ingredients added to cart!'); loadCart() })
                  setSharedActionSheet(null)
                } else {
                  addSharedListToCart(sharedActionSheet.item)
                }
              }}
            >Add to cart</button>

            <button
              style={{width:'100%',textAlign:'left',padding:'12px 4px',border:'none',background:'none',fontSize:13,fontWeight:600,color:'#c0392b',cursor:'pointer',fontFamily:'inherit'}}
              onClick={()=>{
                if (sharedActionSheet.type==='recipe') dismissRecipeShare(sharedActionSheet.item.id)
                else dismissSharedListCard(sharedActionSheet.item.id)
              }}
            >Clear from list</button>

            <div style={{fontSize:10,color:'#aaa',marginTop:10,textAlign:'center'}}>This only removes it from your home page — it stays in Shared with me.</div>
          </div>
        </div>
      )}

      {expiringActionSheet && (
        <div className={styles.confirmOverlay} onClick={()=>setExpiringActionSheet(null)}>
          <div className={styles.usernamePromptBox} style={{maxWidth:340}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <span style={{fontSize:22}}>⚠️</span>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:'#145040'}}>{expiringActionSheet.name}</div>
                <div style={{fontSize:11,color:'#888'}}>
                  {(() => {
                    const d = Math.ceil((new Date(expiringActionSheet.expiry_date) - new Date()) / 86400000)
                    return d<0?`Expired ${Math.abs(d)} days ago`:d===0?'Expires today':`Expires in ${d} day${d!==1?'s':''}`
                  })()}
                </div>
              </div>
            </div>
            <button
              style={{width:'100%',textAlign:'left',padding:'12px 4px',border:'none',background:'none',fontSize:13,fontWeight:600,color:'#145040',cursor:'pointer',fontFamily:'inherit',borderBottom:'0.5px solid #f0e6d0'}}
              onClick={()=>{ getExpiryRecipes(expiringActionSheet); setExpiringActionSheet(null) }}
            >Suggest recipes using this</button>
            <button
              style={{width:'100%',textAlign:'left',padding:'12px 4px',border:'none',background:'none',fontSize:13,fontWeight:600,color:'#145040',cursor:'pointer',fontFamily:'inherit',borderBottom:'0.5px solid #f0e6d0'}}
              onClick={()=>addExpiringToCart(expiringActionSheet)}
            >Add more to shopping list</button>
            <button
              style={{width:'100%',textAlign:'left',padding:'12px 4px',border:'none',background:'none',fontSize:13,fontWeight:600,color:'#888',cursor:'pointer',fontFamily:'inherit'}}
              onClick={()=>setExpiringActionSheet(null)}
            >Cancel</button>
          </div>
        </div>
      )}

      {expiryRecipes && (
        <div className={styles.confirmOverlay} onClick={()=>setExpiryRecipes(null)}>
          <div className={styles.usernamePromptBox} style={{maxWidth:460,maxHeight:'80vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:'#145040'}}>Recipes using {expiryRecipes.item.name}</div>
                <div style={{fontSize:11,color:'#888'}}>Use it up before it expires</div>
              </div>
              <span onClick={()=>setExpiryRecipes(null)} style={{fontSize:18,color:'#aaa',cursor:'pointer'}}>✕</span>
            </div>
            {expiryRecipes.loading ? (
              <div className={styles.loadRow}><Spinner /> Finding recipes…</div>
            ) : expiryRecipes.recipes.length === 0 ? (
              <div className={styles.empty}>No recipes found — try again later.</div>
            ) : (
              expiryRecipes.recipes.map((r,i) => (
                <div key={i} className={styles.recipeCard} style={{marginBottom:8}}>
                  <div className={styles.recipeTop}>
                    <div><div className={styles.recipeName}>{r.title}</div><div className={styles.recipeTime}>⏱ {r.time}</div></div>
                    <span className={styles.matchBadge}>{Math.round(r.match_pct)}%</span>
                  </div>
                  <div className={styles.recipeDesc}>{r.description}</div>
                  <div className={styles.tags}>
                    {r.have?.map(x=><span key={x} className={`${styles.tag} ${styles.tagHave}`}>✓ {x}</span>)}
                    {r.need?.map(x=><span key={x} className={`${styles.tag} ${styles.tagNeed}`}>+ {x}</span>)}
                  </div>
                  {r.need?.length>0 && <button className={styles.chip} style={{marginTop:6}} onClick={()=>addRecipeIngredientsToCart(r)}>🛒 Add missing to cart</button>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {sharedRecipeDetail && (
        <div className={styles.confirmOverlay} onClick={()=>setSharedRecipeDetail(null)}>
          <div className={styles.usernamePromptBox} style={{maxWidth:420,maxHeight:'80vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:4}}>
              <div style={{fontSize:16,fontWeight:800,color:'#145040',flex:1}}>{sharedRecipeDetail.title}</div>
              <span onClick={()=>setSharedRecipeDetail(null)} style={{fontSize:18,color:'#aaa',cursor:'pointer',padding:'0 0 0 10px'}}>✕</span>
            </div>
            <div style={{fontSize:11,color:'#888',marginBottom:2}}>Recipe from {sharedRecipeDetail.sender?.display_name || sharedRecipeDetail.sender?.username}</div>
            {sharedRecipeDetail.time && <div style={{fontSize:11,color:'#888',marginBottom:10}}>⏱ {sharedRecipeDetail.time}</div>}
            {sharedRecipeDetail.description && <div style={{fontSize:13,color:'#444',lineHeight:1.5,marginBottom:14}}>{sharedRecipeDetail.description}</div>}

            <div className={styles.tags} style={{marginBottom:14}}>
              {sharedRecipeDetail.have.map(x=><span key={x} className={`${styles.tag} ${styles.tagHave}`}>✓ {x}</span>)}
              {sharedRecipeDetail.need.map(x=><span key={x} className={`${styles.tag} ${styles.tagNeed}`}>+ {x}</span>)}
            </div>

            {sharedRecipeDetail.steps && (
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:'#145040',marginBottom:6}}>Steps</div>
                <div style={{fontSize:13,color:'#444',lineHeight:1.6,whiteSpace:'pre-line'}}>{sharedRecipeDetail.steps}</div>
              </div>
            )}

            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setSharedRecipeDetail(null)} style={{flex:1,padding:9,border:'none',borderRadius:8,background:'#f5ede0',color:'#555',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Close</button>
              {sharedRecipeDetail.need.length > 0 ? (
                <button
                  onClick={async()=>{
                    await fetch(`/api/cart?user_id=${user.id}`, {
                      method:'POST', headers:{'Content-Type':'application/json'},
                      body: JSON.stringify({ items: sharedRecipeDetail.need.map(n=>({ name:n, qty:'', category:'Other', source:'recipe' })) })
                    })
                    showToast(`${sharedRecipeDetail.need.length} ingredients added to cart`)
                    loadCart()
                    setSharedRecipeDetail(null)
                  }}
                  style={{flex:1,padding:9,border:'none',borderRadius:8,background:'#2d8a6b',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}
                >Add {sharedRecipeDetail.need.length} missing to cart</button>
              ) : (
                <div style={{flex:1,padding:9,textAlign:'center',fontSize:12,color:'#2d8a6b',fontWeight:600}}>You have everything! ✓</div>
              )}
            </div>
          </div>
        </div>
      )}

      {shareLinkModal && (
        <div className={styles.confirmOverlay}>
          <div className={styles.usernamePromptBox} style={{maxWidth:360,textAlign:'center'}}>
            <div style={{fontSize:32,textAlign:'center',marginBottom:8}}>🔗</div>
            <div className={styles.promptTitle}>Link ready to share</div>
            <div style={{fontSize:11,color:'#888',marginBottom:14}}>
              Anyone with this link can claim your {shareLinkModal.type === 'recipe' ? 'recipe' : 'shopping cart'} — even if they don't have PantryPal yet. Expires in 3 days, usable once.
            </div>
            <div style={{display:'flex',gap:6,marginBottom:14}}>
              <input readOnly value={shareLinkModal.url} onClick={e=>e.target.select()} style={{flex:1,padding:'9px 10px',border:'1.5px solid #4db88a',borderRadius:8,fontSize:11,fontFamily:'inherit',background:'#fff',color:'#555'}} />
              <button onClick={()=>{navigator.clipboard.writeText(shareLinkModal.url);showToast('Link copied!')}} style={{padding:'9px 12px',background:'#2d8a6b',color:'#fff',border:'none',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Copy</button>
            </div>
            <button style={{width:'100%',padding:9,border:'none',borderRadius:8,background:'#f5ede0',color:'#555',fontSize:12,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>setShareLinkModal(null)}>Done</button>
          </div>
        </div>
      )}

      {categorizeReview && (
        <div className={styles.confirmOverlay}>
          <div className={styles.usernamePromptBox} style={{maxWidth:380,textAlign:'left'}}>
            <div className={styles.promptTitle} style={{textAlign:'left'}}>Suggested categories</div>
            <div style={{fontSize:11,color:'#888',marginBottom:10}}>Review before applying — uncheck any you don't want moved</div>
            <div style={{maxHeight:300,overflowY:'auto',marginBottom:10}}>
              {categorizeReview.results.map(r => (
                <div key={r.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'0.5px solid #f0e6d0'}}>
                  <div
                    onClick={()=>r.suggestedCategory && toggleCategorizeCheck(r.id)}
                    style={{
                      width:14,height:14,borderRadius:'50%',flexShrink:0,cursor:r.suggestedCategory?'pointer':'default',
                      border: r.suggestedCategory ? '1.5px solid #4db88a' : '1.5px solid #ddd',
                      background: r.suggestedCategory && categorizeReview.checked[r.id] ? '#4db88a' : 'transparent',
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff'
                    }}
                  >
                    {r.suggestedCategory && categorizeReview.checked[r.id] ? '✓' : ''}
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color: r.suggestedCategory ? '#111' : '#aaa',flex:1}}>{r.name}</div>
                  <span style={{fontSize:11,color:'#aaa'}}>→</span>
                  <span style={{
                    fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,
                    background: r.suggestedCategory ? '#e8f5f0' : '#f5ede0',
                    color: r.suggestedCategory ? '#1a5c45' : '#aaa',
                    border: r.suggestedCategory ? '1px solid #a8d5c2' : '1px solid #e0d8c8'
                  }}>{r.suggestedCategory || 'No match'}</span>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button style={{flex:1,padding:9,border:'none',borderRadius:8,background:'#f5ede0',color:'#555',fontSize:11,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>setCategorizeReview(null)}>Cancel</button>
              <button style={{flex:1,padding:9,border:'none',borderRadius:8,background:'#2d8a6b',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}} onClick={applyCategorizeReview}>
                Apply {Object.values(categorizeReview.checked).filter(Boolean).length} categor{Object.values(categorizeReview.checked).filter(Boolean).length===1?'y':'ies'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHouseholdWarning && (
        <div className={styles.confirmOverlay}>
          <div className={styles.usernamePromptBox}>
            <div style={{fontSize:32,textAlign:'center',marginBottom:10}}>⚠️</div>
            <div className={styles.promptTitle}>Before you join…</div>
            <div className={styles.whyBox} style={{background:'#fff8e6',border:'1px solid #f5d87a'}}>
              <div className={styles.whyItem} style={{color:'#6b4a00'}}>🏠 You'll use the household pantry instead of your personal one</div>
              <div className={styles.whyItem} style={{color:'#6b4a00'}}>📦 Your items move to "{profile?.display_name}'s Items" category in the shared pantry</div>
              <div className={styles.whyItem} style={{color:'#6b4a00'}}>🔀 You can drag them into existing categories anytime</div>
              <div className={styles.whyItem} style={{color:'#6b4a00'}}>↩ If you leave, your items come back to your personal pantry</div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:4}}>
              <button className={styles.promptSkip} style={{flex:1,padding:10,border:'1px solid #e8d8c0',borderRadius:10,color:'#555'}} onClick={()=>setShowHouseholdWarning(null)}>Cancel</button>
              <button className={styles.promptBtn} style={{flex:1,margin:0}} onClick={confirmJoinHousehold}>Join household →</button>
            </div>
          </div>
        </div>
      )}

      {showUsernamePrompt && (
        <div className={styles.confirmOverlay}>
          <div className={styles.usernamePromptBox}>
            <img src="/logo.png" alt="PantryPal" className={styles.promptLogo} />
            <div className={styles.promptTitle}>Welcome to PantryPal!</div>
            <div className={styles.promptSub}>Set a username so friends can find and connect with you.</div>
            <div className={styles.whyBox}>
              <div className={styles.whyItem}><span>👥</span> Find and add friends</div>
              <div className={styles.whyItem}><span>🍳</span> Share recipes</div>
              <div className={styles.whyItem}><span>🛒</span> Share shopping lists</div>
              <div className={styles.whyItem}><span>🏠</span> Create a household</div>
            </div>
            <label className={styles.promptLabel}>Choose your username</label>
            <div className={styles.promptInputRow}>
              <span className={styles.promptAt}>@</span>
              <input className={styles.promptInput} value={usernameInput} onChange={e=>setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="yourname" autoFocus />
            </div>
            <div className={styles.promptHint}>Letters, numbers and underscores only.</div>
            {usernameInput && <div className={styles.promptPreview}>You'll appear as @{usernameInput}</div>}
            {usernameError && <div className={styles.promptError}>{usernameError}</div>}
            <button className={styles.promptBtn} onClick={saveUsernameAndContinue} disabled={usernameSaving}>
              {usernameSaving ? 'Saving…' : 'Set username & continue →'}
            </button>
            <button className={styles.promptSkip} onClick={dismissUsernamePrompt}>
              Skip for now — <span>set it later in profile</span>
            </button>
          </div>
        </div>
      )}

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
