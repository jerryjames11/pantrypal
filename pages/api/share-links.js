import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function generateToken() {
  return crypto.randomBytes(9).toString('base64url') // ~12 char URL-safe token
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action } = req.body

    if (action === 'create') {
      const { user_id, share_type, title, content } = req.body
      if (!user_id || !share_type || !content) return res.status(400).json({ error: 'Missing required fields' })

      const token = generateToken()
      const { data, error } = await sb.from('share_links').insert({
        token, from_user: user_id, share_type, title: title || '', content
      }).select().single()

      if (error) {
        console.error('Create share link error:', error)
        return res.status(500).json({ error: error.message })
      }
      return res.status(200).json({ token: data.token, expires_at: data.expires_at })
    }

    if (action === 'claim') {
      const { token, user_id } = req.body
      if (!token || !user_id) return res.status(400).json({ error: 'token and user_id required' })

      const { data: link, error: fetchErr } = await sb.from('share_links').select('*').eq('token', token).single()
      if (fetchErr || !link) return res.status(404).json({ error: 'This link is invalid or has expired' })
      if (link.claimed_by) return res.status(410).json({ error: 'This link has already been used' })
      if (new Date(link.expires_at) < new Date()) return res.status(410).json({ error: 'This link has expired' })
      if (link.from_user === user_id) return res.status(400).json({ error: "You can't claim your own share link" })

      // Mark as claimed
      const { error: claimErr } = await sb.from('share_links')
        .update({ claimed_by: user_id, claimed_at: new Date().toISOString() })
        .eq('token', token).is('claimed_by', null) // double-check still unclaimed (race condition safety)
      if (claimErr) {
        console.error('Claim share link error:', claimErr)
        return res.status(500).json({ error: claimErr.message })
      }

      // Auto-create friendship if not already friends
      const { data: existingFriendship } = await sb.from('friendships').select('id,status').or(
        `and(requester_id.eq.${link.from_user},addressee_id.eq.${user_id}),and(requester_id.eq.${user_id},addressee_id.eq.${link.from_user})`
      )
      const alreadyFriends = (existingFriendship || []).some(f => f.status === 'accepted')

      if (!alreadyFriends && (!existingFriendship || existingFriendship.length === 0)) {
        // Create an auto-accepted friendship since they took an explicit action to claim the share
        await sb.from('friendships').insert({
          requester_id: link.from_user, addressee_id: user_id, status: 'accepted', updated_at: new Date().toISOString()
        })
      } else if (!alreadyFriends) {
        // A pending request exists — auto-accept it
        await sb.from('friendships')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .or(`and(requester_id.eq.${link.from_user},addressee_id.eq.${user_id}),and(requester_id.eq.${user_id},addressee_id.eq.${link.from_user})`)
      }

      // Insert the actual share into friend_shares so it shows in their "Shared with you"
      await sb.from('friend_shares').insert({
        from_user: link.from_user, to_user: user_id,
        share_type: link.share_type, title: link.title, content: link.content
      })

      // Notify the sharer that their link was claimed
      const { data: claimerProfile } = await sb.from('profiles').select('display_name,username').eq('id', user_id).single()
      await sb.from('notifications').insert({
        user_id: link.from_user, type: 'share_link_claimed',
        title: 'Your shared link was used',
        body: `${claimerProfile?.display_name || claimerProfile?.username || 'Someone'} joined PantryPal and claimed your shared ${link.share_type === 'recipe' ? 'recipe' : 'shopping cart'}`,
        data: { claimed_by: user_id }
      })

      return res.status(200).json({ ok: true, share_type: link.share_type, title: link.title })
    }
  }

  if (req.method === 'GET') {
    // Preview a link without claiming it — used by the public invite page before login
    const { token } = req.query
    if (!token) return res.status(400).json({ error: 'token required' })

    const { data: link, error } = await sb.from('share_links').select('*').eq('token', token).single()
    if (error || !link) return res.status(404).json({ error: 'This link is invalid or has expired' })
    if (link.claimed_by) return res.status(410).json({ error: 'This link has already been used' })
    if (new Date(link.expires_at) < new Date()) return res.status(410).json({ error: 'This link has expired' })

    const { data: senderProfile } = await sb.from('profiles').select('display_name,username,avatar_url').eq('id', link.from_user).single()

    return res.status(200).json({
      share_type: link.share_type,
      title: link.title,
      content: link.content,
      sender: senderProfile,
      expires_at: link.expires_at
    })
  }

  res.status(405).end()
}
