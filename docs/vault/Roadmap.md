---
type: moc
---

# Roadmap

**In short:** the live push is the **dashboard redesign** — a new frontend in the
`/beta` route over the existing Convex backend. The backend domain it hooks into
(Tasks, Daily totals, the Discord board, Sessions) is specified under
[Requirements](Requirements/Requirements-moc.md). Below is what comes after, and
why in this order.

**Now** items are what to pick up today. **Next** items need one short owner
session first. **Later** items are blurry on purpose; each says what would move
it closer.

Raw source: [[general-ideas]]. Vocabulary: `GLOSSARY.md`. Area maps:
[[Visibility-moc]], [[Requirements-moc]].

## North star

Members keep coming back to study _together_, in shared Sessions. Every other
view — Visibility, Review, Plan — exists to feed that one experience.

## Now: the redesign

The new frontend lives in the `/beta` route and reads/writes through the backend
the surviving specs describe:

- [[ST-5 Tasks]] / [[Tasks spec]] — the private `task` table.
- [[ST-9 Discord daily leaderboard]] — the bot board (shipped).
- [[Daily totals]] — the stored per-Day record everything else sums over.

## Next: needs one owner session first

- **Wire the redesign dashboard to live data.** The `/beta` screen runs on
  placeholders today; the backend it needs (Tasks ST-5, Daily totals ST-11, the
  Period boards ST-12) is built. The web Period board's metric switch is
  decided — see the Decided list in [[Weekly and monthly leaderboard]] — so the
  remaining work is the authenticated read plus swapping every fixture to
  `api.*`.
- [[Streak]] (ST-14): parked behind the calendar — the `/beta` month calendar
  already shows a streak token; revisit only if it feels worth it live.

## Later: parked, blurry on purpose

- **Consistency heatmap (ST-13).** The `/beta` month calendar replaces it for
  now; revisit the year-at-a-glance view only if members ask. Its
  `dailyTotals.listMine` data design survives as the calendar's data source.
- **Common pomodoro timer.** Known to work with these members ("things I just
  know work"); it feeds the Sessions north star directly. Would move closer once
  the Session-feel design grills settle what a session looks like — the shared
  timer is part of that answer, not a bolt-on.
- **Visibility period boards on the web.** The [[Weekly and monthly leaderboard]]
  web board exists on `/beta` as the consistency board; the Review-view home for
  it is still parked until that view exists.
- **Planning (planned Sessions, Task carry-over, Day columns, retrospective).**
  Needs Session feel first, plus a "Task has a Day" decision — Tasks are scoped
  by `_creationTime` today.
- **Customization (backgrounds, themes), non-study activities, points/rewards,
  Witness and Symbiosis surfaces.** Off the proven axis or without evidence;
  each unlocks only if members ask.
- **Multi-day timeline scroll.** [[Multi-day scroll]] — days side by side,
  HEY-style, each a repeat of the night-plus-core unit. A re-architecture, not a
  ticket: it retires "one day fits the laptop" and collides with the drag
  gestures. Prototype before speccing.

## Re-read this when

- The `/beta` frontend is hooked into the backend and in front of members.
- The heatmap has been out for a couple of weeks.
