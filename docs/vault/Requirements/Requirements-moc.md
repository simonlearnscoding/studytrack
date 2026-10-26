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
- [[ST-28 Month calendar with real data]] (ST-28): done · real month grid, month navigation, and live Daily totals for the focus month

- [[ST-23 Deep focus counts screen share]] (ST-23): in-review · screen-share-only time now counts as Deep focus
- [[Collective focus time]] (ST-25): todo · #needs-triage · [[Symbiosis-moc]] · a live meter of the room's shared study

## Self & presence

- [[ST-24 Active task and next suggestion]] (ST-24): in-progress · optional active task visible to you and the room, plus an up-next suggestion (mock built; backend open)

- [[ST-27 Task planning and active task]] (ST-27): done · the Day contract (`plannedAt`, Day reads, Session attribution, manual order). Its stored active pointer was retired by ADR-0011 in favour of derived Now; the leftover is [[ST-36 Delete the unused active-task pointer]].
- [[ST-29 Task reordering by drag]] (ST-29): in-review · #ready-for-agent · manual task order per Day, whole-row drag in the beta pane, optimistic drop. Supersedes ST-27's oldest-first ordering clause.
- [[ST-30 Foldable Done group]] (ST-30): done · foldable `Done · 4` group at the foot of the queue, remembered cross-device; first use of the shared task group.
- [[ST-36 Delete the unused active-task pointer]] (ST-36): todo · #ready-for-agent · remove the stored NOW pointer and its mutations, which ADR-0011 replaced with derivation.

## Planning

Plan blocks are the future windows on the timeline. This arc adds a name, a task
link and a visible group in the task pane, with a dev clock to test the time
states. ADR-0012 records the assignment shape; ADR-0014 makes a group a
projection of the Day queue.

- [[ST-31 Plan block title and editable window]] (ST-31): done · title (now optional) + editable create/edit popover
- [[ST-32 Dev clock]] (ST-32): done · dev-only time travel for plan state
- [[ST-33 Plan block task assignment]] (ST-33): done · the plan assignment link
- [[ST-34 Plan a block with tasks]] (ST-34): done · debounced search and atomic create-and-attach
- [[ST-35 Plan groups in the task view]] (ST-35): done · plan blocks as foldable groups in the task pane
