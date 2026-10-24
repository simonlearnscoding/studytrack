import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Close any study workSession left open longer than 8 hours.
crons.interval('close stale workSessions', { hours: 1 }, internal.workSessions.closeStale)

// Roll up the two most recent closed Days at minute 1 of every hour — one minute
// after Zurich midnight, and again each hour to absorb late stale-workSession closes.
crons.cron('roll up daily totals', '1 * * * *', internal.dailyTotals.rollupRecent)

// Fetch the header's motivational quote once per local Day. Runs hourly so a Day
// missed by a failed fetch self-heals; the ensure step is idempotent.
crons.cron('ensure daily quote', '0 * * * *', internal.quotes.ensureToday)

export default crons
