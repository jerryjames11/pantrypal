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
    if (error) {
      console.error('Pantry GET error:', error)
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ items: data })
  }

  if (req.method === 'POST') {
    const { name, qty, status, last_purchased, category } = req.body

    // Look for an existing item scoped to household OR personal — NEVER scoped to
    // the current user_id when in a household, since any member's prior add should match
    let existingQuery = sb.from('pantry_items').select('id').ilike('name', name)
    if (hid) {
      existingQuery = existingQuery.eq('household_id', hid)
    } else {
      existingQuery = existingQuery.eq('user_id', user_id).is('household_id', null)
    }
    const { data: existingRows, error: existingErr } = await existingQuery.limit(1)
    if (existingErr) {
      console.error('Pantry POST lookup error:', existingErr)
      return res.status(500).json({ error: existingErr.message })
    }
    const existing = existingRows?.[0]

    if (existing) {
      const { error: updateErr } = await sb.from('pantry_items')
        .update({ status, qty: qty || '', last_purchased: last_purchased || null, category: category || 'Other', updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (updateErr) {
        console.error('Pantry POST update error:', updateErr)
        return res.status(500).json({ error: updateErr.message })
      }
    } else {
      const { error: insertErr } = await sb.from('pantry_items')
        .insert({ user_id, name, qty: qty || '', status, last_purchased: last_purchased || null, category: category || 'Other', household_id: hid })
      if (insertErr) {
        console.error('Pantry POST insert error:', insertErr)
        return res.status(500).json({ error: insertErr.message })
      }
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
    const { error } = await sb.from('pantry_items').update(update).eq('id', id)
    if (error) {
      console.error('Pantry PATCH error:', error)
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const { id, clearAll, clearCategory } = req.body
    if (clearAll) {
      // Clear scoped to household (ALL members' items) or personal — never restricted
      // to just the requesting user's own user_id when in a household
      let q = sb.from('pantry_items').delete()
      if (hid) q = q.eq('household_id', hid)
      else q = q.eq('user_id', user_id).is('household_id', null)
      const { error } = await q
      if (error) { console.error('Pantry clearAll error:', error); return res.status(500).json({ error: error.message }) }
    } else if (clearCategory) {
      let q = sb.from('pantry_items').delete().eq('category', clearCategory)
      if (hid) q = q.eq('household_id', hid)
      else q = q.eq('user_id', user_id).is('household_id', null)
      const { error } = await q
      if (error) { console.error('Pantry clearCategory error:', error); return res.status(500).json({ error: error.message }) }
    } else {
      const { error } = await sb.from('pantry_items').delete().eq('id', id)
      if (error) { console.error('Pantry delete error:', error); return res.status(500).json({ error: error.message }) }
    }
    return res.status(200).json({ ok: true })
  }
  res.status(405).end()
}
