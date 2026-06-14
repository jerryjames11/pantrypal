import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  const { user_id } = req.query
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { data } = await sb.from('profiles').select('*').eq('id', user_id).single()
    return res.status(200).json({ profile: data })
  }

  if (req.method === 'PATCH') {
    const { username, display_name, tutorial_completed } = req.body
    if (username) {
      const { data: existing } = await sb.from('profiles').select('id').eq('username', username).neq('id', user_id).single()
      if (existing) return res.status(400).json({ error: 'Username already taken' })
    }
    const update = { updated_at: new Date().toISOString() }
    if (username !== undefined) update.username = username
    if (display_name !== undefined) update.display_name = display_name
    if (tutorial_completed !== undefined) update.tutorial_completed = tutorial_completed
    const { data, error } = await sb.from('profiles').upsert({ id: user_id, ...update }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ profile: data })
  }
  res.status(405).end()
}
