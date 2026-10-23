# studytrack vault

Issue tracker for studytrack. Managed with ZenNotes; see
`docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md`.

**The Focus view is the dashboard.** `/` renders it for signed-in members, with
the Welcome page for signed-out visitors. Notes written while it was a redesign
say `/beta`: that route moved to `/`, and the classic dashboard was deleted.
This vault tracks the **backend domain** and the requirements that still matter.

## Areas

- [Requirements](Requirements/Requirements-moc.md) — feature specs
- [Visibility](Requirements/Visibility/Visibility-moc.md) — effort over time, backed by [[Daily totals]]
  - [Symbiosis](Requirements/Visibility/Symbiosis/Symbiosis-moc.md) — the room as one · [[Collective focus time]] (ST-25)

## Focus view

- [[Lanes of the day]] — the day timeline
- [[In the room]] — the presence rail · [[In the room spec]] (LD-20)

## Backend domain (what the Focus view hooks into)

- [[data-model]] — the Convex schema; source of truth for every table
- [[ST-5 Tasks]] · [[Tasks spec]] — the private `task` table
- [[ST-9 Discord daily leaderboard]] — the bot's Discord board
- [[Daily totals]] — the stored per-Day record every Visibility read sums over

## Direction

- [[Roadmap]] — what to build next, and why in this order
- [[general-ideas]] — the raw source the Roadmap is distilled from

## Conventions

Notes carry `id`, `status`, `type`, `priority` and `area` frontmatter. Triage
roles and statuses: `docs/agents/triage-labels.md`.
