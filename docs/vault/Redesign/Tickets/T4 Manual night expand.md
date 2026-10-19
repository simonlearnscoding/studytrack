# T4 Manual night expand

---

id: LD-12
status: done
type: requirement
priority: A
area: redesign
---

# T4 · Manual night expand

**What to build:** clicking a collapsed band expands that end to real scale at the
fixed px/h (the axis widens and scrolls); clicking again collapses it. The choice
persists per user across reloads. Bands are tap-sized.

**Blocked by:** T2 (LD-10).

**Status:** done

- [x] Clicking each band expands only that end; the expansion keeps px/h constant and adds scroll.
- [x] A manual expansion survives a reload (local preference), and a collapse also persists.
- [x] The two ends are independent of each other.

_Shipped: `mergeExpansion` / `resolveWindow` (band grows at fixed px/h) and `use-expansion-preference.ts` (localStorage-backed). With **ADR-0008**'s single morning band there is only one end to expand._
