---
type: moc
---

# Requirements

Map of content for feature requirements. Link requirement notes here with their
`id` and `status`. See `docs/agents/issue-tracker.md`.

**In short:** these are the requirements that survive the dashboard redesign —
the backend-facing ones. The old dashboard UI specs are in `trash/`.

## Backend-facing

- [[ST-5 Tasks]] — in-review · the private task list (table + owner management)
- [[Tasks spec]] — in-review · spec for the task table and its visibility rules
- [[ST-9 Discord daily leaderboard]] — done · the Discord surface (bot board shipped)

## Visibility

How studytrack shows effort over time. Sprint map: [[Visibility-moc]].
Direction: [[Roadmap]].

- [[Daily totals]] (ST-11): in-review
- [[Weekly and monthly leaderboard]] (ST-12): in-review
- [[Consistency heatmap]] (ST-13): wontfix · parked — the `/beta` month calendar carries it
- [[Streak]] (ST-14): todo · parked behind the calendar

- [[ST-23 Deep focus counts screen share]] (ST-23): in-review · screen-share-only time now counts as Deep focus
- [[Collective focus time]] (ST-25): todo · #needs-triage · [[Symbiosis-moc]] · a live meter of the room's shared study

## Self & presence

- [[ST-24 Active task and next suggestion]] (ST-24): in-progress · optional active task visible to you and the room, plus an up-next suggestion (mock built; backend open)

- [[ST-27 Task planning and active task]] (ST-27): todo · #ready-for-agent · backend for day-planned tasks, Session attribution, and the active task. Beta wiring follows.
