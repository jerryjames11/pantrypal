async function callAI(content) {
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
      messages: [{ role: 'user', content }]
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data.choices?.[0]?.message?.content || ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { items, priorityItem } = req.body
  if (!items || items.length < 2) return res.status(400).json({ error: 'Need at least 2 ingredients' })

  try {
    const priorityInstruction = priorityItem
      ? `\nIMPORTANT: Every single recipe MUST use "${priorityItem}" as a key ingredient — this item is expiring soon and the user needs to use it up. Do not suggest any recipe that omits it.`
      : ''
    const raw = await callAI(`
Available ingredients: ${items.join(', ')}.
Suggest 4 diverse recipes using these ingredients.${priorityInstruction}
Return ONLY a valid JSON array, no markdown. Schema:
[{
  "title": string,
  "time": string,
  "match_pct": number,
  "description": string,
  "have": string[],
  "need": string[],
  "steps": string[]
}]
Sort by match_pct descending.`)

    const recipes = JSON.parse(raw.replace(/```json|```/g, '').trim())
    res.status(200).json({ recipes })
  } catch (err) {
    console.error('recipes error:', err)
    res.status(500).json({ error: err.message || 'Failed to generate recipes' })
  }
}
