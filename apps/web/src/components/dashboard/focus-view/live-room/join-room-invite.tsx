import { Play } from 'lucide-react'

// The empty seat in the room: a member card shape that invites the viewer to
// start tracking. It lives with the live members so "who is here" and "join
// them" read as one decision rather than two separate prompts.
export function JoinRoomInvite({
  canStart,
  isRoomEmpty,
  onStart,
}: {
  canStart: boolean
  isRoomEmpty: boolean
  onStart: () => void
}) {
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={!canStart}
      className="card-surface border-primary/40 bg-primary-tint hover:border-primary/60 hover:bg-primary/20 cursor-pointer border-dashed px-3 py-2.5 text-left transition-colors disabled:cursor-default disabled:opacity-60 max-lg:w-[10.5rem] max-lg:shrink-0"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-primary border-primary/50 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed">
          <Play className="ml-0.5 h-3 w-3 fill-current" />
        </span>
        <p className="text-primary min-w-0 flex-1 truncate text-xs font-medium">Start tracking</p>
      </div>
      <p className="text-subtle-foreground mt-1.5 truncate text-caption">
        {isRoomEmpty ? 'be the first in' : 'join the room'}
      </p>
    </button>
  )
}
