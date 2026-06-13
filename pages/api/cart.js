import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  const { user_id } = req.query
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { data, error } = await sb.from('cart_items').select('*').eq('user_id', user_id).order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ items: data })
  }

  if (req.method === 'POST') {
    const { items } = req.body  // array of {name, qty, category, source}
    const rows = items.map(i => ({ user_id, name: i.name, qty: i.qty || '', category: i.category || 'Other', source: i.source || 'manual', checked: false }))
    // Upsert by name to avoid duplicates
    for (const row of rows) {
      const { data: ex } = await sb.from('cart_items').select('id').eq('user_id', user_id).ilike('name', row.name).single()
      if (!ex) await sb.from('cart_items').insert(row)
    }
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'PATCH') {
    const { id, checked, qty } = req.body
    const update = {}
    if (checked !== undefined) update.checked = checked
    if (qty !== undefined) update.qty = qty
    await sb.from('cart_items').update(update).eq('id', id).eq('user_id', user_id)
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const { id, clearChecked } = req.body
    if (clearChecked) {
      await sb.from('cart_items').delete().eq('user_id', user_id).eq('checked', true)
    } else {
      await sb.from('cart_items').delete().eq('id', id).eq('user_id', user_id)
    }
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
