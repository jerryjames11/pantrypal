import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { user_id } = req.query
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    // Fetch receipts with their items
    const { data: receipts, error } = await sb
      .from('receipts')
      .select(`*, receipt_items(*)`)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ receipts })
  }

  if (req.method === 'DELETE') {
    // Delete a receipt and cascade-delete its items
    const { id } = req.body
    const { error } = await sb
      .from('receipts').delete()
      .eq('id', id).eq('user_id', user_id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
