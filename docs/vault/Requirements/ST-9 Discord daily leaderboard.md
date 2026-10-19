---
id: ST-9
status: done
type: requirement
priority: B
area: requirements
---

# ST-9 Discord daily leaderboard

**In short:** the bot keeps one self-editing embed in a Discord channel showing
today's leaderboard, ranked by Deep focus, so members see standings where they
already are. The board code has shipped on the bot; this note is the spec. Agent
detail follows.

**Shipped.** The bot posts and edits the board (`apps/bot/src/leaderboard.ts`),
reading the secret-gated `leaderboard` query. `getToday` was later replaced by
`getBoards` (Today + Week + Month) in [[Weekly and monthly leaderboard]] (ST-12).

## Problem Statement

Members study in Discord voice channels, but Discord itself — where they actually
are — shows nothing. The web dashboard knows today's activity, yet there is no
shared, at-a-glance view of how much everyone has studied, and no reason to open
the dashboard just to see standings. Members want a leaderboard where they
already hang out.

## Solution

A single bot-maintained embed in a bot-owned Discord channel showing today's
leaderboard, refreshed about every minute. The bot posts the embed on startup and
then edits that same message on a timer, so the channel holds one living board
rather than a growing pile of messages.

## User Stories

1. As a member, I want a leaderboard inside Discord, so that I don't have to open the dashboard.
2. As a member, I want it ranked by Deep focus, so camera-on study is rewarded.
3. As a member, I want each row to show Deep focus and Total time, so the standings read quickly.
4. As a member, I want the board to refresh about every minute, so it feels live.
5. As a member, I want to see who is studying right now, so I can join them.
6. As a member, I want the top three marked with medals, so the standings read at a glance.
7. As a member, I want my name shown as it is on Discord, so I recognise myself.
8. As a member who never signed into the website, I want to appear anyway, so I'm counted.
9. As a member with only a manual session, I want to appear, so off-Discord study counts.
10. As a member, I want an empty-state message when nobody has studied yet, so the board isn't confusing.
11. As a member, I want only today's time ranked, in the shared day boundary, so the board matches the dashboard.
12. As a member, I want the board capped to the top ten, so it stays readable.
13. As the operator, I want the board to survive a bot restart without leaving stale embeds, so the channel stays clean.
14. As the operator, I want the channel id hardcoded for now, so no extra configuration is required.
15. As the operator, I want the bot to read rankings only through a secret-gated query, so nothing is spoofable.
16. As the operator, I want the board to self-heal if the message is deleted, so it never silently disappears.
17. As the operator, I want Discord API failures logged and retried on the next tick, so one failure doesn't kill the loop.
18. As a maintainer, I want the embed rendering to be a pure function, so it can be tested without a Discord connection.
19. As a member, I want a hard-to-miss link to the full dashboard, so I can dig into the detail.

## Implementation Decisions

- A new Convex domain `leaderboard`: a thin `leaderboard.ts` entry exposing one public query `getToday`, plus `leaderboard/service.ts`, `leaderboard/types.ts` and pure helpers in `leaderboard/util.ts`.
- The query is secret-gated and does not use `ctx.auth` identity — it mirrors the shared-secret check used by the bot's `recordVoiceEvent` mutation. It takes `{ secret, dayStart, now }`; the bot supplies `dayStart` and `now` because queries must not read the wall clock.
- The query returns a ranked top-ten list of rows: Discord id, display name, Deep focus ms, Total time ms and an online flag. It reuses the existing session-partial data and the same day-window approach as the dashboard query.
- Metrics follow the dashboard spec (ST-0) and ST-7: Deep focus = camera modes (`camera`, `cameraAndScreenShare`); Total time = the session's full span including Pauses. Ranking is by Deep focus; Total time is shown but never ranked. Study time is omitted from the board for legibility.
- The day boundary reuses the shared Europe/Zurich constant and `startOfDay`.
- The bot gains a `leaderboard` module: a pure `buildLeaderboardEmbed(rows, meta)` mapper plus a `startLeaderboard(client, convex)` that resolves the hardcoded channel, purges it on startup, posts the embed, keeps the message id in memory, and edits it on a one-minute interval.
- The channel id is a hardcoded constant for the bot-owned leaderboard channel — no env var for now.
- On startup the bot deletes every message in the channel (the channel is bot-owned), then posts a fresh embed. Bulk delete cannot remove messages older than 14 days, so those are deleted individually.
- On "Unknown Message" (404) during an edit, the bot re-posts and replaces its in-memory id; any other error is logged and the next tick retries.
- The embed: a title, a fixed accent colour, a one-line legend (`🎥 Deep focus | Total`), ranked lines with medals for the top three and an online marker, durations in whole minutes only (a board that refreshes every minute has no use for seconds), a prominent link to the dashboard (`https://studytrack.simone-muscas.com/`) both as the title URL and as a bold line in the description, a footer carrying the day-boundary zone and a last-updated timestamp, and an empty-state line.
- The message id is intentionally in memory only: a restart purges and reposts, so no persistence is needed yet. This is a deliberate, reversible choice.

## Testing Decisions

- Test external behaviour only: given a sequence of voice and manual events today, what rows and ordering `getToday` returns.
- Highest seam: the Convex function boundary via `convex-test`, like `sessions.test.ts` and `bot.test.ts`, including the secret check (missing or wrong secret rejected).
- Pure helpers (Deep-focus / Total math and ranking) get plain Vitest, like `sessions/util.test.ts`.
- The bot's `buildLeaderboardEmbed` and `formatDurationShort` are pure and tested with plain Vitest against fixture rows: empty state, legend, medals, the two figures, the online marker and the top-ten cap.
- The bot's Discord I/O (channel fetch, purge, post/edit, interval) is not unit-tested, consistent with the existing untested `index.ts`.

## Out of Scope

- The web dashboard leaderboard and the rest of ST-7.
- Per-user timezones — days stay Europe/Zurich.
- Persisting the message id in Convex across restarts.
- Env/config for the channel id, or more than one leaderboard channel.
- Historical (non-today) standings, pagination, buttons and pinning.
- Backfilling or editing past daily boards.

## Further Notes

- This converges with ST-7 on the metric (Deep focus ranking) and supplies the "new history query" ST-7 noted it needs, though this query is today-only.
- "Bot-owned channel" is an assumption: the startup purge deletes every message in the channel, so it must not be a shared channel.
- The channel id is hardcoded for now; overriding it via env is a later ticket.
- Purging others' messages needs the Manage Messages permission; Discord's bulk delete skips messages older than 14 days.
