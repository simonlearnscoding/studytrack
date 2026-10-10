import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Close any study session left open longer than 8 hours.
crons.interval('close stale sessions', { hours: 1 }, internal.sessions.closeStale)

export default crons
