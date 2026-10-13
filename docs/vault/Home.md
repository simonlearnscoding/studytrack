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

## Trunk (owner — next session)

Map: [[Roadmap]]. The heart of the app, designed before it is built.

1. Session feel: a `grilling` on "the soul of a shared Session", then a
   `prototype` of the strongest candidate.

See `docs/adr/0004-session-is-the-trunk.md`.

## Now (shipped, in review)

Merged to `spqrbot-26` and deployed to prod on 2026-10-13; awaiting the owner's
pass. Map: [[Roadmap]].

1. [[ST-15 Timeline segment rounding]]: in-review
2. [[ST-16 Edit and delete tasks]]: in-review
3. [[Daily totals]] (ST-11): in-review
4. [[Weekly and monthly leaderboard]] (ST-12): in-review

## Visibility

Build order (each task notes its `Blocked by`). Map: [[Visibility-moc]].

1. [[Daily totals]] (ST-11): in-review
2. [[Weekly and monthly leaderboard]] (ST-12): in-review
3. [[Consistency heatmap]] (ST-13): todo · #needs-triage
4. [[Streak]] (ST-14): todo · #needs-triage

## Conventions

Notes carry `id`, `status`, `type`, `priority` and `area` frontmatter. Triage
roles and statuses: `docs/agents/triage-labels.md`.
