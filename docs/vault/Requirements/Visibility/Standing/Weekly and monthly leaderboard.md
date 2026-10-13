---
id: ST-12
status: in-review
type: requirement
priority: A
area: requirements
---

# ST-12 Weekly and monthly leaderboard

The Discord board grows from one embed to three: **Today**, **This week** and
**This month**. All three sit in one message that the bot edits in place every
minute. This is **Standing**: it compares members over a Period and never shows
a member's own history.

Map: [[Visibility-moc]]. Chapter: [[Standing-moc]]. Extends
[[ST-9 Discord daily leaderboard]]; metric from [[ST-7 Leaderboard by Deep focus]].
Vocabulary: `GLOSSARY.md` (Period, Daily total, Deep focus, Total time).

## Problem Statement

The Discord board only shows today, and it resets at midnight. In the owner's
previous app, these same members were visibly more motivated once the board also
had a weekly and a monthly view. A daily board rewards one good day. A weekly or
monthly board rewards showing up again and again, and gives a member who missed
today a race they can still win.

## Solution

Replace the bot's single "today" query with one query that returns three ranked
lists in one round trip: Today, the current Week and the current Month. The Week
and Month lists are past Daily totals ([[Daily totals]]) plus today's live time.
The bot renders the three lists as three embeds in one message and keeps the
existing clear / post / edit / self-heal loop.

## User Stories

1. As a member, I want to see this week's standings beside today's, so that one bad day doesn't take me out of the race.
2. As a member, I want this month's standings too, so that showing up steadily over weeks is rewarded.
3. As a member, I want the week to reset on Monday and the month on the 1st, so that each Period is a fresh, nameable race ("this week", "October").
4. As a member, I want all three boards visible at once, so that I never wait for a rotation to see the one I care about.
5. As a member, I want my live session to count toward the week and month as it happens, so that the boards feel as live as the daily one.
6. As a member, I want all three ranked the same way (Deep focus, then Total time), so that the boards never disagree about what counts.
7. As a member, I want the week's title to show its dates and the month's title to show its name, so that I know which Period I'm looking at.
8. As a member, I want an empty-state line per board, so that Monday morning's empty week is not confusing.
9. As a member, I want the 🟢 online marker only on Today, so that the longer boards stay calm.
10. As a member, I want a session that crosses midnight split between the two Days, so that the Today board and the Week board agree.
11. As the operator, I want one Convex call per minute, not three, so that the bot stays cheap.
12. As a maintainer, I want the three-embed rendering to stay a pure function, so that it is tested without Discord.

## Implementation Decisions

- **Decided — Periods are calendar-aligned.** The Week is Monday 00:00 to now
  and the Month is the 1st 00:00 to now, both Europe/Zurich, using `startOfWeek`
  and `startOfMonth` from [[Daily totals]]. They are not trailing windows: the
  reset is the motivating moment, and only a calendar Period can have a name. On
  a Monday the Week equals Today, and on the 1st the Month equals Today. That is
  expected.
- **Decided — replace `leaderboard.getToday` with `leaderboard.getBoards`.**
  - Args: `{ secret, now, dayStart, weekStart, monthStart }`, all supplied by
    the bot, because queries never read the wall clock.
  - Returns: `{ today: LeaderboardRow[], week: LeaderboardRow[], month: LeaderboardRow[] }`.
  - Keep the same `assertBotSecret` gate.
  - Remove `getToday`, because the bot is its only caller. Migrate its tests.
- **Decided — how each list is computed.**
  - Today's live totals per member come from `groupTodaysMembers`, with each
    partial and session span **clipped to `[dayStart, now)`** using `overlapMs`
    from [[Daily totals]].
  - Week = `sumDailyTotals(weekStart, dayStart)` + today's live totals, merged
    by member key.
  - Month = `sumDailyTotals(monthStart, dayStart)` + today's live totals,
    merged the same way.
- **Decided — ranking.** Split `rankMembers` (`leaderboard/util.ts`) into two
  steps: per-member totals, then a pure `rankTotals(rows)`. Keep the same order:
  `deepFocusMs` desc, then `totalMs` desc, then `discordId`, capped at
  `MAX_LEADERBOARD_ROWS`. Look up names from `users` only for the ranked top
  ten. `online` is `true` only for members with an active session today.
- **Decided — today's clipping fix applies to the Today board too.** A session
  running across midnight now counts its pre-midnight minutes toward yesterday.
  Today they count toward today, which is a small, deliberate change to ST-9
  behaviour that keeps Today and Week consistent.
- **Decided — the bot's message.** One message holds three embeds, in this order:
  - **Today**: `📚 Today`, accent `0x5865F2`, with the 🟢 online marker.
  - **This week**: `📅 This week · 13–19 Oct`, accent `0x57F287`.
  - **This month**: `🗓️ October`, accent `0xFEE75C`.

  Every embed keeps the legend line `🎥 Deep focus | Total`, medals for the top
  three, and whole-minute durations (`formatDurationShort`).

- **Decided — the dashboard link and footer appear once.** The bold
  "More details on the dashboard" line, the footer (time zone) and the timestamp
  go only on the last embed. All three titles still link to `DASHBOARD_URL`.
- **Decided — empty states.** "No study time logged today yet." /
  "…this week yet." / "…this month yet."
- **Decided — the bot loop.** `buildLeaderboardEmbed` becomes
  `buildLeaderboardEmbeds(boards, meta): EmbedBuilder[]`. `startLeaderboard`
  sends and edits `{ embeds }` with all three. The clear-on-start, edit every 60
  seconds and repost on 10008 behaviour is unchanged.
- **Decided — known gap, accepted.** For up to about one minute after midnight,
  until the `dailyTotals` cron runs at minute 1, the Week and Month boards leave
  out yesterday. No mitigation.

## Testing Decisions

- `convex-test`, the same way as `leaderboard.test.ts`: seed `dailyTotal` rows
  plus today's partials, then call `getBoards` and assert the three lists.
  Cover:
  - Week = past Daily totals + live time.
  - Monday, where Week = Today.
  - A member with no study today still ranked on the Week.
  - A partial crossing midnight, clipped.
  - Same ordering and top-ten cap on every list.
  - The secret is rejected when missing or wrong.
- Plain Vitest for `rankTotals`, and for the bot's `buildLeaderboardEmbeds`
  against fixture boards. Cover the three titles (including the week date
  range), empty states, medals, online marker only on Today, and the link and
  footer only on the last embed.
- Discord I/O stays untested, consistent with ST-9.

## Acceptance Criteria

_Implemented on `st-11-12` on top of ST-11, merged to `spqrbot-26` and deployed
to prod on 2026-10-13; backend and bot suites green, the bot posts the three
embeds. On-channel spot checks stay open (Monday=Today, a member's week sum)._

- [x] `getBoards` replaces `getToday`, and the tests pass.
- [ ] The Discord channel shows one message with three embeds that refresh every
      minute.
- [ ] On a Monday, the Week board equals the Today board.
- [ ] Spot check: a member's Week Deep focus equals the sum of their Daily totals
      since Monday plus today's live value.
- [x] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` pass.

## Out of Scope

- A web version of the Period boards. It belongs in the Review view, which is
  not built yet. See [[Visibility-moc]].
- Browsing past Periods ("last week's winner").
- Personal trends on the board. That is Consistency and stays off Discord.
- Ranking or showing Tasks.
- Announcing a winner when a Period ends. Parked.

Blocked by: [[Daily totals]].
