# T6 Mobile pinned lane parity

---

id: LD-14
status: done
type: requirement
priority: B
area: redesign
---

# T6 · Mobile pinned lane parity

**What to build:** the pinned mobile lane behaves the same — the fixed window and
bands, tap-to-expand, now-centring via its own scroll position, shared
persistence — with touch-sized targets.

**Blocked by:** T3 (LD-11), T5 (LD-13).

**Status:** done

- [x] On a narrow viewport the pinned lane shows the same window and bands and opens centred on now.
- [x] Tapping a band expands it, and the choice is shared with desktop.
- [x] No hover-only affordances; targets are thumb-sized.
- [x] The label/name mirror stays in lockstep while panning.

_Shipped: `mobile-lane.tsx` + `use-mirror-scroll.ts` (axis mirror panned with the shared `scrollerRef`), sharing `use-centre-on-now` and `use-expansion-preference` with the desktop bar; the band mirror landed in `8972058`._
