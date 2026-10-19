---
id: ST-13
status: wontfix
type: requirement
priority: C
area: requirements
---

# ST-13 Consistency heatmap

**In short:** a private calendar heatmap of your own Study time — one square per
Day, a year at a glance, web-only, never ranked. **Parked — the month calendar on
the redesigned dashboard (`/beta`) carries this surface for now.** See
[[Roadmap]].

#needs-triage

> [!warning] Parked, for now
> The `/beta` month calendar already renders the same idea — your own study time
> over days, colour-coded, private — so the separate year heatmap is not being
> built. The `dailyTotals.listMine` query specified below is still the data
> design the calendar should eventually adopt. Revive this note if members ask
> for the year-at-a-glance view.

A calendar heatmap of your own Study time: one square per Day, a year at a
glance, private and web only. The idea is that a truthful record of showing up
brings members back on its own, with no ranking involved.

Map: [[Visibility-moc]]. Chapter: [[Consistency-moc]]. Vocabulary: `GLOSSARY.md`
(Consistency, Day, Daily total, Review view).

## Why we ship it

Heatmaps were among the most-loved features of the owner's previous app, used
by the same members. That evidence comes from a different product, so it is not
proof — but it is enough to build, and we judge it by feel once it is out rather
than by a formal test.

## How we'll judge it

A look, not a gate: over the first couple of weeks, does the owner open the
Review view without prompting, and does anyone else mention it? No
pre-registered test, and [[Streak]] is not gated on it.

## What is decided

- **Decided** — it encodes **Study time**, not Deep focus. Consistency is you vs
  your past self, and Deep focus would punish members without a webcam.
- **Decided** — web only. Discord never shows it. Discord shows Standing, and
  the web is where you look back.
- **Decided** — it lives in the **Review view**, not the Focus view. The Focus
  view is about now, so at most a [[Streak]] token appears there.
- **Decided** — no comparison, no ranking, no other members' heatmaps.
- **Decided** — the data comes from [[Daily totals]] for past Days, plus today's
  live Study time. Add a new authenticated query
  `dailyTotals.listMine({ fromDayStart })`:
  - It resolves the caller's `users` row to their member key, using the same rule
    as ST-11.
  - It reads `dailyTotal.by_memberKey` from `fromDayStart` onwards, bounded at
    400 rows.
  - It returns `{ dayStart, studyMs }[]`.
- **Decided** — the grid has 53 week-columns with Monday at the top and the
  current week on the right. Days before a member's first study are blank, not
  zero.
- **Decided** — the colour thresholds are fixed, not relative to your own best,
  so a colour means the same amount of study forever. The buckets are 0,
  under 30m, 30m–1h30, 1h30–3h, and 3h or more.
- **Decided** — hovering a square shows a tooltip such as
  `Tue 14 Oct · 2h15m study`.

## What is still open (settle in one prototype session, then flip to #ready-for-agent)

- **Leaning**: the Review view is a new `/review` route, with a two-link header
  nav (Focus | Review) added to the dashboard shell. This is the first piece of
  the Focus / Plan / Review navigation in [[Roadmap]], so it should be judged
  visually before an agent builds it.
- **Leaning**: a one-line summary above the grid, such as "142 Days studied in
  the last year". It is a record, not a score, but the wording needs a look.
- **Open**: the colour ramp. Should it reuse the mode colours (`mode-colors.ts`)
  or use a single-hue ramp?
- **Open**: on mobile, should the grid scroll horizontally or show fewer weeks?

Recommended path: use the `prototype` skill to build a throwaway page with fake
Daily totals. Decide the four items above. Then update this note and tag it
#ready-for-agent.

## Acceptance Criteria (once ready)

- [ ] `/review` reachable from the Focus view header and back.
- [ ] The heatmap renders the signed-in member's last 53 weeks, and today's
      square updates live.
- [ ] `listMine` is auth-checked and returns only the caller's rows. Tested with
      `convex-test`.
- [ ] Bucket mapping is a pure function with Vitest coverage, including the
      bucket boundaries.

## Out of Scope

- Weekday × hour heatmap, session log, personal best. All parked in
  [[Consistency-moc]].
- Web Period leaderboards in the Review view. Parked in [[Standing-moc]].

Blocked by: [[Daily totals]].
