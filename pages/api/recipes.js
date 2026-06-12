async function callGemini(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text }] }] })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { items } = req.body
  if (!items || items.length < 2) return res.status(400).json({ error: 'Need at least 2 ingredients' })

  try {
    const raw = await callGemini(`
Available ingredients: ${items.join(', ')}.

Suggest 4 diverse recipes using these ingredients.
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
