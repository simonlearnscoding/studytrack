# T9 Composite density merge and minimum width

---

id: LD-18
status: todo
type: requirement
priority: B
area: redesign
---

# T9 · Composite density: merge and minimum width

**What to build:** adjacent same-mode Partials merge into one segment, a very
short Partial keeps a minimum width so it stays visible, and a flickering cam
toggle stays readable without averaging.

**Blocked by:** T7 (LD-16).

**Status:** blocked

- [ ] Adjacent same-mode Partials render as one segment.
- [ ] A sub-second Partial still shows (minimum width).
- [ ] The pause-heavy / flicker scenario stays readable, with no vanishing or unreadable slivers.
- [ ] The merge and minimum-width passes are pure and unit-tested.
