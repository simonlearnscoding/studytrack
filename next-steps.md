# Next steps

Where the beta dashboard goes from here. Ordered: the first item is the one I
want next, the rest follow roughly in the order they hurt.

_Last touched 2026-10-23._

## Where we are

The beta dashboard is the product now. Adding, ticking and reordering tasks hits
Convex, plans are tied to a Day and to real WorkSessions, and the polish passes on
the day track, header and leaderboard are done. What's left is mostly the
behaviour around _done_ work and around workSessions, not new surface.

## Settled — don't relitigate

- **A day is a fresh context.** Yesterday's open tasks do not leak into today by
  themselves.
- **A plan is history.** Rearranging plans before a WorkSession is fine; once it has
  happened, what was planned stays on record. Corrections are explicit.
- **Planning is not doing.** Being planned for a WorkSession and being worked on in
  one are different facts.
- **Completion may have no time.** A task can be done without a known instant —
  don't invent a timeline dot for it.
- **Evidence stays distinct.** Planned blocks, tracked time and timed completions
  never look alike.
- **No cleanup ritual.** Reviewing or carrying work forward is optional.

## The words

| Term                    | Means                                                                          |
| ----------------------- | ------------------------------------------------------------------------------ |
| **Task**                | A unit of work with its own identity and status.                               |
| **Planned workSession** | A block reserved for tasks. A plan is not proof of work.                       |
| **Plan assignment**     | "This task was planned for that WorkSession." Kept after the WorkSession ends. |
| **Tracked workSession** | A real interval of work, from Discord or manual tracking.                      |
| **Completion**          | Done. Optionally tied to a WorkSession; the instant may be unknown.            |
| **Recorded at**         | When I pressed the box or corrected it — not when the work happened.           |

Now is the topmost open task of the Day on screen. Browsing history never changes
what is tracking.

## Now

1. **Collapsible Done section.** Done tasks fold away under a `Done · 4`
   separator with a caret, so the list is about what is left.
   - Fold state is a Preference (new `preference` column + mutation), not local
     state: it survives reload and follows me to another device.
   - Presentation only — `completedAt`, timeline dots and counts are untouched.
   - Desktop task pane and the mobile task sheet behave the same.
   - _Done when_ reloading keeps my choice, and folding hides nothing I can't
     unfold.
2. **The two `done` bugs.** Browsing yesterday and ticking a task must not drop a
   dot on today's timeline; ticking the header's Now must leave the list and the
   header agreeing the task is done.
3. **Accidental workSession creation is reversible.** Double-click opens a proposed
   workSession with a **Create workSession** button instead of saving straight away.
   Prerequisite: one popover shared by planned and tracked workSessions instead of
   two that can drift.
4. **WorkSession popover earns its place.** Edit start, end and total; quick chips
   (`25m · 50m · 3h`) on planned workSessions; in-workSession timer that only shows while
   a workSession is running.
5. **Calendar stops lying.** A day is green only if _I_ worked, not if anyone
   did. Then: fold the calendar away, and make it scroll instead of paging.

## Some more UX issues I found

- Theres a button to start tracking time manually but no button to stop it?
  - Not sure about what the timer top right should show... time since tracking? time until end of workSession? time until start next workSession? needs a design decision
- in my timeline all tasks are mashed together which makes it hard (actually impossible) to see the titles, maybe one below the other?
- when creating a planned workSession, I should probably give it a title I think... so drag should not create a workSession by default but open that workSession popup with the buttons an it needs a "create workSession" button
- the current day, back and forth < > would feel more natural if they were on top of the task list I think we can do this together with the collapsed "calendar" item

## Queued

- WorkSession info on hover/click of a sidebar member.
- Day back/forth above the task list, not only above the lanes.
- A way to schedule a task without dragging it onto a lane (Todoist-style
  calendar icon, "tomorrow / next week / pick a day").
- WorkSession tags, with colours.

## Open questions

- **Is Now global or per-Day?** The Dashboard derives it from the Day on screen,
  so browsing yesterday changes my current task. I wrote that it should be
  global — decide, then make the code match.
- **Carry-over.** Still manual (`plannedAt`). Do open tasks get a "carried over"
  mark, or is that history noise?
- **Overdue.** How loudly should yesterday's unfinished plans show up?
- **Better keybind** for jumping between Now and another task.

## Later

- Start a planned workSession from the dashboard; ping Discord when it starts and
  tag me just before it does.
- Tasks in Discord.
- Streak indicator on the calendar.
- Infinite / sideways-scrolling day view (needs a query refactor first).

> [!note]- Shipped so far
> Day track: my lane taller and thicker, my name prominent, cursor time, plan
> times on hover, arrows that never move. Double-click my lane makes a 2h
> workSession. Start/end shown while creating and while dragging a workSession. Day
> switcher sits under "your workSession". Leaderboard: week/month range with pinned
> arrows, metric switch moved and left-aligned, real empty state. Calendar day
> borders have more contrast; the Today button reads as a button and changes
> when I'm elsewhere. Notifications gone. Composer hint readable, Escape clears
> and blurs. No more start/stop: Now is simply the topmost open task.
