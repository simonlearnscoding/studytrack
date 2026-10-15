/**
 * Dev-only scenario fixtures for the redesigned day timeline (`/beta`).
 *
 * These are shaped as the **real** backend payload — `DashboardMember[]` from
 * `sessions.getTodaysActivitiesForDashboard` — plus the three things a live
 * query cannot carry: the wall-clock `now`, the `dayStart` it was read against,
 * and which member is "you". A single pure adapter maps these into the view
 * models the lanes render, so the same adapter runs on fixtures and on live
 * data; wiring Convex later just swaps the payload.
 *
 * Times are minutes past a fixed, timezone-agnostic fixture midnight, so
 * `now - dayStart` reads as a real hour of day with no machine-timezone or DST
 * dependence.
 *
 * Delete this whole module (and the scenario switcher) once the timeline runs on
 * live data. See [[Data contract and scenarios]].
 */

import type { Id } from '@studytrack/backend/convex/_generated/dataModel'
import type { StudyMode } from '@studytrack/backend/convex/bot/types'
import type {
  DashboardCompletedTask,
  DashboardMember,
  DashboardPartial,
  DashboardSession,
} from '@studytrack/backend/convex/sessions/types'

const MIN = 60_000

/** Wed 14 Oct 2026, 00:00 — a fixture midnight, not a real Zurich one. */
export const DAY_START = Date.UTC(2026, 9, 14)

const at = (h: number, m = 0) => DAY_START + (h * 60 + m) * MIN

const partial = (
  key: string,
  mode: StudyMode,
  from: number,
  to: number | null
): DashboardPartial => ({
  id: `partial-${key}` as Id<'sessionPartial'>,
  channelId: mode === 'break' || mode === 'manual' ? null : 'study-1',
  mode,
  startedAt: from,
  endedAt: to,
})

const done = (key: string, title: string, atMs: number): DashboardCompletedTask => ({
  id: `task-${key}` as Id<'task'>,
  title,
  completedAt: atMs,
})

// A session's span is derived from its partials; the running one ends at null.
const session = (
  key: string,
  partials: DashboardPartial[],
  tasks: DashboardCompletedTask[] = []
): DashboardSession => {
  const first = partials[0]
  const last = partials[partials.length - 1]
  const endedAt = last?.endedAt ?? null
  return {
    id: `session-${key}` as Id<'session'>,
    status: endedAt === null ? 'active' : 'ended',
    startedAt: first?.startedAt ?? DAY_START,
    endedAt,
    partials,
    tasks,
  }
}

type MemberInput = {
  i: number
  name: string | null
  image?: string | null
  userId?: string | null
  online?: boolean
  sessions: DashboardSession[]
}

const member = (m: MemberInput): DashboardMember => ({
  userId: m.userId === null ? null : ((m.userId ?? `user-${m.i}`) as Id<'users'>),
  discordId: String(1000 + m.i),
  name: m.name,
  image: m.image ?? null,
  online: m.online ?? m.sessions.some((s) => s.status === 'active'),
  sessions: m.sessions,
})

const NAMES = [
  'Maya',
  'Ana',
  'Leo',
  'Kai',
  'Noor',
  'Priya',
  'Tomas',
  'Ben',
  'Sofia',
  'Diego',
  'Hana',
  'Ivy',
  'Ravi',
]
const MODES: StudyMode[] = ['camera', 'screenShare', 'voice', 'cameraAndScreenShare']

// The bulk of a room: `n` staggered members, the first `liveCount` still in a
// session now. Member 0 is "you".
function room(n: number, now: number, liveCount: number): DashboardMember[] {
  return Array.from({ length: n }, (_, i) => {
    const key = `m${i}`
    const start = at(8, 0) + ((i * 37) % 330) * MIN
    const live = i < liveCount
    const mode = MODES[i % MODES.length]
    const end = start + (75 + (i % 5) * 25) * MIN
    const p = partial(key, mode, start, live ? null : Math.min(end, now))
    return member({ i, name: NAMES[i % NAMES.length], sessions: [session(key, [p])] })
  })
}

export type Scenario = {
  label: string
  /** Current user's `userId`, matched against `DashboardMember.userId`. */
  me: string | null
  now: number
  dayStart: number
  members: DashboardMember[]
}

const crew: DashboardMember[] = [
  member({
    i: 0,
    name: 'Maya',
    sessions: [
      session(
        'you',
        [partial('you', 'camera', at(14, 0), null)],
        [
          done('you-a', 'Read chapter 4', at(14, 48)),
          done('you-b', 'Anki: German verbs ×40', at(15, 30)),
        ]
      ),
    ],
  }),
  member({
    i: 1,
    name: 'Ana',
    sessions: [
      session(
        'ana',
        [partial('ana', 'screenShare', at(11, 0), at(13, 40))],
        [done('ana-a', 'Draft essay outline', at(12, 20))]
      ),
    ],
  }),
  // Discord row never linked to Clerk: name + image are null, the view falls back.
  member({
    i: 2,
    name: null,
    sessions: [session('eve', [partial('eve', 'voice', at(15, 30), null)])],
  }),
]

const pauseHeavy: DashboardMember = member({
  i: 0,
  name: 'Maya',
  sessions: [
    session('pause', [
      partial('p1', 'camera', at(14, 0), at(15, 0)),
      partial('p2', 'break', at(15, 0), at(15, 10)),
      partial('p3', 'voice', at(15, 10), at(16, 0)),
      partial('p4', 'break', at(16, 0), at(16, 20)),
      partial('p5', 'camera', at(16, 20), at(18, 0)),
    ]),
  ],
})

const manual: DashboardMember = member({
  i: 0,
  name: 'Maya',
  sessions: [session('manual', [partial('manual', 'manual', at(10, 0), null)])],
})

export const SCENARIOS = {
  empty: {
    label: 'Nobody tracked',
    me: null,
    now: at(15, 0),
    dayStart: DAY_START,
    members: [],
  },
  one: {
    label: 'One member, ended',
    me: 'user-0',
    now: at(15, 0),
    dayStart: DAY_START,
    members: room(1, at(15, 0), 0),
  },
  three: {
    label: '3 members, one live',
    me: 'user-0',
    now: at(15, 0),
    dayStart: DAY_START,
    members: room(3, at(15, 0), 1),
  },
  eight: {
    label: '8 members, three live',
    me: 'user-0',
    now: at(15, 0),
    dayStart: DAY_START,
    members: room(8, at(15, 0), 3),
  },
  thirteen: {
    label: '13 members, five live',
    me: 'user-0',
    now: at(15, 0),
    dayStart: DAY_START,
    members: room(13, at(15, 0), 5),
  },
  morning: {
    label: 'Morning, now 07:30',
    me: 'user-0',
    now: at(7, 30),
    dayStart: DAY_START,
    members: room(4, at(7, 30), 2),
  },
  night: {
    label: 'Small hours, now 03:00 (night expands)',
    me: 'user-0',
    now: at(3, 0),
    dayStart: DAY_START,
    members: [
      member({
        i: 0,
        name: 'Maya',
        sessions: [session('you', [partial('you', 'camera', at(1, 0), null)])],
      }),
      member({
        i: 1,
        name: 'Ana',
        sessions: [
          session('ana', [
            partial('ana-a', 'voice', at(0, 30), at(2, 0)),
            partial('ana-b', 'break', at(2, 0), at(2, 10)),
            partial('ana-c', 'voice', at(2, 10), null),
          ]),
        ],
      }),
    ],
  },
  dawn: {
    label: 'Dawn boundary, now 05:00',
    me: 'user-0',
    now: at(5, 0),
    dayStart: DAY_START,
    members: [
      member({
        i: 0,
        name: 'Maya',
        sessions: [session('you', [partial('you', 'voice', at(4, 30), null)])],
      }),
    ],
  },
  late: {
    label: 'After 22:00, now 22:15 (evening expands)',
    me: 'user-0',
    now: at(22, 15),
    dayStart: DAY_START,
    members: [
      member({
        i: 0,
        name: 'Maya',
        sessions: [session('you', [partial('you', 'camera', at(20, 0), null)])],
      }),
    ],
  },
  offline: {
    label: 'Nobody online, sessions earlier',
    me: 'user-0',
    now: at(17, 0),
    dayStart: DAY_START,
    members: room(6, at(17, 0), 0),
  },
  'pause-heavy': {
    label: 'One member, pause-heavy day',
    me: 'user-0',
    now: at(18, 0),
    dayStart: DAY_START,
    members: [pauseHeavy],
  },
  manual: {
    label: 'One member, manual tracking',
    me: 'user-0',
    now: at(11, 0),
    dayStart: DAY_START,
    members: [manual],
  },
  crew: {
    label: 'Tasks + an unlinked member',
    me: 'user-0',
    now: at(15, 45),
    dayStart: DAY_START,
    members: crew,
  },
} satisfies Record<string, Scenario>

export type ScenarioName = keyof typeof SCENARIOS

export const scenarioNames = Object.keys(SCENARIOS) as ScenarioName[]

export const DEFAULT_SCENARIO: ScenarioName = 'three'

export function getScenario(name: string | undefined | null): Scenario {
  if (name && name in SCENARIOS) return SCENARIOS[name as ScenarioName]
  return SCENARIOS[DEFAULT_SCENARIO]
}
