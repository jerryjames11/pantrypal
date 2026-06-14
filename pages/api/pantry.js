import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  const { user_id, household_id } = req.query
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })

  const hid = household_id && household_id !== 'null' ? parseInt(household_id) : null

  if (req.method === 'GET') {
    let query = sb.from('pantry_items').select('*')
    if (hid) {
      query = query.eq('household_id', hid)
    } else {
      query = query.eq('user_id', user_id).is('household_id', null)
    }
    const { data, error } = await query.order('category').order('name')
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ items: data })
  }

  if (req.method === 'POST') {
    const { name, qty, status, last_purchased, category } = req.body
    const { data: existing } = await sb.from('pantry_items').select('id')
      .eq('user_id', user_id)
      .ilike('name', name)
      .eq(hid ? 'household_id' : 'user_id', hid || user_id)
      .is(hid ? 'household_id' : null, hid || null)
      .single()
    if (existing) {
      await sb.from('pantry_items').update({ status, qty: qty||'', last_purchased: last_purchased||null, category: category||'Other', updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await sb.from('pantry_items').insert({ user_id, name, qty: qty||'', status, last_purchased: last_purchased||null, category: category||'Other', household_id: hid })
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
    await sb.from('pantry_items').update(update).eq('id', id)
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const { id, clearAll, clearCategory } = req.body
    if (clearAll) {
      let q = sb.from('pantry_items').delete().eq('user_id', user_id)
      if (hid) q = q.eq('household_id', hid)
      else q = q.is('household_id', null)
      await q
    } else if (clearCategory) {
      let q = sb.from('pantry_items').delete().eq('user_id', user_id).eq('category', clearCategory)
      if (hid) q = q.eq('household_id', hid)
      else q = q.is('household_id', null)
      await q
    } else {
      await sb.from('pantry_items').delete().eq('id', id)
    }
    return res.status(200).json({ ok: true })
  }
  res.status(405).end()
}
