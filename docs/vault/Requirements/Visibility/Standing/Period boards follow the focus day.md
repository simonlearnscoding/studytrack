---
id: ST-26
status: todo
type: requirement
priority: A
area: requirements
---

# Period boards follow the focus day

#ready-for-agent

**In short:** the redesigned dashboard's consistency board becomes live, and its
Week and Month columns follow the day you select in the month calendar — clicking
a day that is not in the current week shows that day's week instead. Agent detail
follows.

Map: [[Visibility-moc]]. Chapter: [[Standing-moc]]. Extends the "Web Period
board" section of [[Weekly and monthly leaderboard]] (ST-12). Vocabulary:
`GLOSSARY.md` (Day, Period, Daily total, Deep focus, Total time).

## Problem Statement

The consistency board on the redesigned dashboard (`/beta`) is placeholder data:
its rows are baked-in fixtures, so the numbers never move and never match what the
room actually did. Worse, selecting a day in the month calendar changes only a
highlight and a header label — the board and the rest of the page keep showing
"today", no matter which day is picked. A member who looks back at last Tuesday
sees nothing change.

The backend already stores what the board needs, and the Discord bot already
renders the same three boards from it. Only the web has not been connected, and
the query is hard-wired to "the current period", so it cannot answer "the week of
some other day".

## Solution

Wire the board to the stored Daily totals and make its periods a function of a
**focus day** — the day the member has selected (today by default).

- The Week column shows the Week containing the focus day; the Month column shows
  the Month containing the focus day.
- Today's still-running sessions are merged into a board only when that board's
  period contains today, so the current week/month stay live and past or future
  periods are stable sums.
- The Discord bot keeps focusing today and behaves exactly as it does now.

This is the first, smallest slice of "wire the redesign dashboard to live data"
named on the [[Roadmap]]: the board only. The calendar, timeline and the rest of
`/beta` keep their fixtures in this slice.

## User Stories

1. As a member, I want the consistency board to show real study time, so that
   what I see matches what actually happened in the room.
2. As a member, I want to click a day in the month calendar and have the board
   show that day's week, so that I can look back at a past week.
3. As a member, I want the board's month column to follow the selected day's
   month, so that the calendar and the board never disagree about which period
   they describe.
4. As a member looking at the current week, I want my in-progress session to
   count toward this week and this month as it happens, so that the board feels
   live.
5. As a member looking at a past week, I want no live or "online" noise, so that
   history is stable and does not change under me.
6. As a member looking at a future period, I want an honest empty board, not an
   error or stale numbers.
7. As a member, I want each row to wear the same avatar, initials and colour as
   the room rail, so that the same person is recognisable everywhere.
8. As a member, I want my own row marked "you", so that I can find myself
   quickly.
9. As a member, I want the case-deep-focus-vs-total metric switch to keep
   leading the board with live data, so that the switch I already have keeps
   working.
10. As a member, I want the web board ranked the same way the Discord boards are
    (primary metric, then the other), so the two never disagree about who is
    ahead.
11. As a member arriving on the dashboard with nothing selected, I want the board
    to show the current week and month, so that the default is unchanged.
12. As a member who selects a day inside the current week, I want the board to
    stay on the current week, so that clicking around does not jump to a
    different period.
13. As a member with no Discord identity (a manual tracker), I want my row to
    still appear on the board.
14. As a signed-out visitor, I want an empty board rather than an error or
    another member's data.
15. As the operator, I want the Discord bot's three boards to keep their current
    behaviour and cost, so that this change does not regress the channel.
16. As the operator, I want one Convex call per board read, so that the dashboard
    stays cheap.
17. As a maintainer, I want one query contract meaning "the boards for a focus
    day", used by both the web and the bot, so that there is a single place the
    period maths lives.
18. As a maintainer, I want the query to take every timestamp as an argument and
    never read the wall clock, so that it stays deterministic and cacheable.
19. As a maintainer, I want the period boundaries derived by the existing shared
    date helpers, so that DST and the Europe/Zurich timezone keep being handled
    in one place.
20. As a maintainer, I want the fixtures for the board deleted once the live read
    exists, so that there is no second source of truth.

## Implementation Decisions

- **One contract: "boards for a focus day".** The viewer board query's arguments
  become a focus day start (epoch ms, the Europe/Zurich midnight of the selected
  day) plus `now`. The service derives everything else: today's day start from
  `now`, and the focus day's Week and Month windows from the existing start
  helpers. The query still reads no wall clock.
  - Window shape (decision-rich, inline):
    `{ dayStart, weekStart, weekEnd, monthStart, monthEnd }`, each a Europe/Zurich
    boundary; windows are half-open `[start, end)`.
  - The bot's board read keeps its shared-secret gate and passes the focus day =
    today, so its behaviour is unchanged. The viewer read keeps the Clerk identity
    gate (and the existing dev bypass) and returns empty boards when
    unauthenticated.
- **Each list is a sum over its window.** A list = the Daily totals in
  `[start, end)`, merged with today's live totals **only if that window contains
  today's day start**. Past and future windows are pure sums; future windows are
  naturally empty.
- **The focus day drives both columns.** The Week column uses the focus day's
  week window; the Month column uses the focus day's month window. Selecting a
  day inside the current week leaves both on the current period.
- **Live "today" is a slow client tick.** The web supplies `now` from a
  once-a-minute clock so the current period's live minutes update without
  refetching every second.
- **Rows reuse the existing ranking.** Ranking stays primary metric then the
  other, exactly as the Discord boards, capped as today. The web's metric switch
  maps straight onto the returned focus/total millisecond figures.
- **The board renders the live read.** Replace the board fixtures with a live
  read keyed on the focus day. Drop the `streak` field — the board never renders
  it.
- **Avatars reuse the room rail's helpers.** Initials and the stable per-person
  colour are the same helpers the room rail already uses; they are shared rather
  than re-implemented.
- **"You" comes from the current user.** The board marks the row whose member
  key matches the signed-in user.
- **The focus day is derived from the selected date.** The existing selected-date
  state is converted to a Europe/Zurich day start with the shared helper, rather
  than trusting the browser's local midnight.

## Testing Decisions

- A good test here asserts **external behaviour**: given seeded Daily totals and
  today's Sessions, and a focus day, the query returns the right ranked lists —
  never the internals of the window maths.
- **One seam: the board query.** Test it with `convex-test`, the same way as the
  existing leaderboard tests. Cover:
  - a focus day in the **current** week — Week and Month include today's live
    minutes;
  - a focus day in a **past** week of the current month — Week is a pure sum, the
    Month still includes today's live minutes;
  - a focus day in a **past** month — both are pure sums;
  - a **future** focus day — empty lists, no error;
  - **bot parity**: with focus = today, the bot lists equal the viewer lists for
    the same seeded data.
- The focus-day window derivation (week/month starts and ends) is covered by
  plain Vitest alongside the existing date-helper tests, including a DST week.
- Existing leaderboard tests migrate to the new argument shape rather than being
  duplicated; the same behaviour keeps its coverage.

## Out of Scope

- **The day timeline following the focus day.** That read is today-only by
  construction and needs its own bounded rewrite; it stays on today in this
  slice.
- **Calendar month navigation and a live heat grid.** The calendar keeps showing
  the current month with its placeholder heat; browsing other months, and
  rendering the month from real Daily totals, is a separate ticket.
- **Every other `/beta` fixture** (tasks, hero, presence) — only the board is
  wired here.
- **A streak surface.** The board never showed one; the parked [[Streak]] work is
  untouched.
- **Browsing past Periods on Discord.** The bot still only shows the current
  three.
- Deployment.

## Further Notes

- **Vocabulary to add to `GLOSSARY.md`:** _Focus day_ (the selected Day the
  dashboard is focused on; today by default) and _Viewed Period_ (the Week or
  Month containing the focus day, which the board shows). These are distinct from
  the current Week/Month.
- **Cache-safety:** because every argument is explicit, Convex can reuse the
  query across identical focus days; only `now` churns, once a minute.
- **Superseded wording:** ST-12's "Web Period board" section describes the board
  as the current Week and Month; this ticket generalises it to the focus day.
