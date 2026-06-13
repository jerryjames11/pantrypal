import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  const { user_id } = req.query
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { data, error } = await sb.from('pantry_items').select('*').eq('user_id', user_id).order('category').order('name')
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ items: data })
  }

  if (req.method === 'POST') {
    const { name, qty, status, last_purchased, category } = req.body
    const { data: existing } = await sb.from('pantry_items').select('id').eq('user_id', user_id).ilike('name', name).single()
    if (existing) {
      await sb.from('pantry_items').update({ status, qty: qty || '', last_purchased: last_purchased || null, category: category || 'Other', updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await sb.from('pantry_items').insert({ user_id, name, qty: qty || '', status, last_purchased: last_purchased || null, category: category || 'Other' })
    }
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'PATCH') {
    const { id, status, qty, name, category } = req.body
    const update = { updated_at: new Date().toISOString() }
    if (status !== undefined) update.status = status
    if (qty !== undefined) update.qty = qty
    if (name !== undefined) update.name = name
    if (category !== undefined) update.category = category
    await sb.from('pantry_items').update(update).eq('id', id).eq('user_id', user_id)
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const { id, clearAll, clearCategory } = req.body
    if (clearAll) {
      await sb.from('pantry_items').delete().eq('user_id', user_id)
    } else if (clearCategory) {
      await sb.from('pantry_items').delete().eq('user_id', user_id).eq('category', clearCategory)
    } else {
      await sb.from('pantry_items').delete().eq('id', id).eq('user_id', user_id)
    }
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
