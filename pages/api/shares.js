import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  const { user_id } = req.query
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { data } = await sb.from('friend_shares').select('*, sender:profiles!friend_shares_from_user_fkey(display_name,username,avatar_url)').eq('to_user', user_id).order('created_at', { ascending: false })
    return res.status(200).json({ shares: data || [] })
  }

  if (req.method === 'POST') {
    const { to_user, share_type, title, content } = req.body
    // Verify they are friends
    const { data: friendship } = await sb.from('friendships').select('id').or(
      `and(requester_id.eq.${user_id},addressee_id.eq.${to_user},status.eq.accepted),and(requester_id.eq.${to_user},addressee_id.eq.${user_id},status.eq.accepted)`
    ).single()
    if (!friendship) return res.status(403).json({ error: 'You can only share with friends' })

    await sb.from('friend_shares').insert({ from_user: user_id, to_user, share_type, title, content })
    const { data: senderProfile } = await sb.from('profiles').select('display_name').eq('id', user_id).single()
    await sb.from('notifications').insert({
      user_id: to_user,
      type: share_type === 'recipe' ? 'share_recipe' : 'share_cart',
      title: share_type === 'recipe' ? 'Recipe shared with you' : 'Shopping cart shared with you',
      body: `${senderProfile?.display_name || 'A friend'} shared ${share_type === 'recipe' ? `"${title}"` : 'their shopping cart'} with you`,
      data: { from_user: user_id, share_type, title }
    })
    return res.status(200).json({ ok: true })
  }
  res.status(405).end()
}
