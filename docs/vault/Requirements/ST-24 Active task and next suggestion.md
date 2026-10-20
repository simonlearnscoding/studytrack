---
id: ST-24
status: in-progress
type: requirement
priority: B
area: requirements
---

# ST-24 Active task and next suggestion

**In short:** give each member an **optional active task** — the one thing they're
on right now — shown to them and to the room, plus a derived **up-next
suggestion** when they have none. The mock is built; the backend is unchanged.

## Owner's thinking

> it is not coded yet, just an idea I have. … so you can optionally have an active
> task and then you can see yours and others too (as you can see in the beta
> dashboard live section). For now I won't track time on the active task. However
> I'm not sure yet about the next task — when I finish my active task, MAYBE it
> should automatically set the task that was below as the "next" suggestion, to
> keep in the flow. But if I do it like this I'm not sure how to move from next
> suggestion to actually select it, or maybe you don't even need a separation
> between active and next state — although that will lead to unpleasant side
> effects, like what if I want to take a break in between and it seems I'm already
> working on stuff. Also not sure how to do the interaction of choosing/unchoosing
> an active task; I thought maybe on click is most intuitive, but on the other hand
> it will likely lead to user errors and a bit of frustration.

## Decisions

Locked 2026-10-15, after grilling:

- **Build order:** frontend mock first, backend later, per [[Lanes of the day]].
  The dock's `activeSince` is the field the backend will adopt.
- **Session-scoped:** the active task exists only while in a live Session; leaving
  or going offline clears it.
- **Next is derived, never auto-set:** finishing the active task does not silently
  start the task below — "next" stays a suggestion.
- **One state, not two:** there is no stored `next`; it is computed from the queue.
- **Header is the read surface:** the bar shows the active task with a tick to
  complete and a × to clear; with none set it shows the derived up-next with a
  play button to pick it. The sheet's dashed "up next" banner is dropped; row tap
  still sets active.
- **Clear = explicit ×**, not tapping the row again — a stray tap must not silently
  drop your pick.
- **Order:** oldest-first; next = the first open task directly below the active
  one, no wrap, stop at the end.
- **All tasks public:** the per-task shared/private flag and the eye/lock are
  removed everywhere. Supersedes ADR-0002, extends ADR-0005, completed by
  ADR-0007.

## Built (mock only)

- `today/data.ts` — dropped `shared`; `upNext()` derives the suggestion.
- `mobile-task-dock/` — `setActive` / `clearActive`; up-next in the `NowBar`; the
  dashed banner removed.
- `task-item` / `task-pane` — `NEXT` chip on the desktop list; `hero` shows
  up-next when idle.
- `presence-rail` — lock / "private list" removed; shows active, else next, else —.
- ADR-0007 written; privacy comments and the GLOSSARY `Task` definition updated.

## Still open

- [ ] Wire to Convex: add the pointer + functions; decide server-side whether
      "active" is a per-task flag or a per-member pointer.
- [ ] Ordering: does `listMine` return oldest-first, or stay newest-first with the
      queue reversed in the view?
- [ ] Desktop interactivity: the pane is read-only today — is set-active a mobile
      gesture only, or both?

## Where it lands

- **Schema:** an `activeSince`-style field on `task` (or a per-member pointer),
  behind the existing auth checks.
- **Read path:** the today dashboard payload already carries members + sessions;
  the active task rides along for the room view.

## Related

- [[ST-5 Tasks]] · [[Tasks spec]] · [[Lanes of the day]] · [[Future-session planning]]

## Backend spec

[[ST-27 Task planning and active task]] (ST-27) picks up the backend. It revises
three decisions here: the Day list is newest-first (not oldest-first), the active
pointer lives on the user row (not on the task), and it clears when the active
task is completed. Session-scoped clearing is deferred until real tracking
exists. Planned tasks also gain an explicit Session link and a planned Day.
