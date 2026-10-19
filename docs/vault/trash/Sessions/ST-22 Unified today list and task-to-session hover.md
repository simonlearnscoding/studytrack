---
id: ST-22
status: done
type: requirement
priority: A
area: sessions
---

#wayfinder/task
#ready-for-agent

## Question

Build the two decided parts of the Session slice, in parallel with ST-18 (the
card design):

1. **Unified today list**: collapse the "Studying now" / "Studied today" split
   into one list, sorted online-first, with the green online dot.
2. **Task-to-session hover**: hovering a member's session line shows the tasks
   done in that session — auto-bound by `completedAt ∈ [startedAt, endedAt)`
   (ST-19). Task titles are public (ADR-0005).

Convex + web, following the domain-workflow shape and the auth checks. The
Session card is NOT part of this ticket — it is ST-21, still blocked by ST-18.

## Answer

Built and committed on `sessions/st-22` (commit 53698ad, not pushed).

- **Unified today list**: `room-panel` now renders one list (online-first, green
  dot), no Studying-now / Studied-today split.
- **Task-to-session hover**: `getTodaysActivitiesForDashboard` now returns each
  session's completed tasks (`title` + `completedAt`), auto-bound by
  `startedAt <= completedAt < endedAt` (open-ended active sessions treated as
  unbounded). Done titles only — open titles still stay owner-only. Hover uses
  the native `title` attribute (no Tooltip component exists yet).
- Tests: 124 backend + 15 bot pass; typecheck clean.

Decisions made by the build agent: native-title hover (minimal), done-titles-only
exposure, `.take(200)` newest-first per member. A richer hover + open-title
exposure can graduate later (see ST-21).
