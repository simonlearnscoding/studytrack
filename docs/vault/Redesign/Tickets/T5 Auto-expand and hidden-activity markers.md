# T5 Auto-expand and hidden-activity markers

---

id: LD-13
status: done
type: requirement
priority: A
area: redesign
---

# T5 · Auto-expand and hidden-activity markers

**What to build:** the relevant band opens by itself when now is outside
05:00–22:00 (before 05:00 → morning; at/after 22:00 → evening) and stays open for
the visit; a fresh load inside the window starts collapsed. A session, plan or
completed task inside a collapsed band surfaces as a marker/count on that band.

**Blocked by:** T4 (LD-12).

**Status:** done

- [x] Loading at 03:00 opens the morning band; at 22:15 the evening is already core (no band, **ADR-0008**); at 12:00 the band stays collapsed.
- [x] Auto-expansion does not collapse mid-visit (e.g. crossing 05:00).
- [x] Auto-expansion is not persisted; a manual expansion still is.
- [x] Activity hidden in a collapsed band shows a visible marker/count without force-opening it.

_Shipped: `autoExpansionAt` / `mergeExpansion` and `use-night-band-auto-expansion.ts`; `TimelineRowVM.hiddenCount` plus the band's count badge in `night-band.tsx`. The auto-open/lock hour is `09:00` (`AUTO_OPEN_UNTIL_MIN`), per **ADR-0008**, not the original `05:00`._
