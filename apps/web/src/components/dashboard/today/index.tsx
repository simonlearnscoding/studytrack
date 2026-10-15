/**
 * TodayLayout — port of the approved "floating page" mock.
 * Composition only: each region is its own component, each takes its data as
 * props. Placeholder data lives in `./data` — wire to Convex there later.
 *
 * Mobile (<lg): single column — taskpane first when live, room first when
 * out. NOW-bar + bottom sheet are separate mobile components, not this file
 * (bottom padding on the root reserves their space).
 */

import { ConsistencyBoard } from './consistency-board'
import { Hero } from './hero'
import { MonthCalendar } from './month-calendar'
import { PresenceRail } from './presence-rail'
import { Quote } from './quote'
import { TaskPane } from './task-pane'
import { board, heat, hero, live, month, monthBoard, presence, quote, tasks } from './data'
import { TimelineSection } from './timeline-section'

export function TodayLayout() {
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
    <div className="mx-auto flex max-lg:min-h-dvh max-lg:flex-col max-lg:gap-5 max-lg:px-3.5 max-lg:py-3.5 max-lg:pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:h-dvh lg:max-w-[1560px] lg:flex-col lg:gap-4 lg:p-8 lg:px-6 lg:pb-6">
      <div className="grid min-h-0 flex-1 gap-6 max-lg:flex max-lg:flex-col lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)_minmax(300px,336px)]">
        <div
          className={`min-h-0 space-y-6 lg:max-h-dvh lg:overflow-y-auto ${live ? 'max-lg:order-2' : 'max-lg:order-1'}`}
        >
          <PresenceRail people={presence} />
          {/* medium screens: consistency tucks into the left rail, behind a divider */}
          <div className="hidden border-t border-white/[0.06] pt-5 lg:block xl:hidden">
            <ConsistencyBoard weekRows={board} monthRows={monthBoard} compact />
          </div>
        </div>

        <main
          className={`flex min-h-0 flex-col gap-6 max-lg:gap-5 max-lg:overflow-visible lg:overflow-y-auto ${live ? 'max-lg:order-3' : 'max-lg:order-2'}`}
        >
          <Hero {...hero} />
          <TimelineSection />
          <div className="flex flex-col gap-6">
            <div className="xl:hidden">{monthCalendar}</div>
            <div className="lg:hidden xl:block">
              <ConsistencyBoard weekRows={board} monthRows={monthBoard} />
            </div>
          </div>
        </main>

        <aside
          className={`flex min-h-0 flex-col gap-4 max-lg:overflow-visible lg:order-none lg:overflow-y-auto ${live ? 'max-lg:order-1' : 'max-lg:hidden'}`}
        >
          <TaskPane tasks={tasks} />
          <div className="hidden xl:block">{monthCalendar}</div>
          <Quote text={quote} />
        </aside>
      </div>
    </div>
  )
}
