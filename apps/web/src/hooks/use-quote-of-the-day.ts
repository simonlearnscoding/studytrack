import { api } from '@studytrack/backend/convex/_generated/api'
import type { DailyQuote } from '@studytrack/backend/convex/quotes/types'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useRef } from 'react'

// The site header's motivational quote, one per Day from Convex. `undefined`
// while the query is in flight; `null` when signed out or before the first fetch.
// When the header finds no quote yet (a fresh deploy, a missed cron), it nudges
// the backend to fetch one, so the header isn't blank for up to an hour. The
// mutation re-checks auth itself, so firing it signed-out is a harmless no-op.
export function useQuoteOfTheDay(): DailyQuote | null | undefined {
  const quote = useQuery(api.quotes.today, {})
  const ensure = useMutation(api.quotes.ensure)
  const asked = useRef(false)

  useEffect(() => {
    if (quote !== null || asked.current) return
    asked.current = true
    ensure({}).catch((error) => console.error('[studytrack] failed to ensure quote', error))
  }, [quote, ensure])

  return quote
}
