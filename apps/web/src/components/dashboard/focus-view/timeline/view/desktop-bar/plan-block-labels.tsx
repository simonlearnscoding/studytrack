export function PlanBlockSpanLabel({
  leftPx,
  label,
  maxWidthPx,
}: {
  leftPx: number
  label: string
  maxWidthPx?: number
}) {
  return (
    <span
      className="bg-primary-tint text-primary pointer-events-none absolute -top-4 z-[5] block max-w-48 truncate rounded-md px-1.5 py-px font-mono text-label leading-none whitespace-nowrap"
      style={{ left: leftPx, maxWidth: maxWidthPx }}
    >
      {label}
    </span>
  )
}

// A readout, not a plan: the quarter-hour a click or drag would start on. It
// follows the pointer and wears a neutral chip so it never reads as the
// emerald from – until label a real plan (or gesture) carries.
export function CursorTimeLabel({ leftPx, label }: { leftPx: number; label: string }) {
  return (
    <span
      aria-hidden
      className="bg-background/95 text-foreground ring-white/15 pointer-events-none absolute -top-4 z-[5] block w-max -translate-x-1/2 rounded-md px-1.5 py-px font-mono text-label leading-none whitespace-nowrap ring-1"
      style={{ left: leftPx }}
    >
      {label}
    </span>
  )
}
