import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  const { user_id } = req.query
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { data, error } = await sb.from('saved_recipes').select('*').eq('user_id', user_id).order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ recipes: data })
  }

  if (req.method === 'POST') {
    const { recipe } = req.body
    const { data: ex } = await sb.from('saved_recipes').select('id').eq('user_id', user_id).eq('title', recipe.title).single()
    if (ex) return res.status(200).json({ ok: true, alreadySaved: true })
    const { error } = await sb.from('saved_recipes').insert({
      user_id,
      title: recipe.title,
      time: recipe.time,
      description: recipe.description,
      have: recipe.have || [],
      need: recipe.need || [],
      steps: recipe.steps || [],
      match_pct: recipe.match_pct || 0
    })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    await sb.from('saved_recipes').delete().eq('id', id).eq('user_id', user_id)
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
