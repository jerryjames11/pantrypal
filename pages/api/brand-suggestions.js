import { matchStaticBrands, suggestBrandsWithAI } from '../../lib/brands'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { itemName } = req.body
  if (!itemName || !itemName.trim()) return res.status(200).json({ brands: [] })

  const staticMatch = matchStaticBrands(itemName)
  if (staticMatch) {
    return res.status(200).json({ brands: staticMatch, source: 'static' })
  }

  const aiBrands = await suggestBrandsWithAI(itemName)
  return res.status(200).json({ brands: aiBrands, source: 'ai' })
}
