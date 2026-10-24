import type { DashboardPartial } from '@studytrack/backend/convex/workSessions/types'
import { Mic, Monitor, MonitorPlay, PenLine, Video, type LucideIcon } from 'lucide-react'

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

// The same colour as a text utility, for a mode icon. A break carries no colour.
export const MODE_TEXT: Record<StudyMode, string> = {
  cameraAndScreenShare: 'text-mode-cam-screen',
  camera: 'text-mode-cam',
  screenShare: 'text-mode-screen',
  voice: 'text-mode-voice',
  manual: 'text-mode-manual',
  break: '',
}

// One icon per Study mode, colour-matched via MODE_TEXT. A break has no icon — it
// is the absence of a mode, not a way of studying.
export const MODE_ICON: Record<Exclude<StudyMode, 'break'>, LucideIcon> = {
  cameraAndScreenShare: MonitorPlay,
  camera: Video,
  screenShare: Monitor,
  voice: Mic,
  manual: PenLine,
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
