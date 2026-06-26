import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  const { user_id } = req.query
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    // Get all friendships involving this user
    const { data: sent, error: e1 } = await sb.from('friendships')
      .select('*').eq('requester_id', user_id)
    const { data: received, error: e2 } = await sb.from('friendships')
      .select('*').eq('addressee_id', user_id)

    if (e1 || e2) return res.status(500).json({ error: e1?.message || e2?.message })

    // Collect all other user IDs and fetch their profiles separately
    const otherIds = [
      ...(sent || []).map(f => f.addressee_id),
      ...(received || []).map(f => f.requester_id)
    ].filter(Boolean)

    let profileMap = {}
    if (otherIds.length > 0) {
      const { data: profiles } = await sb.from('profiles')
        .select('id,username,display_name,avatar_url')
        .in('id', [...new Set(otherIds)])
      profiles?.forEach(p => { profileMap[p.id] = p })
    }

    // Attach profiles to friendships
    const sentWithProfiles = (sent || []).map(f => ({
      ...f, addressee: profileMap[f.addressee_id] || null
    }))
    const receivedWithProfiles = (received || []).map(f => ({
      ...f, requester: profileMap[f.requester_id] || null
    }))

    return res.status(200).json({ sent: sentWithProfiles, received: receivedWithProfiles })
  }

  if (req.method === 'POST') {
    const { action, search, friend_id } = req.body

    if (action === 'search') {
      const { data } = await sb.from('profiles').select('id,username,display_name,avatar_url')
        .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
        .neq('id', user_id).limit(10)
      return res.status(200).json({ results: data || [] })
    }

    if (action === 'search_email') {
      const { data: userData } = await sb.auth.admin.listUsers()
      const match = userData?.users?.find(u => u.email?.toLowerCase() === search.toLowerCase())
      if (!match) return res.status(200).json({ results: [] })
      const { data: profile } = await sb.from('profiles').select('id,username,display_name,avatar_url').eq('id', match.id).single()
      return res.status(200).json({ results: profile ? [profile] : [] })
    }

    if (action === 'request') {
      console.log('Friend request:', user_id, '->', friend_id)
      const { error } = await sb.from('friendships').insert({ requester_id: user_id, addressee_id: friend_id })
      if (error) {
        console.error('Friend request insert error:', error)
        return res.status(500).json({ error: error.message })
      }
      const { data: senderProfile } = await sb.from('profiles').select('display_name,username').eq('id', user_id).single()
      const { error: notifError } = await sb.from('notifications').insert({
        user_id: friend_id, type: 'friend_request',
        title: 'New friend request',
        body: `${senderProfile?.display_name || senderProfile?.username || 'Someone'} wants to be your friend on PantryPal`,
        data: { from_user: user_id }
      })
      if (notifError) console.error('Friend request notification error:', notifError)
      return res.status(200).json({ ok: true })
    }

    if (action === 'accept') {
      console.log('Accepting friend request:', friend_id, '->', user_id)
      const { data: updated, error } = await sb.from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('requester_id', friend_id).eq('addressee_id', user_id)
        .select()
      if (error) {
        console.error('Friend accept update error:', error)
        return res.status(500).json({ error: error.message })
      }
      if (!updated || updated.length === 0) {
        console.error('Friend accept: no matching row found for', friend_id, user_id)
        return res.status(404).json({ error: 'Friend request not found' })
      }
      console.log('Friend request accepted:', updated)
      const { data: accepterProfile } = await sb.from('profiles').select('display_name,username').eq('id', user_id).single()
      const { error: notifError } = await sb.from('notifications').insert({
        user_id: friend_id, type: 'friend_accepted',
        title: 'Friend request accepted',
        body: `${accepterProfile?.display_name || accepterProfile?.username || 'Someone'} accepted your friend request`,
        data: { from_user: user_id }
      })
      return res.status(200).json({ ok: true })
    }

    if (action === 'decline') {
      await sb.from('friendships').update({ status: 'declined' })
        .eq('requester_id', friend_id).eq('addressee_id', user_id)
      return res.status(200).json({ ok: true })
    }

    if (action === 'remove') {
      await sb.from('friendships').delete()
        .or(`and(requester_id.eq.${user_id},addressee_id.eq.${friend_id}),and(requester_id.eq.${friend_id},addressee_id.eq.${user_id})`)
      return res.status(200).json({ ok: true })
    }
  }
  res.status(405).end()
}
