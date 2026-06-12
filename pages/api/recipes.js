import { model, extractJSON } from '../../lib/gemini'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { items } = req.body
  if (!items || items.length < 2) return res.status(400).json({ error: 'Need at least 2 ingredients' })

  try {
    const result = await model.generateContent(`
Available ingredients: ${items.join(', ')}.

Suggest 4 diverse recipes using these ingredients.
Return ONLY valid JSON array, no markdown. Schema:
[{
  "title": string,
  "time": string,
  "match_pct": number (0-100, how many pantry items are used),
  "description": string (1 sentence),
  "have": string[] (ingredients from the list used),
  "need": string[] (additional ingredients needed — keep short, pantry staples only if essential),
  "steps": string[] (3-5 concise cooking steps)
}]
Sort by match_pct descending.`)

    const recipes = extractJSON(result.response.text())
    res.status(200).json({ recipes })
  } catch (err) {
    console.error('recipes error:', err)
    res.status(500).json({ error: 'Failed to generate recipes' })
  }
}
