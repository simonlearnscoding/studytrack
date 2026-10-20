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
import { Hero } from './hero'
import { MobileTaskDock } from './mobile-task-dock'
import { MonthCalendar } from './month-calendar'
import { PresenceRail } from './presence-rail'
import { TaskPane } from './task-pane'
import { heat, live, month } from './data'
import { TimelineSection } from './timeline-section'
import { useConsistencyBoard } from './use-consistency-board'
import { useRoom } from './use-room'
import { useTaskQueue } from './use-task-queue'
import { useNow } from '~/hooks/use-now'

export function TodayLayout() {
  // The queue is the one source of truth for the active task + up-next; both the
  // desktop pane and the mobile dock read the same state.
  const queue = useTaskQueue(live)
  // The room is live from Convex; its per-second clock lives in the rail itself.
  const { inRoom, count: roomCount } = useRoom()
  // The consistency board follows the selected day; a once-a-minute clock keeps
  // the current Week and Month live without refetching every second.
  const { weekRows, monthRows } = useConsistencyBoard(useNow(60_000))
  // below xl it sits full-width in the main column; xl+ keeps it in the rail
  const monthCalendar = (
    <MonthCalendar
      month={month.name}
      streak={month.streak}
      heat={heat}
      todayIndex={month.todayIndex}
    />
  )

  return (
    <div className="mx-auto flex max-lg:min-h-dvh max-lg:flex-col max-lg:gap-5 max-lg:px-3.5 max-lg:py-3.5 max-lg:pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:h-[calc(100dvh-3.5rem)] lg:max-w-[1560px] lg:flex-col lg:gap-4 lg:p-8 lg:px-6 lg:pb-6">
      <div className="grid min-h-0 flex-1 gap-6 max-lg:flex max-lg:flex-col lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)_minmax(300px,336px)]">
        <div
          className={`min-h-0 space-y-6 lg:max-h-full lg:overflow-y-auto ${queue.live ? 'max-lg:order-2' : 'max-lg:order-1'}`}
        >
          <PresenceRail members={inRoom} />
          {/* medium screens: consistency tucks into the left rail, behind a divider */}
          <div className="hidden border-t border-white/[0.06] pt-5 lg:block xl:hidden">
            <ConsistencyBoard weekRows={weekRows} monthRows={monthRows} compact />
          </div>
        </div>

        <main
          className={`flex min-h-0 flex-col gap-6 max-lg:gap-5 max-lg:overflow-visible lg:overflow-y-auto ${queue.live ? 'max-lg:order-3' : 'max-lg:order-2'}`}
        >
          <Hero
            live={queue.live}
            active={queue.active?.title ?? null}
            next={queue.next?.title ?? null}
          />
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
          <TaskPane queue={queue} />
          <div className="hidden xl:block">{monthCalendar}</div>
        </aside>
      </div>

      <MobileTaskDock queue={queue} roomCount={roomCount} streak={month.streak} />
    </div>
  )
}
