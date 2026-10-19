---
type: moc
---

# Visibility

**In short:** how studytrack shows a member their effort — four lenses (Standing,
Consistency, Witness, Symbiosis), with one stored record under all of them
([[Daily totals]]). Standing lives in Discord; Consistency is web-only. Agent
detail follows.

How studytrack shows a member their effort, to themselves and to the room. This
is the **sprint map**: what we build, in what order, why, and what is
deliberately parked. The whole-product direction is in [[Roadmap]].

Raw source: [[general-ideas]]. Vocabulary: `GLOSSARY.md` (Visibility and Views
sections).

## The four lenses

Effort can be shown in four directions. Each one looks a different way, and no
two lenses share a surface.

| Lens            | Looks at              | Surface                          | Tag                                  |
| --------------- | --------------------- | -------------------------------- | ------------------------------------ |
| **Standing**    | you vs others         | Discord (group, glanceable)      | **Decided**: extend the board        |
| **Consistency** | you vs your past self | Web, Review view (private, deep) | **Decided**: the record              |
| **Witness**     | others seeing you     | none                             | **Parked**: no evidence; can exhaust |
| **Symbiosis**   | the room as one       | Web, Focus view (opening)        | **Opening**: see [[Symbiosis-moc]]   |

## Decisions

- **Decided**: record over score. A member's own record is never ranked, and the
  leaderboard is a separate, deliberate place.
- **Decided**: Discord _shows_ and the web is where you _act_. Standing goes to
  Discord. Consistency is web-only.
- **Decided**: one stored record under every lens, [[Daily totals]]. No lens
  rescans raw partials.
- **Decided**: Periods are calendar-aligned (Monday weeks, 1st-of-month months,
  Europe/Zurich). They are not trailing windows.
- **Decided**: v1 covers recorded Sessions only. Planned and shared Sessions are
  in [[Roadmap]].
- **Decided**: the heatmap is a calendar over time, encoding Study time. It
  lives in the Review view. The Focus view gets at most a [[Streak]] token.

## The sprint

| #   | Ticket                                           | Chapter             | Status    | Tag | Blocked by              |
| --- | ------------------------------------------------ | ------------------- | --------- | --- | ----------------------- |
| 1   | [[Daily totals]] (ST-11)                         | [[Foundation-moc]]  | in-review | —   | —                       |
| 2   | [[Weekly and monthly leaderboard]] (ST-12)       | [[Standing-moc]]    | in-review | —   | ST-11 (shipped)         |
| 3   | [[Consistency heatmap]] (ST-13)                  | [[Consistency-moc]] | wontfix   | —   | parked (month calendar) |
| 4   | [[Streak]] (ST-14)                               | [[Consistency-moc]] | todo      | —   | parked behind calendar  |
| 5   | [[ST-23 Deep focus counts screen share]] (ST-23) | [[Standing-moc]]    | in-review | —   | —                       |

How we judge it:

- Tickets 1 and 2 answer an explicit request, so no test is needed.
- Ticket 3 (heatmap) is parked; the `/beta` month calendar carries the surface.

## Calls made overnight (confirmed and shipped)

These were decided while drafting the tickets, without a grill. Each is
reversible. ST-11 and ST-12 are now implemented, which confirms the first four
and the glossary change below.

- [x] **Daily totals table instead of a windowed raw read.** It replaces the
      earlier "History layer". Reasons: the bot polls every minute with a new `now`,
      so a raw month query would never cache and would hit the 1000-partial cap.
      Rows also serve the heatmap and the Streak for free.
- [x] **Calendar week and month, not trailing 7 or 30 days.** The reset is the
      motivating moment, and the Period gets a name.
- [x] **Midnight clipping also changes the existing Today board.** A session
      running across midnight now gives its pre-midnight minutes to yesterday.
- [x] **`getToday` is replaced by `getBoards`.** There is one query for all
      three embeds. 🟢 shows on Today only. The dashboard link and footer appear
      once, on the last embed.
- [ ] **Heatmap thresholds are fixed:** 0 / under 30m / up to 1h30 / up to 3h /
      3h or more. Study time, 53 weeks.
- [x] **Streak is built after the heatmap, not gated on a test.** (Changed
      2026-10-13: go by feel, don't over-formalise QA.)
- [x] **New glossary terms:** Day, Period, Daily total, Streak, Focus view,
      Review view. Consistency no longer lists "Streak" as a word to avoid; a
      Streak is now its own term.

**Symbiosis chapter opened.** [[Daily totals]] gives Symbiosis the record it was
parked for, so [[Symbiosis-moc]] now exists. Its first ticket is
[[Collective focus time]] (ST-25), a live meter of the room's shared study.

## Parked in this area

Chapter-level parked items live in [[Standing-moc]] and [[Consistency-moc]].
Everything outside Visibility (planning, shared timers, carry-over,
customization, non-study activities) lives in [[Roadmap]] with what would unlock
it.
