import { v, type Infer } from 'convex/values'

// Fields Clerk-sourced profile data. `clerkUserId` is deliberately absent — it
// always comes from the verified identity, never from the arguments.
export const upsertFromClerkArgs = v.object({
  discordId: v.optional(v.string()),
  name: v.optional(v.string()),
  image: v.optional(v.string()),
})

export type UpsertFromClerkArgs = Infer<typeof upsertFromClerkArgs>
