import type { DailyQuote } from './types'

// ZenQuotes `/api/today` returns a one-element array shaped
// `[{ q: quote, a: author, i, h, date }]`. Narrow it to the two fields we store,
// tolerating anything else (an error body, a truncated payload) as `null`.
export function parseZenQuote(payload: unknown): DailyQuote | null {
  if (!Array.isArray(payload)) return null
  const first = payload[0]
  if (typeof first !== 'object' || first === null) return null

  const { q, a } = first as Record<string, unknown>
  if (typeof q !== 'string' || typeof a !== 'string') return null

  const text = q.trim()
  const author = a.trim()
  if (!text || !author) return null

  return { text, author }
}
