import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const DEFAULTS = [
  { emoji: '🥦', name: 'Produce' },
  { emoji: '🥩', name: 'Meat & Seafood' },
  { emoji: '🥛', name: 'Dairy & Eggs' },
  { emoji: '🥖', name: 'Bakery' },
  { emoji: '🥫', name: 'Pantry & Dry Goods' },
  { emoji: '🧊', name: 'Frozen' },
  { emoji: '🧴', name: 'Toiletries' },
  { emoji: '🧹', name: 'Household' },
  { emoji: '🐾', name: 'Pet Supplies' },
  { emoji: '📦', name: 'Other' },
]

export default async function handler(req, res) {
  const { user_id } = req.query
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { data } = await sb.from('categories').select('*').eq('user_id', user_id).order('sort_order')
    if (!data || data.length === 0) {
      // Seed defaults for new user
      const rows = DEFAULTS.map((d, i) => ({ user_id, name: d.name, emoji: d.emoji, sort_order: i }))
      const { data: seeded } = await sb.from('categories').insert(rows).select()
      return res.status(200).json({ categories: seeded || [] })
    }
    return res.status(200).json({ categories: data })
  }

  if (req.method === 'POST') {
    const { name, emoji } = req.body
    const { data: existing } = await sb.from('categories').select('sort_order').eq('user_id', user_id).order('sort_order', { ascending: false }).limit(1)
    const sort_order = (existing?.[0]?.sort_order ?? -1) + 1
    const { data, error } = await sb.from('categories').insert({ user_id, name, emoji: emoji || '📦', sort_order }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ category: data })
  }

  if (req.method === 'PATCH') {
    const { id, shelf_number, shelf_x } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })
    const update = {}
    if (shelf_number !== undefined) update.shelf_number = shelf_number
    if (shelf_x !== undefined) update.shelf_x = shelf_x
    const { data, error } = await sb.from('categories').update(update).eq('id', id).eq('user_id', user_id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ category: data })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    await sb.from('categories').delete().eq('id', id).eq('user_id', user_id)
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
