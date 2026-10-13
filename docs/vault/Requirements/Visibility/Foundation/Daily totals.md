---
id: ST-11
status: in-review
type: requirement
priority: A
area: requirements
---

# ST-11 Daily totals

One stored row per member per closed Day: their Study time, Deep focus and Total
time. Weekly and monthly boards, the heatmap and the Streak all become cheap,
bounded reads over these rows instead of rescans of raw partials.

Map: [[Visibility-moc]]. Chapter: [[Foundation-moc]]. Vocabulary: `GLOSSARY.md`
(Day, Daily total, Study time, Deep focus, Total time). First consumer:
[[Weekly and monthly leaderboard]].

## Problem Statement

Every number studytrack shows today is computed live from raw `sessionPartial`
rows, and only for today. `groupTodaysMembers(ctx, dayStart)`
(`packages/backend/convex/sessions/service.ts`) reads partials with
`startedAt >= dayStart`, capped at `.take(1000)`, plus active partials. It has no
end bound and does not clip partials to the day.

Stretching that read to a week or a month fails three ways:

1. **Silent truncation.** A month of partials goes past the 1000 cap and the
   read just stops early, with no error.
2. **Cost.** The bot polls every minute with a new `now`, so Convex never caches
   the result. Each poll would rescan the whole month.
3. **Wrong boundaries.** A partial that crosses midnight counts in full on the
   day it started.

## Solution

Add a `dailyTotal` table that a cron keeps current. Each closed Day is computed
once from raw partials, with every partial and session clipped to that Day. The
cron recomputes the last two closed Days each run, because the stale-session
sweep can change recent data after the fact. A one-off backfill fills in every
past Day. Readers sum the rows instead of rescanning partials.

## User Stories

1. As a member, I want my past study kept as per-day totals, so that weeks, months and my own history can be shown.
2. As a member, I want a session that crosses midnight split between the two Days, so that each Day gets the time actually studied in it.
3. As a member, I want a Pause never to count as Study time or Deep focus, so that totals match the dashboard.
4. As a member, I want my manual and Discord time combined in one row, so that I am one person in every total.
5. As a member, I want the study I did before this feature existed included, so that my history doesn't start on launch day.
6. As the operator, I want rolling up a Day to be idempotent, so that re-running it never double-counts.
7. As the operator, I want a stale session that is closed late to correct the totals within the hour, so that the numbers settle on their own.
8. As the operator, I want a read that would truncate to throw instead, so that a wrong number is never shown quietly.
9. As a maintainer, I want the clipping and day-boundary math in pure functions, so that DST and midnight edge cases are unit-tested.

## Implementation Decisions

- **Decided — new domain `dailyTotals`.** Follow `.agents/skills/domain-workflow`.
  Use a thin `dailyTotals.ts` for the registered internal functions, plus
  `dailyTotals/service.ts`, `dailyTotals/types.ts` and `dailyTotals/util.ts`.
- **Decided — schema.** Add a table `dailyTotal` with these fields:
  `memberKey: v.string()`, `discordId: v.optional(v.string())`,
  `userId: v.optional(v.id('users'))`, `dayStart: v.number()`,
  `studyMs: v.number()`, `deepFocusMs: v.number()` and `totalMs: v.number()`.
  Add two indexes: `by_dayStart: ['dayStart']` and
  `by_memberKey: ['memberKey', 'dayStart']`.
- **Decided — member key.** Use the rule `groupTodaysMembers` already uses:
  `session.discordId ?? String(session.userId)`. Manual sessions already carry
  the user's `discordId` (`tracking/service.ts`), so a member gets one key.
- **Decided — what counts toward each metric.** Study time is every
  non-`break` partial. Deep focus is the `camera` and `cameraAndScreenShare`
  partials, using `isDeepFocus` from `leaderboard/util.ts`. Total time is the
  session span with Pauses included. All three use the same definitions as the
  live dashboard and the bot.
- **Decided — clipping.** Each partial and each session span is clipped to
  `[dayStart, dayEnd)`. An `active` partial or session ends at `dayEnd` for this
  calculation, because rollups only run on closed Days. Add a pure
  `overlapMs(start, end, windowStart, windowEnd)` helper to `dailyTotals/util.ts`.
- **Decided — finding the partials for a Day.** Read `sessionPartial.by_startedAt`
  over `[dayStart - 12h, dayEnd)`. No partial can be longer than about 9 hours:
  the hourly stale sweep closes partials older than 8 hours. Load each owning
  session with `ctx.db.get` to get its span. Every session that overlaps the Day
  has at least one partial that overlaps it, because Pauses are partials too.
- **Decided — bounded reads.** Cap the partials read at `.take(5000)` per Day.
  If the cap is hit, throw `Error('dailyTotals: day too large to roll up')`. Do
  not truncate silently.
- **Decided — day math.** Add pure helpers next to `startOfDay` in
  `sessions/util.ts`:
  - `nextDayStart(dayStart, tz)` returns `startOfDay(dayStart + 36h, tz)`.
  - `previousDayStart(dayStart, tz)` returns `startOfDay(dayStart - 12h, tz)`.
  - `startOfWeek(now, tz)` returns Monday 00:00.
  - `startOfMonth(now, tz)` returns 00:00 on the 1st.

  All four are DST-safe and shared by the bot and the web.

- **Decided — `rollupDay(ctx, dayStart)`** (internal mutation):
  - Refuse a Day that is not closed: `Date.now() < dayEnd`. Mutations may read
    the clock; queries may not.
  - Delete every `dailyTotal` row for that `dayStart`, then insert one row per
    member with a non-zero total. This delete-then-insert makes it idempotent.
- **Decided — cron.** Add
  `crons.cron('roll up daily totals', '1 * * * *', internal.dailyTotals.rollupRecent)`
  to the existing `crons.ts`. `rollupRecent` rolls up yesterday and the Day
  before. Zurich's offset is a whole number of hours, so minute 1 of every UTC
  hour lands one minute after Zurich midnight. Re-rolling two Days absorbs late
  stale-session closes.
- **Decided — backfill.** Add an internal mutation `backfill({ dayStart? })`.
  With no argument, it starts at the Day of the earliest partial
  (`by_startedAt`, `.first()`). Each call rolls up one Day and then uses
  `ctx.scheduler.runAfter(0, …)` to schedule the next Day, stopping at
  yesterday. Run it once after deploy with
  `npx convex run dailyTotals:backfill`.
- **Decided — read helper for consumers.** Add
  `sumDailyTotals(ctx, fromDayStart, toDayStart)` to the service. It reads
  `by_dayStart` over `[from, to)` with `.take(10000)`, throws if the cap is hit,
  and returns per-member sums `{ memberKey, discordId, userId, studyMs,
deepFocusMs, totalMs }`.
- **Decided — no public functions in this ticket.** Everything here is
  `internal*`. Consumers (ST-12, ST-13) add their own authenticated reads.

## Testing Decisions

Test external behaviour at the Convex boundary with `convex-test`, the way
`leaderboard.test.ts` does: set up partials, run `rollupDay`, then assert the
rows. Cover these cases:

- One ended camera partial gives Deep focus = Study time = its length.
- A Pause partial adds to Total time only.
- A partial from 23:30 to 00:30 Zurich is split 30 + 30 minutes across two Days.
- An `active` partial is counted up to `dayEnd`.
- Running `rollupDay` twice gives the same rows (idempotent).
- A Day that is not closed is refused.
- Manual and voice partials for the same `discordId` produce one row.
- A member with only Pause time gets no row.
- A DST Day: 2026-03-29 is 23 hours long and 2026-10-25 is 25 hours long.

Test the day helpers and `overlapMs` with plain Vitest, alongside
`sessions/util.test.ts`. Include both DST transitions, Monday weeks and month
starts.

`backfill` and the cron wiring are not unit-tested. Run `backfill` once on a dev
deployment and spot-check a known Day against the dashboard.

## Acceptance Criteria

_Implemented on `st-11-12`, merged into `integration`; backend suite green (115
tests). Deploy and backfill items stay open until the prod rollout._

- [ ] `dailyTotal` table and indexes deployed.
- [x] `rollupDay`, `rollupRecent`, `backfill` and `sumDailyTotals` implemented
      and tested as above.
- [ ] Cron registered. On dev, after midnight, yesterday's rows appear within a
      minute.
- [ ] Backfill run on prod. For a sampled past Day, the rows match that Day's
      dashboard totals within a minute per member.
- [x] `pnpm format:check`, `pnpm lint`, `pnpm typecheck` and
      `pnpm --filter @studytrack/backend test` pass.

## Out of Scope

- Any UI or bot change. That is [[Weekly and monthly leaderboard]].
- Weekday × hour aggregates. They are parked, see [[Visibility-moc]].
- Rolling up Tasks.
- Per-user timezones. Every Day is Europe/Zurich.

Blocked by: nothing. Unblocks [[Weekly and monthly leaderboard]],
[[Consistency heatmap]] and [[Streak]].
