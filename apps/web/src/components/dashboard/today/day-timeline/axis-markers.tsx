import type { TimelineTick } from '@studytrack/backend/convex/timeline/types'

// Hour tick labels. `className` sets the vertical anchor each mirror uses (the
// bottom of the mobile lane, the top of the desktop bar).
export function HourLabels({
  ticks,
  widthPx,
  className,
}: {
  ticks: TimelineTick[]
  widthPx: number
  className?: string
}) {
  return (
    <>
      {ticks.map((t) => (
        <span
          key={t.label}
          className={`absolute font-mono text-[10px] whitespace-nowrap text-white/45 ${className ?? ''} ${
            t.leftPx === 0 ? '' : t.leftPx === widthPx ? '-translate-x-full' : '-translate-x-1/2'
          }`}
          style={{ left: t.leftPx }}
        >
          {t.label}
        </span>
      ))}
    </>
  )
}

// The vertical "now" line; callers place it with `className`.
export function NowLine({ left, className }: { left: number; className?: string }) {
  return <div className={`bg-primary absolute w-[1.5px] ${className ?? ''}`} style={{ left }} />
}

// The "now" pill — opaque, so it seams out the top of the line it sits on.
export function NowPill({
  label,
  left,
  className,
}: {
  label: string
  left: number
  className?: string
}) {
  return (
    <span
      className={`bg-primary-tint text-primary absolute block w-max -translate-x-1/2 rounded-md px-1.5 py-px font-mono text-[10px] leading-none font-semibold whitespace-nowrap ${className ?? ''}`}
      style={{ left }}
    >
      {label}
    </span>
  )
}
