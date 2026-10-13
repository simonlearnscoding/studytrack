import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Close any study session left open longer than 8 hours.
crons.interval('close stale sessions', { hours: 1 }, internal.sessions.closeStale)

// Roll up the two most recent closed Days at minute 1 of every hour — one minute
// after Zurich midnight, and again each hour to absorb late stale-session closes.
crons.cron('roll up daily totals', '1 * * * *', internal.dailyTotals.rollupRecent)

export default crons
