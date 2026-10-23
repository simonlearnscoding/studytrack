/**
 * TodayLayout — port of the approved "floating page" mock.
 * Composition only: each region is its own component. The room rail is live from
 * Convex (`useRoom`); the remaining placeholder data lives in `./data`.
 *
 * Mobile (<lg): single column — room first when out, you/room/timeline when
 * live. The personal rail (taskpane) is desktop-only and the quote lives in
 * the site header; on mobile the MobileTaskDock replaces them — a sticky
 * bottom bar + bottom sheet. Bottom padding on the root reserves their space.
 */

import { ConsistencyBoard } from './consistency-board'
import { DayHeading } from './day-heading'
import { Hero } from './hero'
import { MobileTaskDock } from './mobile-task-dock'
import { MonthCalendar } from './month-calendar'
import { PresenceRail } from './presence-rail'
import { TaskPane } from './task-pane'
import { tracking } from './mock-data'
import { TimelineSection } from './timeline-section'
import { useConsistencyBoard } from './use-consistency-board'
import { useMonthCalendar } from './use-month-calendar'
import { useRoom } from './use-room'
import { useTaskQueue } from './use-task-queue'
import { useNow } from '~/hooks/use-now'

export function TodayLayout() {
  // One once-a-minute clock keeps the board, the calendar's live today cell and
  // their future/today flags current without refetching every second. The queue
  // also reads it so a past Day knows it can offer "schedule for today".
  const now = useNow(60_000)
  // The queue is the one source of truth for the Now task — the first open task
  // of the Day; the desktop pane, the mobile dock and the hero all read it.
  const taskQueue = useTaskQueue(tracking, now)
  // The room is live from Convex; its per-second clock lives in the rail itself.
  const { inRoom, count: roomCount } = useRoom()
  const { weekRows, monthRows } = useConsistencyBoard(now)
  const calendar = useMonthCalendar(now)
  // below xl it sits full-width in the main column; xl+ keeps it in the rail
  const monthCalendar = <MonthCalendar calendar={calendar} />

  return (
    <div className="mx-auto flex max-lg:min-h-dvh max-lg:flex-col max-lg:gap-5 max-lg:px-3.5 max-lg:py-3.5 max-lg:pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:h-[calc(100dvh-3.5rem)] lg:max-w-[1560px] lg:flex-col lg:gap-4 lg:p-8 lg:px-6 lg:pb-6">
      <div className="grid min-h-0 flex-1 gap-6 max-lg:flex max-lg:flex-col lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)_minmax(300px,336px)]">
        <div
          className={`min-h-0 space-y-6 lg:max-h-full lg:overflow-y-auto ${taskQueue.isTracking ? 'max-lg:order-2' : 'max-lg:order-1'}`}
        >
          <PresenceRail members={inRoom} />
          {/* medium screens: consistency tucks into the left rail, behind a divider */}
          <div className="hidden border-t border-white/[0.06] pt-5 lg:block xl:hidden">
            <ConsistencyBoard weekRows={weekRows} monthRows={monthRows} compact />
          </div>
        </div>

        <main
          className={`flex min-h-0 flex-col gap-6 max-lg:gap-5 max-lg:overflow-visible lg:overflow-y-auto ${taskQueue.isTracking ? 'max-lg:order-3' : 'max-lg:order-2'}`}
        >
          <Hero isTracking={taskQueue.isTracking} task={taskQueue.now?.title ?? null} />
          <DayHeading now={now} />
          <TimelineSection />
          <div className="flex flex-col gap-6">
            <div className="xl:hidden">{monthCalendar}</div>
            <div className="lg:hidden xl:block">
              <ConsistencyBoard weekRows={weekRows} monthRows={monthRows} />
            </div>
          </div>
          {/* the personal rail is desktop-only — on mobile the dock owns it */}
        </main>

        <aside className="flex min-h-0 flex-col gap-4 max-lg:hidden lg:overflow-y-auto">
          <TaskPane queue={taskQueue} />
          <div className="hidden xl:block">{monthCalendar}</div>
        </aside>
      </div>

      <MobileTaskDock queue={taskQueue} roomCount={roomCount} />
    </div>
  )
}
