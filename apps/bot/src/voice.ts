export type VoiceMove = 'joined' | 'left' | 'moved' | 'none'

// Raw before/after channel ids → what the user did. The bot keeps no state and
// writes nothing; this only decides which line to log.
export function describeVoiceMove(from: string | null, to: string | null): VoiceMove {
  if (from === to) return 'none'
  if (from === null) return 'joined'
  if (to === null) return 'left'
  return 'moved'
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
