import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Gemini 1.5 Flash — free tier: 1,500 req/day, 1M tokens/min
export const model      = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
export const visionModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

/**
 * Parse JSON from a Gemini response, stripping markdown fences if present.
 */
export function extractJSON(text) {
  const cleaned = text.replace(/```json|```/g, '').trim()
  return JSON.parse(cleaned)
}
