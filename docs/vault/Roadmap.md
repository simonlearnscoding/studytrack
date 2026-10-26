---
type: moc
---

# Roadmap

**In short:** the live push is the **Focus view** — the new dashboard at `/`,
over the existing Convex backend. The backend domain it reads (Tasks, Daily
totals, the Discord board, Sessions) is specified under
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

## Now: the Focus view

The Focus view lives at `/` and reads/writes through the backend the surviving
specs describe:

- [[ST-5 Tasks]] / [[Tasks spec]] — the private `task` table.
- [[ST-9 Discord daily leaderboard]] — the bot board (shipped).
- [[Daily totals]] — the stored per-Day record everything else sums over.

The planning arc shipped (ST-31 → [[ST-35 Plan groups in the task view]]): a plan
block has an optional name and an editable window, holds Tasks through a plan
assignment, and appears in the task pane as a foldable group. The pane reads live
plan → unassigned queue → upcoming plans → Done (ADR-0014), and Now leads with the
live plan (ADR-0011 as amended).

## Next: needs one owner session first

- **Carry-over and re-planning.** An unfinished Task stays on its Day. The only
  deliberate Day moves today are "schedule for today" on a past Day and picking a
  Task into a plan block (which moves it to the block's Day); there is no
  plan-tomorrow and no way to move a Task to another Day from the row. The open
  questions are in [[Tasks — planning mechanics to decide]]: manual or automatic,
  whether a "carried over" mark or slip history is kept, and how an overdue plan
  is surfaced. The schema already supports the move (`tasks.reschedule`); the
  design does not.
- [[Streak]] (ST-14): parked behind the calendar — the month calendar already
  shows a streak token; revisit only if it feels worth it live.

## Later: parked, blurry on purpose

- **Consistency heatmap (ST-13).** The month calendar replaces it for
  now; revisit the year-at-a-glance view only if members ask. Its
  `dailyTotals.listMine` data design survives as the calendar's data source.
- **Common pomodoro timer.** Known to work with these members ("things I just
  know work"); it feeds the Sessions north star directly. Would move closer once
  the Session-feel design grills settle what a session looks like — the shared
  timer is part of that answer, not a bolt-on.
- **Visibility period boards on the web.** The [[Weekly and monthly leaderboard]]
  web board is the Focus view's consistency board; the Review-view home for it is
  still parked until that view exists.
- **Planning beyond the Day (Day columns, retrospective).** Tasks are Day-scoped
  now (`plannedAt`) and carry-over is the next owner session; the kanban-style
  Day columns and a per-Session retrospective still need Session feel first.
- **Customization (backgrounds, themes), non-study activities, points/rewards,
  Witness and Symbiosis surfaces.** Off the proven axis or without evidence;
  each unlocks only if members ask.
- **Me board.** A leaderboard of your own Weeks, not other members — most
  efficient Week, this Week against your best. See [[Consistency-moc]]. Tests
  whether Consistency can wear the board shape without becoming Standing.
- **Multi-day timeline scroll.** [[Multi-day scroll]] — days side by side,
  HEY-style, each a repeat of the night-plus-core unit. A re-architecture, not a
  ticket: it retires "one day fits the laptop" and collides with the drag
  gestures. Prototype before speccing.

## Re-read this when

- The Focus view is fully live (no placeholders) and has been in front of members.
- The heatmap has been out for a couple of weeks.
