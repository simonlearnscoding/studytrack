# The timeline shows one fixed day with a collapsible night

The day timeline is a single calendar Day (see `GLOSSARY.md`), drawn on a fixed
axis: a full-scale **core from 06:00 to 24:00**, with the night before it
(`00:00–06:00`) shown as one thin, collapsed band that opens on click. The axis
never shifts to follow activity, and the hour labels never rescale — expanding a
band keeps the core's px/hour fixed and widens the axis, so expanding is zooming
into the night rather than rescaling the day to fit.

The clock holds the band open on its own while it is still early — before
**09:00**, wider than the band's own 06:00 edge, so a morning session or a
finished all-nighter stays on screen. An auto-open cannot be collapsed (the
toggle is inert, and shows no fold control, until the hour passes), which makes
the auto-open hour the single knob for both "open by default" and "locked open".

There is **no evening band**. `22:00–24:00` runs at full scale to midnight.

## Considered and rejected

- **Two bands (morning + evening), core `05:00–22:00`** — the original LD-8 spec.
  The morning band pays for six otherwise-dead hours; the evening band pays for
  two. That 3:1 difference is the whole argument, and hiding the evening crops
  nothing — the core already ends at midnight with no gap to conceal. Cut.
- **An activity-driven window** (shifting to the first/last session). It rescales
  the axis under the reader and makes "where am I in the day" unstable. Fixed
  clock bounds also make DST a non-issue by construction.
- **Multi-day / infinite horizontal scroll** (days side by side, HEY-style). The
  intended direction later, but it retires the "one day fits the laptop"
  promise, needs async day-prefetch, and collides with the drag gestures. Parked
  as a direction, not a ticket — see `Multi-day scroll` in the vault.

## See also

- The pure seam: `resolveWindow`, `autoExpansionAt`, `mergeExpansion` in
  `packages/backend/convex/timeline/util.ts`.
- Bands, expansion state and the lock: `packages/backend/convex/timeline/types.ts`
  and `apps/web/src/components/dashboard/today/use-night-band-preference.ts`.
