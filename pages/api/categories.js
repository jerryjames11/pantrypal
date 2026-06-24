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
  const { user_id, household_id } = req.query
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })
  const hid = household_id && household_id !== 'null' ? parseInt(household_id) : null

  if (req.method === 'GET') {
    let query = sb.from('categories').select('*').order('sort_order')
    query = hid ? query.eq('household_id', hid) : query.eq('user_id', user_id).is('household_id', null)
    const { data, error } = await query
    if (error) {
      console.error('Categories GET error:', error)
      return res.status(500).json({ error: error.message })
    }

    if (!data || data.length === 0) {
      // Seed defaults — for the household (once, shared) or for the personal user
      const rows = DEFAULTS.map((d, i) => ({
        user_id: hid ? null : user_id,
        household_id: hid || null,
        name: d.name, emoji: d.emoji, sort_order: i
      }))
      const { data: seeded, error: seedErr } = await sb.from('categories').insert(rows).select()
      if (seedErr) {
        console.error('Categories seed error:', seedErr)
        return res.status(500).json({ error: seedErr.message })
      }
      return res.status(200).json({ categories: seeded || [] })
    }
    return res.status(200).json({ categories: data })
  }

  if (req.method === 'POST') {
    const { name, emoji } = req.body
    let sortQuery = sb.from('categories').select('sort_order').order('sort_order', { ascending: false }).limit(1)
    sortQuery = hid ? sortQuery.eq('household_id', hid) : sortQuery.eq('user_id', user_id).is('household_id', null)
    const { data: existing } = await sortQuery
    const sort_order = (existing?.[0]?.sort_order ?? -1) + 1
    const { data, error } = await sb.from('categories').insert({
      user_id: hid ? null : user_id,
      household_id: hid || null,
      name, emoji: emoji || '📦', sort_order
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ category: data })
  }

  if (req.method === 'PATCH') {
    const { id, shelf_number, shelf_x, name, emoji } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })
    const update = {}
    if (shelf_number !== undefined) update.shelf_number = shelf_number
    if (shelf_x !== undefined) update.shelf_x = shelf_x
    if (name !== undefined) update.name = name
    if (emoji !== undefined) update.emoji = emoji
    let q = sb.from('categories').update(update).eq('id', id)
    q = hid ? q.eq('household_id', hid) : q.eq('user_id', user_id).is('household_id', null)
    const { data, error } = await q.select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ category: data })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    let q = sb.from('categories').delete().eq('id', id)
    q = hid ? q.eq('household_id', hid) : q.eq('user_id', user_id).is('household_id', null)
    await q
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
