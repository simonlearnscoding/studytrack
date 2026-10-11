import { v, type Infer } from 'convex/values'

// Raw voice event the bot forwards. The bot does no interpretation — it reports
// the before/after channel ids and lets this module decide what they mean.
export const recordVoiceEventArgs = v.object({
  secret: v.string(),
  discordId: v.string(),
  guildId: v.string(),
  fromChannelId: v.union(v.string(), v.null()),
  toChannelId: v.union(v.string(), v.null()),
})

export type RecordVoiceEventArgs = Infer<typeof recordVoiceEventArgs>

export type RecordVoiceEventResult =
  | { ignored: 'no-guild-config' | 'already-active' | 'no-op' }
  | { ended: number }
  | { started: true }
