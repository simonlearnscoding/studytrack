import { v, type Infer } from 'convex/values'

// The quote as the header renders it: the line and who said it.
export type DailyQuote = {
  text: string
  author: string
}

// The cron's ensure step hands the action the local Day it is filling, so the
// fetch and the store agree on `dayStart` without either reading the clock twice.
export const fetchArgs = v.object({ dayStart: v.number() })

// The action's write: the resolved Day plus the parsed quote.
export const storeArgs = v.object({
  dayStart: v.number(),
  text: v.string(),
  author: v.string(),
})

export type FetchArgs = Infer<typeof fetchArgs>
export type StoreArgs = Infer<typeof storeArgs>
