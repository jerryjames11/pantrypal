// Expiry estimation — fast local heuristic table checked first,
// AI fallback used only for items that don't match anything here.
// Values are typical "good in pantry/fridge" days from the date added.
//
// IMPORTANT ORDERING RULE: entries are checked top-to-bottom, first match wins.
// More SPECIFIC phrases (multi-word, qualified) must come BEFORE more GENERIC
// single-word keywords that could otherwise false-match them. E.g. "mac and cheese"
// must be checked before the generic "cheese" rule, or a boxed shelf-stable product
// would incorrectly get fresh-cheese's short 21-day estimate.

const EXPIRY_TABLE = [
  // ── Specific multi-word items that would otherwise be caught by a generic
  //    rule further down — these MUST stay above their generic counterparts ──
  { keywords: ['mac and cheese', 'mac & cheese', 'macaroni and cheese'], days: 365 },
  { keywords: ['cream of mushroom', 'cream of chicken', 'cream of celery'], days: 540 }, // canned soup, not fresh cream
  { keywords: ['ice cream sandwich', 'ice cream bar'], days: 90 },
  { keywords: ['black pepper', 'white pepper', 'cayenne pepper', 'red pepper flake', 'pepper flake'], days: 730 }, // spice, not produce
  { keywords: ['pepper jack', 'pepperoni'], days: 21 }, // cured/cheese, not produce pepper
  { keywords: ['coconut cream', 'coconut milk'], days: 365 }, // canned, not dairy
  { keywords: ['almond milk', 'oat milk', 'soy milk', 'cashew milk'], days: 10 }, // shelf-stable until opened, but estimate as opened/fridge use
  { keywords: ['peanut butter cookie', 'peanut butter cup'], days: 60 },
  { keywords: ['bread crumb', 'breadcrumb', 'panko'], days: 270 },
  { keywords: ['onion powder', 'garlic powder'], days: 730 },
  { keywords: ['dried herb', 'dried basil', 'dried oregano'], days: 730 },
  { keywords: ['tomato sauce', 'tomato paste', 'canned tomato', 'crushed tomato', 'diced tomato'], days: 540 },
  { keywords: ['sun-dried tomato', 'sun dried tomato'], days: 365 },
  { keywords: ['frozen yogurt'], days: 90 },
  { keywords: ['greek yogurt'], days: 14 },
  { keywords: ['frozen vegetable', 'frozen veggie', 'frozen fruit', 'frozen waffle', 'frozen pizza', 'frozen meal', 'frozen dinner', 'frozen broccoli', 'frozen corn', 'frozen pea', 'frozen berr', 'frozen strawberr', 'frozen chicken', 'frozen fish', 'frozen shrimp'], days: 240 },

  // ── Dairy & Eggs ──
  { keywords: ['milk'], days: 7 },
  { keywords: ['half and half', 'half & half'], days: 10 },
  { keywords: ['heavy cream', 'whipping cream', 'whipped cream'], days: 10 },
  { keywords: ['yogurt', 'yoghurt'], days: 14 },
  { keywords: ['egg'], days: 28 },
  { keywords: ['butter', 'margarine'], days: 60 },
  { keywords: ['cream cheese'], days: 14 },
  { keywords: ['sour cream'], days: 14 },
  { keywords: ['cottage cheese', 'ricotta'], days: 10 },
  { keywords: ['shredded cheese'], days: 21 },
  { keywords: ['cheese', 'cheddar', 'mozzarella', 'parmesan', 'gouda', 'provolone', 'swiss cheese', 'brie', 'feta'], days: 21 },

  // ── Produce ──
  { keywords: ['lettuce', 'spinach', 'kale', 'arugula', 'salad mix', 'salad kit'], days: 5 },
  { keywords: ['berry', 'berries', 'strawberr', 'raspberr', 'blueberr', 'blackberr'], days: 5 },
  { keywords: ['grape'], days: 7 },
  { keywords: ['banana'], days: 5 },
  { keywords: ['avocado'], days: 4 },
  { keywords: ['tomato'], days: 6 }, // after tomato sauce/paste/canned rules above
  { keywords: ['cucumber'], days: 7 },
  { keywords: ['zucchini', 'squash'], days: 7 },
  { keywords: ['bell pepper', 'jalapeno', 'jalapeño', 'poblano', 'serrano'], days: 8 },
  { keywords: ['broccoli', 'cauliflower'], days: 7 },
  { keywords: ['mushroom'], days: 6 }, // after cream of mushroom rule above
  { keywords: ['apple'], days: 21 },
  { keywords: ['orange', 'citrus', 'lemon', 'lime', 'grapefruit'], days: 21 },
  { keywords: ['carrot'], days: 21 },
  { keywords: ['celery'], days: 14 }, // after cream of celery rule above
  { keywords: ['potato'], days: 30 },
  { keywords: ['sweet potato', 'yam'], days: 21 },
  { keywords: ['onion', 'garlic'], days: 30 }, // after onion/garlic powder rules above
  { keywords: ['corn'], days: 5 },
  { keywords: ['green bean', 'asparagus'], days: 5 },
  { keywords: ['pepper'], days: 8 }, // generic produce "pepper" catch-all, after all specific pepper variants above
  { keywords: ['herb', 'cilantro', 'parsley', 'basil', 'mint', 'rosemary', 'thyme', 'dill'], days: 6 }, // after dried herb rules above
  { keywords: ['watermelon', 'cantaloupe', 'melon'], days: 7 },
  { keywords: ['pineapple'], days: 5 },

  // ── Meat & Seafood (fresh, uncooked, fridge) ──
  { keywords: ['ground beef', 'ground turkey', 'ground chicken', 'ground pork'], days: 2 },
  { keywords: ['chicken breast', 'chicken thigh', 'chicken wing', 'raw chicken', 'whole chicken'], days: 2 },
  { keywords: ['fish', 'salmon', 'tilapia', 'cod', 'tuna steak', 'shrimp', 'crab', 'lobster', 'seafood'], days: 2 },
  { keywords: ['steak', 'beef roast', 'pork chop', 'pork loin', 'pork'], days: 4 },
  { keywords: ['beef'], days: 4 }, // generic, after ground beef/steak rules above
  { keywords: ['bacon'], days: 7 },
  { keywords: ['sausage', 'hot dog', 'bratwurst'], days: 7 }, // after pepperoni rule above
  { keywords: ['deli meat', 'lunch meat', 'sliced ham', 'turkey slice', 'roast beef slice'], days: 5 },
  { keywords: ['ham'], days: 7 },

  // ── Bakery ──
  { keywords: ['bread', 'baguette', 'bagel', 'bun', 'roll', 'croissant', 'muffin'], days: 6 }, // after breadcrumb rule above
  { keywords: ['tortilla'], days: 14 },
  { keywords: ['pita'], days: 10 },
  { keywords: ['cake', 'pie'], days: 5 },
  { keywords: ['donut', 'doughnut'], days: 4 },

  // ── Frozen ──
  { keywords: ['frozen'], days: 180 }, // generic frozen catch-all (specific frozen items handled above)
  { keywords: ['ice cream'], days: 90 }, // after ice cream sandwich/bar and frozen yogurt rules above
  { keywords: ['cream'], days: 10 }, // generic "cream" catch-all — placed after ice cream/frozen rules since "cream" is a substring of "ice cream"

  // ── Pantry & Dry Goods ──
  { keywords: ['rice', 'pasta', 'noodle', 'spaghetti', 'macaroni'], days: 540 }, // after mac and cheese rule above
  { keywords: ['flour'], days: 365 },
  { keywords: ['sugar', 'brown sugar', 'powdered sugar'], days: 730 },
  { keywords: ['baking soda', 'baking powder'], days: 540 },
  { keywords: ['canned bean', 'canned corn', 'canned vegetable', 'canned fruit', 'canned'], days: 540 }, // after canned tomato rule above
  { keywords: ['beans', 'lentil', 'chickpea'], days: 540 },
  { keywords: ['broth', 'stock', 'soup'], days: 540 }, // after cream-of-soup rules above
  { keywords: ['cereal', 'granola bar', 'granola'], days: 240 },
  { keywords: ['oats', 'oatmeal'], days: 270 },
  { keywords: ['olive oil', 'vegetable oil', 'canola oil', 'cooking oil', 'oil'], days: 365 },
  { keywords: ['ketchup', 'mustard', 'mayo', 'mayonnaise', 'bbq sauce', 'hot sauce', 'soy sauce', 'salsa'], days: 180 },
  { keywords: ['sauce'], days: 180 }, // generic sauce catch-all, after specific sauce rules above
  { keywords: ['peanut butter', 'almond butter', 'nut butter'], days: 270 },
  { keywords: ['jam', 'jelly', 'preserve'], days: 270 },
  { keywords: ['honey', 'syrup', 'maple syrup'], days: 365 },
  { keywords: ['chip', 'cracker', 'pretzel', 'popcorn'], days: 60 },
  { keywords: ['cookie'], days: 60 }, // after peanut butter cookie rule above
  { keywords: ['snack bar', 'protein bar'], days: 180 },
  { keywords: ['snack'], days: 60 },
  { keywords: ['nuts', 'almond', 'cashew', 'walnut', 'pecan', 'pistachio'], days: 120 },
  { keywords: ['spice', 'seasoning', 'cinnamon', 'paprika', 'cumin', 'oregano', 'basil leaf'], days: 730 },
  { keywords: ['coffee', 'tea bag', 'tea'], days: 270 },
  { keywords: ['juice'], days: 14 },
  { keywords: ['soda', 'pop', 'sparkling water', 'water bottle'], days: 270 },
  { keywords: ['chocolate', 'candy'], days: 180 },
  { keywords: ['vinegar'], days: 730 },

  // ── Non-food (toiletries/household — far-future since these don't expire in the food sense) ──
  { keywords: ['shampoo', 'conditioner', 'body wash', 'soap', 'toothpaste', 'mouthwash', 'detergent', 'paper towel', 'toilet paper', 'tissue', 'dish soap'], days: 720 },
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
    if (!res.ok) {
      console.error('estimateExpiryWithAI: API error response:', data)
      return 365
    }
    const text = data.choices?.[0]?.message?.content?.trim() || ''
    const days = parseInt(text.match(/\d+/)?.[0])
    const final = Number.isFinite(days) && days > 0 ? days : 365
    console.log(`estimateExpiryWithAI: "${itemName}" -> AI replied "${text}" -> using ${final} days`)
    return final
  } catch (err) {
    console.error('estimateExpiryWithAI error for', itemName, ':', err)
    return 365 // safe generic fallback, never block the add
  }
}

export async function estimateExpiryDate(itemName) {
  const heuristicDays = matchExpiryDays(itemName)
  if (heuristicDays !== null) {
    console.log(`estimateExpiryDate: "${itemName}" -> heuristic match -> ${heuristicDays} days`)
    return calcExpiryDate(heuristicDays)
  }
  console.log(`estimateExpiryDate: "${itemName}" -> no heuristic match, calling AI fallback`)
  const aiDays = await estimateExpiryWithAI(itemName)
  return calcExpiryDate(aiDays)
}
