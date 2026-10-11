import type { DashboardPartial } from '@studytrack/backend/convex/sessions/types'

type StudyMode = DashboardPartial['mode']

// One colour per mode. The four study modes occupy the slots the quality tiers
// will use once the cam+SS-is-best ranking is layered on; breaks stay invisible
// so they read as gaps. `manual` is flagged amber because it is self-declared.
export const MODE_BAR: Record<StudyMode, string> = {
  cameraAndScreenShare: 'bg-mode-cam-screen',
  camera: 'bg-mode-cam',
  screenShare: 'bg-mode-screen',
  voice: 'bg-mode-voice',
  manual: 'bg-mode-manual',
  break: 'bg-transparent',
}

export const MODE_LABEL: Record<StudyMode, string> = {
  cameraAndScreenShare: 'Cam + screen',
  camera: 'Camera',
  screenShare: 'Screen share',
  voice: 'Voice',
  manual: 'Manual',
  break: 'Break',
}

// The order to show them in a legend (best engagement first). Manual comes last:
// it is the weakest evidence of studying.
export const LEGEND_MODES: StudyMode[] = [
  'cameraAndScreenShare',
  'camera',
  'screenShare',
  'voice',
  'manual',
]
