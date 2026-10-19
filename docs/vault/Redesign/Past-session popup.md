---
id: LD-5
status: todo
type: requirement
priority: B
area: redesign
---

# Past-session popup

**In short:** clicking a past session opens a popup showing what was done — the
first "session interaction" after the lanes themselves.

## Owner's thinking

> Once I have nailed [1–4] down I will continue with the mechanic of clicking on a
> past session to see what tasks have been done, and figure out what info should be
> on that popup.

## Open questions

- [ ] **What it shows:** completed tasks (`DashboardCompletedTask`), plus times,
      modes, duration, focus rate, participants, a link to the session?
- [ ] Opening a **past** vs a **live** session — same popup or different?
- [ ] **Trigger:** click the bar, click a task dot, or both?
- [ ] Where it hangs — a shadcn Popover anchored to the bar (the code comment
      already anticipates "a shadcn Popover hangs off each bar (session details) in
      prod").
- [ ] Does it later become the surface for the planned-session retrospective (the
      Session Planning ramble in [[general-ideas]])?

## Related

- [[Lanes of the day]] · [[Task dots]] · [[Future-session planning]] · [[general-ideas]]
