import type { ReactNode } from 'react'
// Photo: Jimmy Liu on Unsplash — https://unsplash.com/photos/jagged-mountain-peaks-under-orange-cloud-_frXlVQ_WZk
import mountains from '~/assets/mountains.jpg'

// The dashboard skeleton: a full-viewport grid, no max-width. The room is the
// fluid focal column; the personal rail is a true sidebar — glued to the right
// edge, full-height below the sticky header (h-14), on its own surface with its
// own scroll. The mountain photo is a full-height backdrop for the whole
// shell, washed out to invisibility on the left and only emerging, blurred and
// faint, toward the rail. Below `lg` the rail leads — you first, then the
// group — as a plain padded stack. A left nav column can join the grid later
// without disturbing either zone.
export function DashboardShell({ room, self }: { room: ReactNode; self: ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <img src={mountains} alt="" className="h-full w-full object-cover opacity-25 blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-background/70 to-background" />
      </div>
      <div className="relative flex flex-col gap-10 px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-0 lg:p-0">
        <section className="order-2 min-w-0 lg:order-none lg:px-8 lg:py-8">{room}</section>
        <aside className="order-1 flex min-w-0 flex-col gap-6 lg:order-none lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:overflow-y-auto lg:border-l lg:border-border lg:bg-card/50 lg:p-6">
          {self}
        </aside>
      </div>
    </div>
  )
}
