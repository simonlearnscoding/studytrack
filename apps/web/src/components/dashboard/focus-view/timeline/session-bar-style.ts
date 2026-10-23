import type { StudyMode } from '@studytrack/backend/convex/bot/types'

// Provisional track styling, carried over from the old timeline mock while the
// look of the lines is still undecided (LD-2, [[Timeline line styling]]). Swap
// for tokens / named patterns when that card lands.
export const BAR_LIVE: Record<StudyMode, string> = {
  cameraAndScreenShare: 'bg-primary shadow-[0_0_9px_rgb(52_211_153/0.35)]',
  camera: 'bg-primary shadow-[0_0_9px_rgb(52_211_153/0.35)]',
  screenShare:
    'bg-[repeating-linear-gradient(-55deg,rgb(52_211_153/0.85)_0_4px,rgb(52_211_153/0.3)_4px_8px)]',
  voice: 'bg-primary/40',
  manual: 'border-primary/55 bg-primary/10 border',
  break: 'bg-transparent',
}

export const BAR_ENDED: Record<StudyMode, string> = {
  cameraAndScreenShare: 'bg-white/[0.14]',
  camera: 'bg-white/[0.14]',
  screenShare: 'bg-white/[0.14]',
  voice: 'bg-white/[0.08]',
  manual: 'border border-white/20 bg-transparent',
  break: 'bg-transparent',
}

export function barClass(mode: StudyMode, live: boolean): string {
  return live ? BAR_LIVE[mode] : BAR_ENDED[mode]
}
