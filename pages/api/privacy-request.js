import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, request_type, message } = req.body

  if (!name || !email || !request_type || !message) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  const { error } = await sb.from('privacy_requests').insert({
    name, email, request_type, message
  })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ ok: true })
}
