// Brand autocomplete — static table of well-known US grocery brands per
// common item, checked first; AI fallback for anything unmatched.
// Suggestions are purely an assist — tapping one fills the input, but typing
// custom text and submitting without tapping anything is always preserved as-is.

const BRAND_TABLE = [
  { keywords: ['milk'], brands: ['Horizon Organic', 'Land O\'Lakes', 'Organic Valley', 'Fairlife', 'Great Value'] },
  { keywords: ['almond milk'], brands: ['Almond Breeze', 'Silk', 'Califia Farms'] },
  { keywords: ['oat milk'], brands: ['Oatly', 'Planet Oat', 'Silk'] },
  { keywords: ['eggs', 'egg'], brands: ['Eggland\'s Best', 'Vital Farms', 'Happy Egg Co.', 'Great Value'] },
  { keywords: ['butter'], brands: ['Land O\'Lakes', 'Kerrygold', 'Challenge', 'Great Value'] },
  { keywords: ['cheese', 'cheddar'], brands: ['Tillamook', 'Sargento', 'Kraft', 'Great Value'] },
  { keywords: ['yogurt'], brands: ['Chobani', 'Fage', 'Yoplait', 'Dannon'] },
  { keywords: ['sour cream'], brands: ['Daisy', 'Breakstone\'s', 'Great Value'] },
  { keywords: ['cream cheese'], brands: ['Philadelphia', 'Great Value'] },

  { keywords: ['bread'], brands: ['Dave\'s Killer Bread', 'Sara Lee', 'Wonder', 'Nature\'s Own'] },
  { keywords: ['bagel'], brands: ['Thomas\'', 'Lender\'s'] },
  { keywords: ['tortilla'], brands: ['Mission', 'Guerrero', 'La Banderita'] },

  { keywords: ['chicken breast', 'chicken'], brands: ['Tyson', 'Perdue', 'Foster Farms'] },
  { keywords: ['ground beef', 'beef'], brands: ['Certified Angus Beef', 'Great Value'] },
  { keywords: ['bacon'], brands: ['Oscar Mayer', 'Applegate', 'Wright Brand'] },
  { keywords: ['sausage'], brands: ['Johnsonville', 'Jimmy Dean'] },
  { keywords: ['hot dog'], brands: ['Oscar Mayer', 'Nathan\'s Famous', 'Ball Park'] },
  { keywords: ['deli meat', 'ham', 'turkey slice'], brands: ['Boar\'s Head', 'Oscar Mayer', 'Applegate'] },
  { keywords: ['salmon', 'fish'], brands: ['Wild Planet', 'StarKist'] },

  { keywords: ['rice'], brands: ['Uncle Ben\'s', 'Mahatma', 'Lundberg'] },
  { keywords: ['pasta', 'spaghetti', 'noodle'], brands: ['Barilla', 'Ronzoni', 'De Cecco'] },
  { keywords: ['cereal'], brands: ['Kellogg\'s', 'General Mills', 'Post', 'Cheerios'] },
  { keywords: ['oatmeal', 'oats'], brands: ['Quaker', 'Bob\'s Red Mill'] },
  { keywords: ['peanut butter'], brands: ['Jif', 'Skippy', 'Smucker\'s'] },
  { keywords: ['jam', 'jelly'], brands: ['Smucker\'s', 'Welch\'s'] },
  { keywords: ['honey'], brands: ['Nature Nate\'s', 'SueBee'] },
  { keywords: ['ketchup'], brands: ['Heinz', 'Hunt\'s'] },
  { keywords: ['mustard'], brands: ['French\'s', 'Gulden\'s'] },
  { keywords: ['mayo', 'mayonnaise'], brands: ['Hellmann\'s', 'Best Foods', 'Duke\'s'] },
  { keywords: ['hot sauce'], brands: ['Tabasco', 'Cholula', 'Frank\'s RedHot'] },
  { keywords: ['salsa'], brands: ['Pace', 'Tostitos'] },
  { keywords: ['olive oil', 'oil'], brands: ['Bertolli', 'Colavita', 'Pompeian'] },
  { keywords: ['canned tomato', 'tomato sauce'], brands: ['Hunt\'s', 'Muir Glen', 'Cento'] },
  { keywords: ['soup', 'broth', 'stock'], brands: ['Campbell\'s', 'Progresso', 'Swanson'] },
  { keywords: ['beans', 'canned bean'], brands: ['Bush\'s', 'Goya'] },

  { keywords: ['chip', 'chips'], brands: ['Lay\'s', 'Doritos', 'Tostitos', 'Pringles'] },
  { keywords: ['cracker'], brands: ['Ritz', 'Wheat Thins', 'Triscuit'] },
  { keywords: ['cookie'], brands: ['Oreo', 'Chips Ahoy!', 'Nutter Butter'] },
  { keywords: ['granola bar', 'protein bar'], brands: ['Nature Valley', 'Kind', 'Clif Bar'] },
  { keywords: ['popcorn'], brands: ['SkinnyPop', 'Smartfood', 'Pop Secret'] },
  { keywords: ['nuts', 'almond', 'cashew'], brands: ['Planters', 'Blue Diamond', 'Wonderful'] },
  { keywords: ['chocolate', 'candy'], brands: ['Hershey\'s', 'M&M\'s', 'Reese\'s'] },

  { keywords: ['frozen pizza', 'pizza'], brands: ['DiGiorno', 'Red Baron', 'Tombstone'] },
  { keywords: ['ice cream'], brands: ['Ben & Jerry\'s', 'Häagen-Dazs', 'Breyers'] },
  { keywords: ['frozen vegetable', 'frozen veggie'], brands: ['Birds Eye', 'Green Giant'] },
  { keywords: ['frozen waffle'], brands: ['Eggo', 'Van\'s'] },

  { keywords: ['coffee'], brands: ['Folgers', 'Starbucks', 'Maxwell House', 'Dunkin\''] },
  { keywords: ['tea'], brands: ['Lipton', 'Bigelow', 'Twinings'] },
  { keywords: ['juice'], brands: ['Tropicana', 'Simply', 'Minute Maid'] },
  { keywords: ['soda', 'pop'], brands: ['Coca-Cola', 'Pepsi', 'Sprite', 'Dr Pepper'] },
  { keywords: ['water bottle', 'sparkling water'], brands: ['LaCroix', 'Poland Spring', 'Dasani'] },

  { keywords: ['shampoo'], brands: ['Pantene', 'Head & Shoulders', 'Dove'] },
  { keywords: ['toothpaste'], brands: ['Crest', 'Colgate', 'Sensodyne'] },
  { keywords: ['soap', 'body wash'], brands: ['Dove', 'Irish Spring', 'Olay'] },
  { keywords: ['detergent'], brands: ['Tide', 'Persil', 'Gain'] },
  { keywords: ['paper towel'], brands: ['Bounty', 'Sparkle'] },
  { keywords: ['toilet paper'], brands: ['Charmin', 'Cottonelle', 'Angel Soft'] },
  { keywords: ['dish soap'], brands: ['Dawn', 'Palmolive'] },
]

export function matchStaticBrands(itemName) {
  const lower = itemName.toLowerCase().trim()
  if (!lower) return null
  for (const entry of BRAND_TABLE) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.brands
    }
  }
  return null
}

// AI fallback — used only when the static table has no match for this item
export async function suggestBrandsWithAI(itemName) {
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
          content: `List 4 well-known US grocery brand names that sell "${itemName}". Reply with ONLY a JSON array of strings, nothing else, no markdown. Example: ["Brand One","Brand Two","Brand Three","Brand Four"]. If you don't recognize this as a real grocery item, reply with an empty array [].`
        }]
      })
    })
    const data = await res.json()
    if (!res.ok) return []
    const text = data.choices?.[0]?.message?.content?.trim() || '[]'
    const cleaned = text.replace(/```json|```/g, '').trim()
    const brands = JSON.parse(cleaned)
    return Array.isArray(brands) ? brands.slice(0, 4) : []
  } catch (err) {
    console.error('suggestBrandsWithAI error:', err)
    return []
  }
}
