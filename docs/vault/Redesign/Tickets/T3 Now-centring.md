# T3 Now-centring

---

id: LD-11
status: done
type: requirement
priority: A
area: redesign
---

# T3 · Now-centring

**What to build:** when the track overflows, it opens centred on the current time;
it re-snaps on mount and when the window changes, never on every tick; centring
clamps at the absolute day ends.

**Blocked by:** T2 (LD-10).

**Status:** done

- [x] On load with an overflowing track, "now" sits centred.
- [x] The view does not jump as the ticking clock advances.
- [x] With now near 05:00 or 22:00, and at 00:00 / 24:00, the view clamps instead of showing empty space.
- [x] A manual horizontal scroll is preserved until the window changes.

_Shipped: `centreScrollLeft` in `packages/backend/convex/timeline/util.ts` and `use-centre-on-now.ts` (re-snaps on mount / window change only, clamped to the axis ends)._
