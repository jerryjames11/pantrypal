import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  const { user_id } = req.query
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { data: shareRows, error } = await sb.from('friend_shares')
      .select('*').eq('to_user', user_id).order('created_at', { ascending: false })
    if (error) {
      console.error('Load shares error:', error)
      return res.status(500).json({ error: error.message })
    }

    // Fetch sender profiles separately to avoid FK alias issues
    const senderIds = [...new Set((shareRows || []).map(s => s.from_user))]
    let senderMap = {}
    if (senderIds.length > 0) {
      const { data: profiles } = await sb.from('profiles')
        .select('id,display_name,username,avatar_url').in('id', senderIds)
      profiles?.forEach(p => { senderMap[p.id] = p })
    }
    const shares = (shareRows || []).map(s => ({ ...s, sender: senderMap[s.from_user] || null }))

    return res.status(200).json({ shares })
  }

  if (req.method === 'POST') {
    const { to_user, share_type, title, content, action, share_id } = req.body

    if (action === 'dismiss') {
      const { error } = await sb.from('friend_shares')
        .update({ dismissed_from_home: true }).eq('id', share_id).eq('to_user', user_id)
      if (error) {
        console.error('Dismiss share error:', error)
        return res.status(500).json({ error: error.message })
      }
      return res.status(200).json({ ok: true })
    }

    if (!to_user || !share_type) return res.status(400).json({ error: 'to_user and share_type required' })

    try {
      // Verify they are friends
      const { data: friendships, error: friendErr } = await sb.from('friendships').select('id,status').or(
        `and(requester_id.eq.${user_id},addressee_id.eq.${to_user}),and(requester_id.eq.${to_user},addressee_id.eq.${user_id})`
      )
      if (friendErr) {
        console.error('Friendship check error:', friendErr)
        return res.status(500).json({ error: friendErr.message })
      }
      const isFriends = (friendships || []).some(f => f.status === 'accepted')
      if (!isFriends) {
        console.error('Share blocked — not friends:', user_id, to_user, friendships)
        return res.status(403).json({ error: 'You can only share with friends' })
      }

      const { error: insertErr } = await sb.from('friend_shares').insert({ from_user: user_id, to_user, share_type, title, content })
      if (insertErr) {
        console.error('Share insert error:', insertErr)
        return res.status(500).json({ error: insertErr.message })
      }

      const { data: senderProfile } = await sb.from('profiles').select('display_name').eq('id', user_id).single()
      const { error: notifErr } = await sb.from('notifications').insert({
        user_id: to_user,
        type: share_type === 'recipe' ? 'share_recipe' : 'share_cart',
        title: share_type === 'recipe' ? 'Recipe shared with you' : 'Shopping cart shared with you',
        body: `${senderProfile?.display_name || 'A friend'} shared ${share_type === 'recipe' ? `"${title}"` : 'their shopping cart'} with you`,
        data: { from_user: user_id, share_type, title }
      })
      if (notifErr) console.error('Share notification error:', notifErr)

      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('shares POST crashed:', err)
      return res.status(500).json({ error: 'Failed to share' })
    }
  }
  res.status(405).end()
}
