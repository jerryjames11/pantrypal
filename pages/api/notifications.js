import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  const { user_id } = req.query
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { data } = await sb.from('notifications').select('*').eq('user_id', user_id).order('created_at', { ascending: false }).limit(30)
    const unread = (data || []).filter(n => !n.read).length
    return res.status(200).json({ notifications: data || [], unread })
  }

  if (req.method === 'PATCH') {
    const { id, markAllRead, data: newData } = req.body
    if (markAllRead) {
      await sb.from('notifications').update({ read: true }).eq('user_id', user_id)
    } else if (newData !== undefined) {
      // Update notification data field (e.g. accepted/joined flags)
      await sb.from('notifications').update({ data: newData }).eq('id', id).eq('user_id', user_id)
    } else {
      await sb.from('notifications').update({ read: true }).eq('id', id).eq('user_id', user_id)
    }
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    await sb.from('notifications').delete().eq('id', id).eq('user_id', user_id)
    return res.status(200).json({ ok: true })
  }
  res.status(405).end()
}
