import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function callAI(messages) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://pantrypal-green.vercel.app',
      'X-Title': 'PantryPal'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data.choices?.[0]?.message?.content || ''
}

const PROMPT = `Extract every line item from this grocery receipt.
Return ONLY valid JSON — no markdown fences, no explanation.
Schema:
{
  "store_name": string,
  "receipt_date": "YYYY-MM-DD or null",
  "total_amount": number or null,
  "items": [
    { "name": string, "qty": string, "price": number or null, "category": string }
  ]
}
Rules:
- name should be clean and human-readable (e.g. "Whole Milk" not "WHL MLK 1GAL $3.99")
- qty is size/pack info if shown (e.g. "1 gal", "12 ct"), else empty string
- price is the unit price as a number, null if not found
- total_amount is the grand total, null if not shown
- category must be one of: "Produce", "Meat & Seafood", "Dairy & Eggs", "Bakery", "Pantry & Dry Goods", "Frozen", "Toiletries", "Household", "Pet Supplies", "Uncategorized"
- Only assign a category if you are confident. If unsure, use "Uncategorized"
- Common examples: milk/cheese/eggs/yogurt → "Dairy & Eggs", chicken/beef/fish → "Meat & Seafood", bread/muffins → "Bakery", detergent/paper towels → "Household", shampoo/toothpaste → "Toiletries", frozen pizza/ice cream → "Frozen", fruits/vegetables → "Produce"`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { text, imageBase64, imageMime, userId } = req.body
  if (!userId) return res.status(401).json({ error: 'Not authenticated' })

  try {
    let messages
    if (imageBase64) {
      messages = [{
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:${imageMime || 'image/jpeg'};base64,${imageBase64}` } }
        ]
      }]
    } else if (text) {
      messages = [{ role: 'user', content: PROMPT + '\n\nReceipt text:\n' + text }]
    } else {
      return res.status(400).json({ error: 'Provide text or imageBase64' })
    }

    const raw = await callAI(messages)
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    const items = parsed.items || []
    const receiptDate = parsed.receipt_date || null

    // Look up previous prices
    const names = items.map(i => i.name)
    const { data: prevPrices } = await sb
      .from('receipt_items')
      .select('name, price, created_at')
      .eq('user_id', userId)
      .in('name', names)
      .order('created_at', { ascending: false })

    const prevMap = {}
    ;(prevPrices || []).forEach(row => {
      if (!(row.name in prevMap)) prevMap[row.name] = row.price
    })

    const enrichedItems = items.map(item => ({
      ...item,
      category: item.category || 'Uncategorized',
      prev_price: prevMap[item.name] ?? null,
      price_delta: item.price != null && prevMap[item.name] != null
        ? parseFloat((item.price - prevMap[item.name]).toFixed(2))
        : null
    }))

    // Save receipt header
    const { data: receipt, error: rErr } = await sb
      .from('receipts')
      .insert({
        user_id: userId,
        store_name: parsed.store_name || 'Unknown store',
        receipt_date: receiptDate,
        total_amount: parsed.total_amount || null,
        item_count: enrichedItems.length
      })
      .select()
      .single()

    if (rErr) throw rErr

    // Save line items
    if (enrichedItems.length) {
      const rows = enrichedItems.map(item => ({
        receipt_id: receipt.id,
        user_id: userId,
        name: item.name,
        qty: item.qty || '',
        price: item.price,
        prev_price: item.prev_price,
        price_delta: item.price_delta
      }))
      await sb.from('receipt_items').insert(rows)
    }

    // Upsert pantry items — with AI category and last_purchased from receipt date
    for (const item of enrichedItems) {
      const { data: existing } = await sb
        .from('pantry_items')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', item.name)
        .single()

      const pantryData = {
        status: 'fresh',
        qty: item.qty || '',
        last_price: item.price,
        updated_at: new Date().toISOString(),
        ...(item.category && item.category !== 'Uncategorized' && { category: item.category }),
        ...(receiptDate && { last_purchased: receiptDate })
      }

      if (existing) {
        await sb.from('pantry_items').update(pantryData).eq('id', existing.id)
      } else {
        await sb.from('pantry_items').insert({
          user_id: userId,
          name: item.name,
          qty: item.qty || '',
          status: 'fresh',
          last_price: item.price,
          category: item.category || 'Uncategorized',
          last_purchased: receiptDate
        })
      }
    }

    res.status(200).json({ receipt, items: enrichedItems })
  } catch (err) {
    console.error('parse-receipt error:', err)
    res.status(500).json({ error: err.message || 'Failed to parse receipt' })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }
