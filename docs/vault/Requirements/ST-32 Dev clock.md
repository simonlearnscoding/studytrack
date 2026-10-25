---
id: ST-32
status: todo
type: requirement
priority: B
area: requirements
---

# ST-32 Dev clock

#ready-for-agent

**In short:** while developing, move the dashboard's clock forward and back so a
plan block can be seen as upcoming, live and past without waiting for real time.

**Blocked by:** None (can start immediately).

## Context

Plan blocks change state with the clock, and their task assignments will too.
Real time makes that impossible to feel out in one sitting. Production must keep
using the real clock; this is a development aid, not a product feature.

Read ADR-0010 (a completion instant exists only when the box is ticked while
viewing today) and ADR-0011 (Now is today's top task); the dev clock moves
"today", it does not change either rule.

## What to build

- A deployment-gated dev clock, off by default and impossible to enable in
  production. A client-supplied time must never change a production write.
- A small control in the beta dashboard: jump forward or back by 15 minutes, 1
  hour or 1 day, and reset to real time. A day jump also puts the Focus day on the
  fake today, so the lane and the task view show the same Day.
- The client's ticking clock and the server's clock agree while the dev clock is
  on. The client clock drives the timeline, the leaderboard, the task view's
  today/past flags and plan state. The server clock drives the plan-create past
  floor, completion instants and assignment rules.
- Crons and stored Daily totals keep using real time. The dev clock changes only
  interactive reads and writes.

## Acceptance criteria

- [ ] With the dev clock off, behaviour is the production clock; the control is
      not reachable in production.
- [ ] With it on, jumping forward makes an upcoming block live and then past
      without waiting; the lane, the plan popover and the task view agree.
- [ ] Creating a block at the fake now obeys the fake past floor.
- [ ] Ticking a task under the fake clock records the same live/retrospective
      decision the server would make at that instant.
- [ ] Reset returns every surface, including the Focus day, to the real clock.
- [ ] Automated tests cover the pure offset and the production guard.
