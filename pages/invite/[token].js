import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/Invite.module.css'

export default function InvitePage() {
  const router = useRouter()
  const { token } = router.query
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!token) return
    fetch(`/api/share-links?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setPreview(data)
      })
      .catch(() => setError('Something went wrong loading this link'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleClaim() {
    if (!user) {
      localStorage.setItem('pendingShareToken', token)
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `https://pantrypal-green.vercel.app/invite/${token}` }
      })
      return
    }
    setClaiming(true)
    const res = await fetch('/api/share-links', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim', token, user_id: user.id })
    })
    const data = await res.json()
    if (data.error) {
      setError(data.error)
    } else {
      setClaimed(true)
      setTimeout(() => router.push('/'), 2000)
    }
    setClaiming(false)
  }

  useEffect(() => {
    if (!user) return
    const pending = localStorage.getItem('pendingShareToken')
    if (pending && pending === token && !claimed) {
      localStorage.removeItem('pendingShareToken')
      handleClaim()
    }
  }, [user, token])

  if (loading) {
    return <div className={styles.wrap}><div className={styles.card}><div className={styles.loading}>Loading…</div></div></div>
  }

  if (error) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.logoWrap}><img src="/logo.png" alt="PantryPal" className={styles.logo} /></div>
          <div className={styles.errorTitle}>Link unavailable</div>
          <div className={styles.errorMsg}>{error}</div>
          <a href="/" className={styles.btn}>Go to PantryPal →</a>
        </div>
      </div>
    )
  }

  if (claimed) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <div className={styles.successTitle}>
            {preview?.share_type === 'recipe' ? 'Recipe saved!' : 'Cart added!'}
          </div>
          <div className={styles.errorMsg}>Taking you to PantryPal…</div>
        </div>
      </div>
    )
  }

  const itemCount = preview?.content?.items?.length || 0

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logoWrap}><img src="/logo.png" alt="PantryPal" className={styles.logo} /></div>
        <div className={styles.senderLine}>
          <strong>{preview?.sender?.display_name || preview?.sender?.username || 'Someone'}</strong> shared {preview?.share_type === 'recipe' ? 'a recipe' : 'their shopping cart'} with you
        </div>

        {preview?.share_type === 'cart' ? (
          <div className={styles.previewBox}>
            <div className={styles.previewLabel}>Shopping list · {itemCount} item{itemCount !== 1 ? 's' : ''}</div>
            <div className={styles.previewItems}>
              {(preview?.content?.items || []).slice(0, 6).map((item, i) => (
                <div key={i} className={styles.previewItem}>{item.name}</div>
              ))}
              {itemCount > 6 && <div className={styles.previewMore}>+ {itemCount - 6} more</div>}
            </div>
          </div>
        ) : (
          <div className={styles.previewBox}>
            <div className={styles.previewLabel}>{preview?.title}</div>
          </div>
        )}

        <button className={styles.btn} onClick={handleClaim} disabled={claiming}>
          {claiming ? 'Adding…' : user ? 'Add to my PantryPal' : 'Sign in with Google to claim'}
        </button>
        <div className={styles.note}>This link expires in 3 days and can only be used once.</div>
      </div>
    </div>
  )
}
