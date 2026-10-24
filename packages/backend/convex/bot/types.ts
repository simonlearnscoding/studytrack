import { v, type Infer } from 'convex/values'

// How a member occupies a study channel. A workSession stores exactly one of these.
// `break` is not derived from a voice state — it is written by the bot to fill a
// short gap between two partials of the same workSession. `manual` is declared from
// the web (see ../tracking), with no Discord evidence behind it.
export const studyMode = v.union(
  v.literal('voice'),
  v.literal('camera'),
  v.literal('screenShare'),
  v.literal('cameraAndScreenShare'),
  v.literal('break'),
  v.literal('manual')
)

export type StudyMode = Infer<typeof studyMode>

// The slice of a Discord voice state this system cares about. The bot reports a
// before/after pair of these and lets Convex decide what changed.
export const voiceSnapshot = v.object({
  channelId: v.union(v.string(), v.null()),
  camera: v.boolean(),
  screenShare: v.boolean(),
})

export type VoiceSnapshot = Infer<typeof voiceSnapshot>

// Raw voice event the bot forwards. The bot does no interpretation — it reports
// the before/after snapshots and lets this module decide what they mean.
export const recordVoiceEventArgs = v.object({
  secret: v.string(),
  discordId: v.string(),
  discordUsername: v.optional(v.string()),
  guildId: v.string(),
  from: voiceSnapshot,
  to: voiceSnapshot,
})

export type RecordVoiceEventArgs = Infer<typeof recordVoiceEventArgs>

export type RecordVoiceEventResult = { ignored: 'no-op' } | { ended: number } | { started: true }
