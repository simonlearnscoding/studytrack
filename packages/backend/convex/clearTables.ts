import { internalMutation } from './_generated/server'
import type { TableNames } from './_generated/dataModel'
import schema from './schema'

// Destructive: deletes every row in every table, including the seats the
// schema declares (no hard-coded list). Dev use only — it is an internal
// mutation, so only the CLI/dashboard can call it (see scripts/clear-tables.mjs).
export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = Object.keys(schema.tables) as TableNames[]
    let deleted = 0
    for (const table of tables) {
      for await (const row of ctx.db.query(table)) {
        await ctx.db.delete(row._id)
        deleted += 1
      }
    }
    return { deleted }
  },
})
