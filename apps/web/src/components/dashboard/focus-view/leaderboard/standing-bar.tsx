// One row's share of the leader's value in the selected Period · metric. Full
// means level with #1; the numbers beside it carry the same fact, so the bar is
// decorative and stays out of the accessibility tree.
export function StandingBar({ share, compact = false }: { share: number; compact?: boolean }) {
  const percent = Math.min(100, Math.max(0, share * 100))

  return (
    <div
      aria-hidden
      className={`bg-border/60 overflow-hidden rounded-full ${compact ? 'h-0.5' : 'h-1'}`}
    >
      <div
        className="bg-primary h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
