---
id: ST-28
status: done
type: requirement
priority: A
area: requirements
---

# ST-28 Month calendar with real data

**In short:** make the `/beta` month calendar a real calendar. It shows a viewed
month in a Monday-first grid, pages backward and forward with two arrows, and
colours each day from the signed-in member's Daily totals using the site
focus/total metric. Today's cell includes live time. Paging the calendar does not
move the Focus day (the board and task list stay put); clicking a day does. The
mock heat, month label and streak go away.

Map: [[Requirements-moc]]. Chapter: [[Consistency-moc]]. Vocabulary: `GLOSSARY.md`
(Focus day, Daily total, Deep focus, Total time, Study time). Related:
[[Consistency heatmap]] (ST-13), [[Streak]] (ST-14), [[Period boards follow the
focus day]] (ST-26).

## Problem Statement

The month calendar on the redesigned dashboard (`/beta`) is still a mock. It
always says "October", renders a fixed 31-cell strip with no weekday alignment,
shows a fake "6d streak", and paints fake heat that never changes. Selecting a
day changes the board and the task list, but the calendar itself never tells a
member whether they actually studied on the days they are looking at.

There is no way to page to another month. The real record is already stored as
Daily totals, and the calendar is the surface that is supposed to show it.

## Solution

Turn the card into a real month grid and then connect it to the member's own
Daily totals.

- **Real grid.** The calendar shows the viewed month, Monday first, with blank
  cells before the 1st and after the last day. The month label reads
  `October 2026`. The viewed month is independent of the Focus day, so the board
  and task list keep describing the selected day while the calendar pages.
- **Navigation.** Two arrow buttons sit to the right of the month label. Paging
  moves only the viewed month; the Focus day, the board and the task list stay
  put. Clicking a day moves the Focus day. The header's Today action moves both
  the Focus day and the viewed month to today.
- **Real heat.** Each day cell shows the member's Daily total under the site-wide
  metric switch: focus means Deep focus, total means Total time. Today's cell
  includes the live value of the running Day. Days with no study are neutral.
- **No streak.** The mock streak is removed. A real streak is [[Streak]] (ST-14)
  and is not part of this calendar.
- **Future days.** Days after today have no heat fill and keep the dashed day
  style. The final future-day treatment is deferred; this is the interim.

Ship in three independently shippable slices:

1. Real month grid, month label, neutral cells, streak removed.
2. Back and forward month navigation.
3. Live Daily totals and today's live cell, with the metric switch.

Only slice 3 changes the backend.

## User Stories

1. As a member, I want the calendar to show the month containing the Focus day, so that the calendar, the board and the task list agree on which month I am viewing.
2. As a member, I want the grid to start on Monday, so that the week reads the same way as the rest of the dashboard.
3. As a member, I want blank cells before the 1st and after the last day, so that each date sits under its real weekday.
4. As a member, I want the correct number of days for the month, so that February, leap years and 30-day months are not wrong.
5. As a member, I want the month label to include the year, so that I know which year I am looking at when I page.
6. As a member, I want the Focus day marked in the grid, so that I can see which day the board and tasks are describing.
7. As a member, I want to click a day and have the board and task list follow it, so that browsing history changes the whole page.
8. As a member, I want a back arrow, so that I can look at last month.
9. As a member, I want a forward arrow, so that I can return to this month or look ahead.
10. As a member, I want paging the calendar to leave my selected day alone, so that browsing a month does not change the board or the task list.
11. As a member, I want clicking a day to move the board and task list, so that history browsing changes the whole page only when I choose a day.
12. As a member, I want the Today action to return both the calendar and the board to today, so that "today" means today everywhere.
13. As a member, I want the month label and grid to change together when I page, so that the header never describes a different month from the squares.
14. As a member, I want the calendar to follow the site focus/total switch, so that the calendar and the board show the same metric.
15. As a member, I want focus to mean Deep focus in the calendar, so that the word means the same thing everywhere.
16. As a member, I want total to mean Total time in the calendar, so that breaks and the full sitting are counted.
17. As a member, I want today's cell to include my live Study time, so that the calendar reflects the session I am in right now.
18. As a member, I want today's cell to use the same Deep focus / Total rules as the leaderboard, so that the two surfaces never disagree.
19. As a member, I want past days to come from my stored Daily totals, so that the record is stable and correct.
20. As a member, I want a day with no study to be neutral, so that absence is distinguishable from low study.
21. As a member, I want a day with study to use the fixed colour buckets, so that a colour means the same amount of study forever.
22. As a member, I want the buckets to be 0, under 30m, 30m–1h30, 1h30–3h and 3h or more, so that the calendar matches the parked Consistency heatmap's scale.
23. As a member, I want the calendar to be private, so that only I can see my own history.
24. As a signed-out visitor, I want neutral cells rather than an error or another member's data.
25. As a member with an empty month, I want a calm empty grid, not a fake heat pattern.
26. As a member, I want the grid to keep a stable height between months, so that the card does not jump while I page.
27. As a member, I want future days to have no heat colour, so that the calendar does not claim study that has not happened.
28. As a member, I want future days to keep the dashed day style for now, so that they are visually distinct while the final treatment is decided.
29. As a member, I want the arrows and day cells to be operable by keyboard and screen reader, so that the calendar is usable without a mouse.
30. As a member, I want the calendar's loading state to show the grid without fake colours, so that I never see invented data.
31. As a maintainer, I want the month window and grid to be derived with the shared Europe/Zurich date helpers, so that DST and the timezone stay in one place.
32. As a maintainer, I want the query to receive every timestamp as an argument, so that it never reads the wall clock.
33. As a maintainer, I want the calendar read to return all values for the metric switch in one call, so that switching focus/total does not refetch.
34. As a maintainer, I want the mock calendar fixtures deleted, so that there is no second source of truth.
35. As a maintainer, I want the calendar's pure grid and bucket rules covered by plain Vitest, so that the non-trivial date maths is pinned down without a browser.
36. As a maintainer, I want the private Daily totals read covered with `convex-test`, so that auth, ownership and the live-today merge are proven at the function boundary.
37. As a maintainer, I want slice 1 and slice 2 to ship without backend changes, so that the layout and navigation can land before the data work.
38. As a maintainer, I want the parked ST-13 `listMine` read left alone, so that the year heatmap's Study-time contract is not silently changed.

## Implementation Decisions

**Vocabulary.** The calendar is a view of **Daily totals** for the **Focus day's
Month**. A **Focus day** is the selected Day, today by default. **Deep focus** and
**Total time** are the two site metrics; **Study time** is the parked ST-13
heatmap's metric. The calendar cell is a view of one Daily total, not a new
domain object.

**Metric.** The calendar follows the existing site metric switch. `focus` =
`deepFocusMs`, `total` = `totalMs`. The empty bucket is `0`, the fixed buckets are
under 30 minutes, 30 minutes–1h30, 1h30–3h, and 3h or more, and they are applied
to whichever metric is selected. The calendar is private, so there is no ranking
or comparison.

**Divergence from ST-13.** The parked ST-13 year heatmap encodes Study time. The
`/beta` month calendar follows the site focus/total switch instead. ST-13 stays on
Study time; this note is the `/beta` contract. Do not change `dailyTotals.listMine`
for this work.

**Slices.** The ticket is delivered in three independently shippable slices:

1. **Grid.** Replace the mock month/heat/streak with a real month grid, the month
   label, neutral cells, and no streak. No backend change. The header has room
   for the arrows but slice 1 does not need them.
2. **Navigation.** Add the previous/next month arrows and move only the viewed
   month as described below. No backend change.
3. **Live data.** Add the calendar Daily totals read, colour the cells, include
   today's live value, and follow the metric switch. This is the only slice that
   changes the backend.

**Month grid.** The grid is a fixed six-week, Monday-first grid of 42 cells. The
first cell is the Monday on or before the month's first Day, derived with the
shared Week helper. Cells outside the month are blank and non-interactive. The
fixed height keeps the card from jumping between five- and six-week months. The
month label is the viewed month and year in the shared Europe/Zurich timezone,
e.g. `October 2026`. The week starts Monday, matching the existing weekday
header.

**Navigation.** The viewed month is separate state from the Focus day. The arrows
move the viewed month by one calendar month via the shared month helpers, not by
adding a fixed 30 days to the browser Date. The Focus day does not move, so the
board, the task list and the header date keep describing the selected day.
Clicking a day writes the Focus day; the viewed month stays where it is. Paging
back to the current month does not snap to today. The header's Today action sets
both the Focus day and the viewed month to today. The timeline stays on today
(out of scope). The arrows have accessible labels ("Previous month", "Next
month").

**Data read.** Add one authenticated Daily totals read for the calendar. It takes
the month window start/end and the caller's `now` (all epoch ms, Europe/Zurich
boundaries), resolves the caller's member key using the existing
`discordId ?? String(userId)` rule, and returns one row per Day in
`[fromDayStart, toDayStart)` with `deepFocusMs` and `totalMs`. Days with no study
may be omitted; the client treats a missing Day as zero.

When today's Day is inside the window, the read merges one live row for today,
computed from today's Sessions and partials with the same Deep focus and Total
rules the leaderboard uses, clipped to `[todayDayStart, now)`. The live row is
not written to `dailyTotal`; it is a read-time merge. The read is bounded to one
month plus the live row, returns an empty list when unauthenticated, and never
returns another member's rows. It receives every timestamp as an argument and
never reads the wall clock. The existing `listMine` query is untouched.

**Client shape.** A calendar hook owns the viewed month, the read, and the metric
mapping. It returns the month label, the 42 cells, and the previous/next/select
actions. A pure helper builds the 42 cells from the month start, today's Day,
the Focus day and the Daily totals, marking each cell as in/out of month, Focus,
today, future, and its bucket. The cell shape is:

```text
MonthCell = {
  dayStart: number
  dayOfMonth: number
  inMonth: boolean
  isFocus: boolean
  isToday: boolean
  isFuture: boolean
  bucket: 0 | 1 | 2 | 3 | 4
}
```

The helper is the presentation seam; it does not read the clock, the DB or the
metric store.

**Date and bucket helpers.** Use the existing `/beta` date helpers for
`startOfDay`, `startOfMonth`, `nextMonthStart`, `startOfWeek` and the Europe/Zurich
timezone. Do not reimplement DST or local-midnight maths with `Date.setMonth` or
the browser's local timezone. The bucket boundaries are fixed and shared by both
metrics.

**Header and card.** The month label is top-left. The two arrow buttons are
top-right. The mock streak is gone. The card keeps its existing surface and
responsive placement. The day buttons keep the existing selected-ring treatment
for the Focus day when it falls inside the viewed month. Today is not separately
marked in this slice; the Focus ring and the future treatment are the only day
states.

**Future days.** A Day after today's Day has no heat fill and keeps the dashed
border/number style. This is an interim treatment; the final decision is
deferred. Days in a future month are therefore all unheated.

**Loading and empty.** The grid and month label render immediately from the date
maths. While the Daily totals read is loading, cells are neutral; no mock heat is
used. A month with no rows is neutral. Signed-out callers get an empty read and
neutral cells, not an error.

**Accessibility.** Arrows and day cells are real buttons with accessible names;
the day label includes the day number and the month context. Blank cells are not
focusable. The grid remains keyboard-operable in DOM order.

**Remove the fixtures.** Delete the mock month name, heat array, streak and
today index from the `/beta` today fixtures and their component props. The real
grid, label and data replace them; there is no second source of truth.

## Testing Decisions

A good test asserts external behaviour: given seeded users, Daily totals and
today's Sessions, and a Focus day, what the calendar read returns and what cells
the pure grid builder produces. It never asserts internal calls or raw row
shapes beyond the contract.

**Seam 1 — the calendar Daily totals read (one Convex function).** Use
`convex-test`, following the existing `dailyTotals` and `leaderboard` tests.
Cover:

- unauthenticated callers get an empty list;
- only the caller's rows are returned, including the manual-only member key;
- the month window is half-open and excludes other months;
- a Day with no study is absent and behaves as zero;
- today's live Deep focus and Total are merged when today is inside the window;
- today's live row is absent for a past or future month;
- the live values use the same Deep focus/Total rules as the leaderboard;
- the read is bounded and does not throw on a normal month;
- the existing `listMine` still returns its Study-time contract unchanged.

**Seam 2 — the pure month-grid and bucket helper.** Use plain Vitest, alongside
the existing session/timeline date-helper tests. Cover:

- Monday-first leading blanks and trailing blanks;
- exactly 42 cells and the correct Day starts;
- February, leap year and a 30-day month;
- a DST month in Europe/Zurich;
- Focus, today and future flags for days in, before and after the month;
- missing Daily totals become bucket 0;
- the bucket boundaries 0, 29m59s, 30m, 1h29m59s, 1h30, 2h59m59s, 3h;
- the same buckets for both metrics.

Do not add React component tests; the web has no component-test setup and the
hook is a thin facade over the query, the metric store and the pure helper. The
board-already-follows-the-Focus-day behaviour is covered by ST-26 and is not
retested here.

## Out of Scope

- **The streak.** Remove it from the calendar; do not build [[Streak]] (ST-14),
  settle its threshold, or add a streak surface anywhere.
- **The year heatmap and the `/review` route.** [[Consistency heatmap]] (ST-13)
  stays parked, including its Study-time metric and 53-week grid.
- **The timeline following the Focus day.** It stays on today.
- **Cell tooltips, hover detail, a day-detail panel, or a session log.** The
  calendar only selects a Day.
- **A special future-day treatment beyond the interim no-heat/dashed style.**
- **A separate metric control in the calendar.** It uses the existing site switch.
- **Month pickers, year jumps, keyboard shortcuts beyond the two arrows and the
  normal button activation.**
- **Mobile layout redesign.** The existing card placement and responsive rules
  stay.
- **Changes to `dailyTotals.listMine` or the parked ST-13 contract.**
- **Other members' calendars, room data or ranking.** The calendar is private.
- **Schema changes or a migration.** The read uses the existing `dailyTotal`
  rows and the existing Sessions.

## Further Notes

- **ST-13 conflict.** That note says its heatmap encodes Study time. The `/beta`
  calendar follows the site focus/total metric instead. Keep the two surfaces
  separate; if ST-13 is revived, it can reuse the Daily totals storage with its
  own Study-time read.
- **ST-26 hand-off.** ST-26 deliberately left the calendar's live heat and month
  navigation out of scope. This note is that follow-up.
- **The Focus day is already shared.** The consistency board and task list read
  it today, so the calendar only has to change the same date store; no new
  cross-surface wiring is needed.
- **The live today row is read-time only.** Do not insert a `dailyTotal` row for
  today; the rollup owns closed Days.
- **Deployment.** No schema or infrastructure change. The existing web deploy is
  enough; the live read ships with the backend deploy.
