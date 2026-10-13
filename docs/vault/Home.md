# studytrack vault

Issue tracker for studytrack. Managed with ZenNotes; see
`docs/agents/issue-tracker.md`.

## Areas

- [Requirements](Requirements/Requirements-moc.md)
- [Bugs](bugs/bugs-moc.md)
- [Visibility](Requirements/Visibility/Visibility-moc.md)

**Where to go next: [[Roadmap]]** (Now / Next / Later, and where every idea in
[[general-ideas]] went).

## Dashboard redesign

Build order (each task notes its `Blocked by`). Specs:
[[Studytrack dashboard spec]], [[Tasks spec]].

1. [[ST-1 Dashboard shell]] — todo
2. [[ST-2 Live room]] — todo
3. [[ST-3 Manual tracking]] — done
4. [[ST-4 Manual precedence]] — done
5. [[ST-5 Tasks]] — in-review
6. [[ST-6 Task visibility]] — todo · `#needs-info`
7. [[ST-7 Leaderboard by Deep focus]] — todo (deferred)
8. [[ST-8 Personal rail]] — todo (deferred)

## Now (agent-ready)

Independent unless noted. Map: [[Roadmap]].

1. [[ST-15 Timeline segment rounding]]: todo · #ready-for-agent
2. [[ST-16 Edit and delete tasks]]: todo · #ready-for-agent
3. [[Daily totals]] (ST-11): todo · #ready-for-agent
4. [[Weekly and monthly leaderboard]] (ST-12): todo · #ready-for-agent · Blocked by ST-11

## Visibility

Build order (each task notes its `Blocked by`). Map: [[Visibility-moc]].

1. [[Daily totals]] (ST-11): todo · #ready-for-agent
2. [[Weekly and monthly leaderboard]] (ST-12): todo · #ready-for-agent
3. [[Consistency heatmap]] (ST-13): todo · #needs-triage
4. [[Streak]] (ST-14): todo · #needs-triage

## Conventions

Notes carry `id`, `status`, `type`, `priority` and `area` frontmatter. Triage
roles and statuses: `docs/agents/triage-labels.md`.
