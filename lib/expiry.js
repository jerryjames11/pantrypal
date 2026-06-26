// Expiry estimation — fast local heuristic table checked first,
// AI fallback used only for items that don't match anything here.
// Values are typical "good in pantry/fridge" days from the date added.

const EXPIRY_TABLE = [
  // Dairy & Eggs
  { keywords: ['milk'], days: 7 },
  { keywords: ['half and half', 'half & half', 'cream', 'heavy cream'], days: 10 },
  { keywords: ['yogurt', 'yoghurt'], days: 14 },
  { keywords: ['egg'], days: 28 },
  { keywords: ['butter'], days: 60 },
  { keywords: ['cheese', 'cheddar', 'mozzarella', 'parmesan'], days: 21 },
  { keywords: ['sour cream'], days: 14 },
  { keywords: ['cottage cheese'], days: 10 },

  // Produce
  { keywords: ['lettuce', 'spinach', 'kale', 'arugula', 'salad mix'], days: 5 },
  { keywords: ['berry', 'berries', 'strawberr', 'raspberr', 'blueberr'], days: 5 },
  { keywords: ['banana'], days: 5 },
  { keywords: ['avocado'], days: 4 },
  { keywords: ['tomato'], days: 6 },
  { keywords: ['cucumber'], days: 7 },
  { keywords: ['bell pepper', 'pepper'], days: 8 },
  { keywords: ['broccoli', 'cauliflower'], days: 7 },
  { keywords: ['mushroom'], days: 6 },
  { keywords: ['apple'], days: 21 },
  { keywords: ['orange', 'citrus', 'lemon', 'lime'], days: 21 },
  { keywords: ['carrot'], days: 21 },
  { keywords: ['potato'], days: 30 },
  { keywords: ['onion', 'garlic'], days: 30 },
  { keywords: ['herb', 'cilantro', 'parsley', 'basil', 'mint'], days: 6 },

  // Meat & Seafood (fresh, uncooked, fridge)
  { keywords: ['ground beef', 'ground turkey', 'ground chicken', 'ground pork'], days: 2 },
  { keywords: ['chicken breast', 'chicken thigh', 'raw chicken'], days: 2 },
  { keywords: ['fish', 'salmon', 'shrimp', 'seafood'], days: 2 },
  { keywords: ['steak', 'beef', 'pork chop', 'pork'], days: 4 },
  { keywords: ['bacon'], days: 7 },
  { keywords: ['sausage', 'hot dog'], days: 7 },
  { keywords: ['deli meat', 'lunch meat', 'ham', 'turkey slice'], days: 5 },

  // Bakery
  { keywords: ['bread', 'bagel', 'bun', 'roll'], days: 6 },
  { keywords: ['tortilla'], days: 14 },

  // Frozen
  { keywords: ['frozen'], days: 180 },
  { keywords: ['ice cream'], days: 90 },

  // Pantry & Dry Goods
  { keywords: ['rice', 'pasta', 'noodle', 'spaghetti'], days: 540 },
  { keywords: ['flour', 'sugar'], days: 365 },
  { keywords: ['canned', 'can of', 'beans', 'soup'], days: 540 },
  { keywords: ['cereal'], days: 240 },
  { keywords: ['oil', 'olive oil', 'vegetable oil'], days: 365 },
  { keywords: ['sauce', 'ketchup', 'mustard', 'mayo', 'mayonnaise'], days: 180 },
  { keywords: ['peanut butter', 'jam', 'jelly', 'honey'], days: 270 },
  { keywords: ['snack', 'chip', 'cracker', 'cookie'], days: 60 },
  { keywords: ['nuts', 'almond', 'cashew', 'walnut'], days: 120 },
  { keywords: ['spice', 'seasoning'], days: 540 },

  // Non-food (toiletries/household — far-future, basically "doesn't go bad" for our purposes)
  { keywords: ['shampoo', 'soap', 'toothpaste', 'detergent', 'paper towel', 'toilet paper'], days: 720 },
]

function matchExpiryDays(itemName) {
  const lower = itemName.toLowerCase()
  for (const entry of EXPIRY_TABLE) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.days
    }
  }
  return null // no match — caller should fall back to AI
}

function calcExpiryDate(days, fromDate = new Date()) {
  const d = new Date(fromDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

// AI fallback — single short call, used only when no heuristic matches
async function estimateExpiryWithAI(itemName) {
  try {
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
        messages: [{
          role: 'user',
          content: `How many days does an unopened/typical "${itemName}" last from purchase, stored normally (fridge if perishable, pantry if shelf-stable)? Reply with ONLY a single integer number of days, nothing else. If genuinely unsure, reply 365.`
        }]
      })
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim() || ''
    const days = parseInt(text.match(/\d+/)?.[0])
    return Number.isFinite(days) && days > 0 ? days : 365
  } catch (err) {
    console.error('estimateExpiryWithAI error:', err)
    return 365 // safe generic fallback, never block the add
  }
}

export async function estimateExpiryDate(itemName) {
  const heuristicDays = matchExpiryDays(itemName)
  if (heuristicDays !== null) {
    return calcExpiryDate(heuristicDays)
  }
  const aiDays = await estimateExpiryWithAI(itemName)
  return calcExpiryDate(aiDays)
}
