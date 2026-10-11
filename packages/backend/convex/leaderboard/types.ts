import { v, type Infer } from 'convex/values'

// One row of the daily leaderboard, already ranked and capped by ./util. The bot
// renders these directly and does no ranking of its own.
export type LeaderboardRow = {
  discordId: string
  name: string | null
  deepFocusMs: number
  totalMs: number
  online: boolean
}

// The bot supplies `dayStart` and `now` because queries must not read the wall
// clock (see ../sessions/util); `secret` is the shared bot secret.
export const getTodayArgs = v.object({
  secret: v.string(),
  dayStart: v.number(),
  now: v.number(),
})

export type GetTodayArgs = Infer<typeof getTodayArgs>
