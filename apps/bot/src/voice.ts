export type VoiceMove = 'joined' | 'left' | 'moved' | 'none'

// Raw before/after channel ids → what the user did. The bot keeps no state and
// writes nothing; this only decides which line to log.
export function describeVoiceMove(from: string | null, to: string | null): VoiceMove {
  if (from === to) return 'none'
  if (from === null) return 'joined'
  if (to === null) return 'left'
  return 'moved'
}

// Whether anybody is sitting in a voice channel right now. The bot's gateway
// keeps this cache current, so the leaderboard can ask on every tick without
// touching Discord or Convex. Bots do not count: they are not studying.
export type VoicePresence = {
  channelId: string | null
  member: { user: { bot: boolean } } | null
}

export function hasHumanInVoice(states: Iterable<VoicePresence>): boolean {
  for (const state of states) {
    if (state.channelId === null) continue
    if (state.member?.user.bot) continue
    return true
  }
  return false
}

// The slice of a Discord voice state we care about, mirroring the shape Convex
// expects. Discord.js exposes the camera as `selfVideo` and screen share as
// `streaming`.
export type VoiceSnapshot = {
  channelId: string | null
  camera: boolean
  screenShare: boolean
}

export function toVoiceSnapshot(state: {
  channelId: string | null
  selfVideo: boolean | null
  streaming: boolean | null
}): VoiceSnapshot {
  return {
    channelId: state.channelId,
    // Discord.js types these as `boolean | null`; treat null as off.
    camera: state.selfVideo === true,
    screenShare: state.streaming === true,
  }
}
