# T2 Fixed window and collapsible night

---

id: LD-10
status: done
type: requirement
priority: A
area: redesign
---

# T2 · Fixed window and collapsible night

**What to build:** the axis shows a fixed core over a full 00:00–24:00 span, with
the night drawn as a thin, labelled collapsed band at the start. The axis stops
shrinking at a per-hour floor and scrolls horizontally below that; the name column
stays pinned. The narrow/scroll switch is driven by the timeline's own width, not
the viewport.

**Blocked by:** T1 (LD-9).

**Status:** done

- [x] At and above the floor width the whole core fits with no scroll; below it the track scrolls sideways and hour labels thin out instead of colliding.
- [x] The name column does not scroll with the track.
- [x] The night renders as one labelled collapsed band before the core; the small hours are not drawn at full scale.
- [x] The narrow/scroll decision follows the timeline's container width, not the viewport.

_Shipped: `resolveWindow` in `packages/backend/convex/timeline/util.ts` (core `06:00–24:00`, night band `00:00–06:00`, `PX_PER_HOUR_FLOOR = 32`), `use-element-width.ts`, `names-column.tsx`. **ADR-0008 revised the window** from the original two-band `05:00–22:00` core to the shipped one-band `06:00–24:00` core._
