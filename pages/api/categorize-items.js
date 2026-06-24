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

function buildPrompt(itemNames, validCategories) {
  return `Given this list of grocery/pantry item names, suggest the best matching category for each one.
Return ONLY valid JSON — no markdown fences, no explanation.
Schema:
{
  "suggestions": [
    { "name": string, "category": string or null }
  ]
}
Rules:
- category must be one of exactly: ${validCategories.map(c => `"${c}"`).join(', ')}
- If you are not reasonably confident, set category to null — do not guess
- Preserve the exact item name as given, do not rename it
- Return one suggestion per input item, in the same order

Items:
${itemNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { items, categories } = req.body
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array required' })
  }

  // Build the valid category list from the user's actual categories,
  // falling back to the standard set used during receipt parsing
  const validCategories = (categories && categories.length > 0)
    ? categories
    : ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Bakery', 'Pantry & Dry Goods', 'Frozen', 'Toiletries', 'Household', 'Pet Supplies']

  try {
    const prompt = buildPrompt(items.map(i => i.name), validCategories)
    const raw = await callAI([{ role: 'user', content: prompt }])
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    const suggestions = parsed.suggestions || []

    // Match suggestions back to original items by index, with safe fallback
    const results = items.map((item, idx) => {
      const suggestion = suggestions[idx]
      const category = suggestion?.category
      const isValid = category && validCategories.includes(category)
      return {
        id: item.id,
        name: item.name,
        suggestedCategory: isValid ? category : null
      }
    })

    res.status(200).json({ results })
  } catch (err) {
    console.error('categorize-items error:', err)
    res.status(500).json({ error: err.message || 'Failed to categorize items' })
  }
}
