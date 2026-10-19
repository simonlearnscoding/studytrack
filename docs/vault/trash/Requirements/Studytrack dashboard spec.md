---
id: ST-0
status: todo
type: requirement
priority: A
area: requirements
---

# Studytrack dashboard spec

#ready-for-agent

## Problem Statement

Studytrack records study time from Discord voice channels, but the dashboard
only lists today's members in two flat groups. There is no sense of how
productive anyone is being, no view of the room's live energy, no history to
look back on, and no way to record study time spent away from Discord.

## Solution

A redesigned dashboard with two columns — a social "live room" (primary) and a
personal rail — plus manual tracking from the web, per-member tasks with
completion markers on the timeline, and, later, a Deep-focus leaderboard and
personal history.

## User Stories

1. As a member, I want to see who is studying right now, so that I know whether to join.
2. As a member, I want a live timeline of everyone's modes today, so I can see how the room's energy has moved.
3. As a member, I want a segment's colour to tell me the mode, so I can read the board at a glance.
4. As a member, I want to see which voice channel people are in, so I can join them.
5. As a member, I want a nudge when the room is empty, so that I might start a session.
6. As a member, I want to start tracking from the website when I'm not on Discord, so my off-Discord study counts.
7. As a member, I want my manual tracking to end automatically when I join a voice channel, so I never double-count.
8. As a member, I want to see my Study time, Deep focus and Total time, so I understand my day.
9. As a member, I want my current session's mode and elapsed time, so I know where I am.
10. As a member, I want my longest unbroken focus block today, so I can judge my concentration.
11. As a member, I want a private task list, so I can plan what to study.
12. As a member, I want to mark a task done, so I can see progress.
13. As a member, I want to see how many tasks I closed today versus how many are open, so I know what's left.
14. As a member, I want everyone's task counts visible, so the group keeps each other honest.
15. As a member, I want yellow markers where tasks were completed on today's timeline, so I can connect effort to output.
16. As a member, I want to hover a marker to see which task was finished, so the timeline tells a story.
17. As a member, I want a leaderboard ranked by Deep focus, so camera-on time is rewarded.
18. As a member, I want that leaderboard to also show Study time and Total time, so context isn't hidden.
19. As a member, I want a streak of days I studied at least a threshold, so I'm motivated to keep going.
20. As a member, I want a heatmap of my history, so I can see consistency.
21. As a member, I want today compared to my usual same weekday, so I know if I'm ahead or behind.
22. As a member without a webcam, I want my voice study to be visible, so I'm not silently penalised.

## Implementation Decisions

- Two sources of study time: Discord voice states and manual declaration.
- The Study mode vocabulary gains `manual`; the existing `break` literal remains as the representation of a Pause.
- Manual tracking is a Convex module with start/stop mutations. They check the caller's identity and reject when a Discord session is active for that member.
- Precedence lives in the voice strategies: an incoming enter/change closes an active manual partial and continues the same session (ADR-0001).
- The stale-sweep must also close abandoned manual sessions.
- Schema: a manual session has no guild and possibly no Discord id, so those fields become optional (or use a sentinel) for manual rows.
- Tasks: a new table (title, done, member, completedAt). The room shows a today-scoped "N done · M open" count; the timeline reads completion instants.
- Metrics: Study time = study modes excluding Pauses; Deep focus = camera modes; Total time = session span including Pauses. The leaderboard ranks Deep focus; Total time is shown but never ranked.
- Streak = consecutive days with Study time at or above a threshold.
- Layout: one screen, two columns — social (wide, left) and self (narrow rail, right) — with the rail stacking under the room on narrow viewports (stacking, not tabs, while the rail is light).
- The mode colour system gains a `manual` colour.
- Day boundary stays fixed at Europe/Zurich. Vocabulary follows GLOSSARY.md.

## Testing Decisions

- Test external behaviour only: given a sequence of voice and manual events, what sessions/partials and what dashboard numbers result — never internal calls.
- Highest seam: the Convex function boundary, via convex-test, like the existing bot and sessions tests.
- Pure decision helpers (voice transition, strategy selection, metric math) get plain Vitest, like sessions/util.test.ts and bot/util.test.ts.
- The manual module gets convex-test coverage for auth rejection, reject-while-on-Discord, and overtake continuity.

## Out of Scope

- Webcam-less accommodation.
- Badges, points, and any composite score.
- Per-user timezones.
- Task due dates and assignment.
- Auto-moderation of tasks.

## Further Notes

- Discord is the trusted witness; manual is a fallback (ADR-0001).
- The schema's `break` literal is a placeholder for the Pause concept; renaming it is deferred.
