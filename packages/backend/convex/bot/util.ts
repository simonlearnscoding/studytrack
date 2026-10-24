import type { StudyMode, VoiceSnapshot } from './types'

export type VoiceTransition = 'enter' | 'leave' | 'change' | 'none'

// The engagement a snapshot represents: just there, camera, screen share, both.
export function getStudyMode({
  camera,
  screenShare,
}: Pick<VoiceSnapshot, 'camera' | 'screenShare'>): StudyMode {
  if (camera && screenShare) return 'cameraAndScreenShare'
  if (camera) return 'camera'
  if (screenShare) return 'screenShare'
  return 'voice'
}

// What the before/after snapshots mean. Any change to where the member is or how
// they are engaged is a 'change' — the handler starts a new workSession for it.
export function getVoiceTransition(from: VoiceSnapshot, to: VoiceSnapshot): VoiceTransition {
  if (to.channelId === null) return from.channelId === null ? 'none' : 'leave'
  if (from.channelId === null) return 'enter'
  if (from.channelId === to.channelId && getStudyMode(from) === getStudyMode(to)) return 'none'
  return 'change'
}

// Constant-time compare so the shared secret can't be guessed by timing.
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function assertBotSecret(secret: string) {
  const expected = process.env.BOT_SHARED_SECRET
  if (!expected || !safeEqual(secret, expected)) throw new Error('Unauthorized')
}
