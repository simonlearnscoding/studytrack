/**
 * FocusView — port of the approved "floating page" mock.
 * Composition only: each region is its own component. The room rail is live from
 * Convex (`useLiveRoom`); the remaining placeholder data lives in the components.
 *
 * Mobile (<lg): single column — room first when out, you/room/timeline when
 * live. The personal rail (taskpane) is desktop-only and the quote lives in
 * the site header; on mobile the MobileTaskDock replaces them — a sticky
 * bottom bar + bottom sheet. Bottom padding on the root reserves their space.
 */

import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/workSessions/util'
import { useNow } from '~/hooks/use-now'
import { useSyncClerkUser } from '~/hooks/use-sync-clerk-user'
import { useDateStore } from '~/state/date.store'
import { Leaderboard } from './leaderboard/leaderboard'
import { DayHeading } from './day-heading'
import { Hero } from './hero'
import { MobileTaskDock } from './tasks/mobile-task-dock'
import { MonthCalendar } from './calendar/month-calendar'
import { PresenceRail } from './live-room/presence-rail'
import { TaskPane } from './tasks/task-pane'
import { TimelineSection } from './timeline/timeline-section'
import { useLeaderboard } from './leaderboard/use-leaderboard'
import { useDayTaskQueue } from './tasks/hooks/use-day-task-queue'
import { useMonthCalendar } from './calendar/use-month-calendar'
import { useLiveRoom } from './live-room/use-live-room'
import { useTrackingStatus } from './use-tracking-status'

export function FocusView() {
  useSyncClerkUser()
  // One once-a-minute clock keeps the board, the calendar's live today cell and
  // their future/today flags current without refetching every second. The queue
  // also reads it so a past Day knows it can offer "schedule for today".
  const now = useNow(60_000)
  const selectedDate = useDateStore((state) => state.selectedDate)
  const dayStart = startOfDay(selectedDate.getTime(), DASHBOARD_TIME_ZONE)
  const tracking = useTrackingStatus()
  // The queue is the one source of truth for the Now task — the first open task
  // of the Day; the desktop pane, the mobile dock and the hero all read it.
  const taskQueue = useDayTaskQueue(dayStart, now)
  const workSessionElapsedMs =
    tracking.startedAt === null ? 0 : Math.max(0, now - tracking.startedAt)
  // The room is live from Convex; its per-second clock lives in the rail itself.
  const { inRoom, count: roomCount } = useLiveRoom()
  const { weekRows, monthRows } = useLeaderboard(now)
  const calendar = useMonthCalendar(now)
  // below xl it sits full-width in the main column; xl+ keeps it in the rail
  const monthCalendar = <MonthCalendar calendar={calendar} />

  return (
    <div className="mx-auto flex max-lg:min-h-dvh max-lg:flex-col max-lg:gap-5 max-lg:px-3.5 max-lg:py-3.5 max-lg:pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:h-[calc(100dvh-3.5rem)] lg:max-w-(--content-max) lg:flex-col lg:gap-4 lg:p-8 lg:px-6 lg:pb-6">
      <div className="grid min-h-0 flex-1 gap-6 max-lg:flex max-lg:flex-col lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)_minmax(300px,336px)]">
        <div
          className={`min-h-0 space-y-6 lg:max-h-full lg:overflow-y-auto ${tracking.isOnline ? 'max-lg:order-2' : 'max-lg:order-1'}`}
        >
          <PresenceRail members={inRoom} />
          {/* medium screens: consistency tucks into the left rail, behind a divider */}
          <div className="hidden border-t border-white/[0.06] pt-5 lg:block xl:hidden">
            <Leaderboard weekRows={weekRows} monthRows={monthRows} compact />
          </div>
        </div>

        <main
          className={`flex min-h-0 flex-col gap-6 max-lg:gap-5 max-lg:overflow-visible lg:overflow-y-auto ${tracking.isOnline ? 'max-lg:order-3' : 'max-lg:order-2'}`}
        >
          <Hero
            isOnline={tracking.isOnline}
            canStartManual={tracking.canStartManual}
            onStartManual={tracking.startManual}
            elapsedMs={workSessionElapsedMs}
            nowTask={taskQueue.state.now ?? null}
            onToggleNowTask={() => {
              const nowTask = taskQueue.state.now
              if (nowTask) taskQueue.actions.toggleTaskDone(nowTask.id)
            }}
          />
          <DayHeading now={now} />
          <TimelineSection />
          <div className="flex flex-col gap-6">
            <div className="lg:hidden">{monthCalendar}</div>
            <div className="lg:hidden xl:block">
              <Leaderboard weekRows={weekRows} monthRows={monthRows} />
            </div>
          </div>
          {/* the personal rail is desktop-only — on mobile the dock owns it */}
        </main>

        <aside className="flex min-h-0 flex-col gap-4 max-lg:hidden lg:overflow-y-auto">
          {/* calendar and tasks share one bubble: calendar on top, tasks below,
              separated by a hairline rather than a gap between cards */}
          <div className="bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
            <MonthCalendar calendar={calendar} isEmbedded />
            <div className="border-t" />
            <TaskPane queue={taskQueue} isEmbedded />
          </div>
        </aside>
      </div>

      <MobileTaskDock queue={taskQueue} tracking={tracking} roomCount={roomCount} />
    </div>
  )
}
