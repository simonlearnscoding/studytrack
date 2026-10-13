---
type: moc
---

# Roadmap

Where studytrack goes next, and why in this order. **Now** items are what to
pick up today (agent tickets, or the owner's next design session). **Next** items
need one short owner session first. **Later** items are blurry on purpose; each
says what would move it closer.

Raw source: [[general-ideas]]. Vocabulary: `GLOSSARY.md`. Area maps:
[[Visibility-moc]], [[Requirements-moc]], [[bugs-moc]].

## North star

Members keep coming back to study _together_, in shared Sessions. Every other
view — Visibility, Review, Plan — exists to feed that one experience. Anyone
wondering "why did the leaderboard ship before the Session?" should read
`docs/adr/0004-session-is-the-trunk.md`.

## The direction in one paragraph

Run two tracks in parallel. **Track B (owner) is the trunk:** design how a
Session should _feel_ — the most important open question in the product, and the
least evidenced, so it needs grilling and a prototype, not tickets. **Track A
(agents) is the branches:** ship what already has evidence — the weekly and
monthly boards the members asked for, plus the two obvious fixes. It is cheap,
it is proven, and it builds the Daily totals record everything later needs.
Then the heatmap: a look at whether a record of showing up brings people back.

## Now: Track B, the trunk (owner — start now)

The trunk runs in parallel with Track A from the start. It has no evidence, so it
is designed before it is built.

1. **Session feel.** _The most important open question in the product._ What
   makes studying in the room feel like _one Session together_?
   - Candidates from the ramble: a shared timer or pomodoro, timeline bars that
     look like Sessions, and a hover card on a Session showing its duration,
     Tasks planned and Tasks done.
   - **Next session:** a `grilling` on "what is the soul of a shared Session".
     Then a `prototype` of the strongest candidate, likely the shared timer,
     shown to two or three members.
   - **Why not tickets yet:** none of it has evidence. Building before the
     grill risks building the wrong heart.

## Now: Track A, shipped (in review)

All four are implemented, merged to `spqrbot-26` and deployed to prod on
2026-10-13, awaiting the owner's pass. They were independent, so they ran as
parallel agent sessions in separate worktrees.

2. [[ST-15 Timeline segment rounding]]: in-review. Visible polish win.
3. [[ST-16 Edit and delete tasks]]: in-review. Promised in [[Tasks spec]].
4. [[Daily totals]] (ST-11), then [[Weekly and monthly leaderboard]] (ST-12):
   both in-review. ST-12 was blocked by ST-11; shipped back to back on one
   branch. This is the main deliverable of the branches.

## Next: needs one owner session first

5. [[Consistency heatmap]] (ST-13): most of it is decided. One `prototype`
   session settles the Review view placement and the colours. Judge it by feel
   once it is out — no pre-registered test, no gate.
6. [[Streak]] (ST-14): build it after the heatmap, if it still feels worth it.

## Later: parked, blurry on purpose

Each item has a confidence tag, what it is, and what would move it closer.

- **Parked: Navigation modes (Focus | Plan | Review).** Review starts small with
  ST-13. Plan only comes once Planning exists.
  - _Unlock:_ ST-13 shipping proves a second view is worth navigating to.
- **Parked: Planning (planned Sessions).** Drag a block or a Task onto a day
  timeline to create a planned Session. Others can join it.
  - _Unlock:_ Session feel first, because a planned Session is only worth
    planning if Sessions feel real.
  - It also needs a data decision: Tasks have no "Day" today; they are scoped
    by `_creationTime`.
- **Parked: Task carry-over and the past-days view.** A Logseq-style scroll back
  through past Days, pulling unfinished Tasks into today or the month.
  - _Unlock:_ the same "Task has a Day" decision as Planning.
  - Probably the first Plan-mode feature, because it is the owner's own proven
    habit.
- **Parked: Day columns (Sunsama-style kanban) and a horizontal calendar with a
  collapsed night (Hey-style).** Interaction ideas for Plan mode.
  - _Unlock:_ Planning exists.
- **Parked: Session retrospective.** Planned vs actual for one Session.
  - _Unlock:_ Planning.
- **Parked: Points and rewards for keeping planned Sessions.**
  - _Unlock:_ Planning, plus a grill on whether rewards fight "record over
    score".
- **Parked: Witness and Symbiosis surfaces.** Others seeing you; the room as one.
  - _Unlock:_ any evidence. A public record can also become exhausting.
- **Parked: Customization (backgrounds, themes).** Motivating, but off the
  proven axis.
  - _Unlock:_ members ask for it.
- **Parked: Non-study activities.** These existed in the previous app, but they
  dilute the study identity and would force "Session" to mean something more
  general.
  - _Unlock:_ members ask for it unprompted.

## Where every idea in general-ideas went

| Idea in [[general-ideas]]                                  | Where it lives now                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| Progress bar only round at start/end                       | [[ST-15 Timeline segment rounding]] (Now)                                 |
| Edit and delete Tasks                                      | [[ST-16 Edit and delete tasks]] (Now)                                     |
| Common pomodoro timer                                      | Track B: Session feel                                                     |
| Three modes: plan / review / doing; navigation             | Later: Navigation modes (Review starts with ST-13)                        |
| Customization                                              | Later: Customization                                                      |
| Weekly + monthly leaderboard (proven)                      | [[Weekly and monthly leaderboard]] (Now)                                  |
| Heatmaps (proven)                                          | [[Consistency heatmap]] (Next)                                            |
| Other activities than study                                | Later: Non-study activities                                               |
| Past tasks, infinite scroll, carry-over                    | Later: Task carry-over                                                    |
| Tasks for tomorrow, Sunsama kanban                         | Later: Day columns                                                        |
| Hey calendar: horizontal scroll, hidden night              | Later: Day columns / horizontal calendar                                  |
| Planned sessions on a timeline, drag tasks in, join others | Later: Planning                                                           |
| Session retrospective (planned vs done)                    | Later: Session retrospective                                              |
| Sessions as the heart; shared feel; Fiveable               | Track B: Session feel                                                     |
| Sessions look distinct; hover stats                        | Track B: Session feel                                                     |
| Rewards/punishment for sticking to plan                    | Later: Points and rewards                                                 |
| Focus view: current session top-centre, rethink layout     | Track B: Session feel (the layout follows from what a Session looks like) |

## Housekeeping noticed (not done; verify)

- [[ST-9 Discord daily leaderboard]] is `status: todo`, but the bot board is
  shipped (`apps/bot/src/leaderboard.ts`). It should probably be `done` or
  `in-review`.
- [[ST-1 Dashboard shell]] and [[ST-2 Live room]] are `todo`, but the dashboard
  exists. Check whether they are `done` or `partial`.

## Re-read this when

- The Visibility branches (ST-11…ST-16) pass review and deploy.
- The Session-soul grill and its prototype have run — the trunk gets a direction.
- The heatmap has been out for a couple of weeks.
