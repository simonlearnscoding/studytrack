# Future-session planning

**In short:** the drag-a-lane-section / drag-a-task mechanic for planning future
sessions, and how it differs on mobile. Explicitly later.

## Owner's thinking

> My initial idea was for a user to drag a section of my own lane and then based on
> that plan a session, or drag a task and plan a session too. … The only issue I
> see is with mobile, because it's not really mobile friendly to drag sideways, so
> we have to consider how and what needs to be different on the mobile screen so it
> all neatly ties together.

## Decisions

- **The axis stays horizontal** (2026-10-18). Orientation follows what the rows
  mean: people as lanes, one glance = the room's day — the shared-Session north
  star (ADR-0004). A vertical axis would make people into columns and kill the
  room overview.
- **Drag-to-plan is a desktop-pointer gesture.** A drop is (row, x) — precise
  horizontal control is the calendar-standard input. Needs a `pxToMinute`
  inverse of the existing `minuteToPx`, plus edge auto-scroll while dragging.
- **Mobile plans by tap, not drag** — drag-vs-scroll on touch has no clean
  answer on a horizontal axis. Exact flow still open (see below).
- **Cross-day planning is not this surface.** Dragging tasks between days
  belongs to the Plan-mode day-columns idea parked in [[Roadmap]]; the room
  timeline must not deform for it.
- **A Planned session never starts in the past** (2026-10-18). This is an
  invariant of the planning domain, not a rule about one gesture: every way a
  plan can be created — the desktop drag now, tap-to-plan and drag-a-task later,
  moving an existing block after that — enforces it. The floor is the first
  15-minute mark **at or after** now, so a plan never contains a past minute;
  the drag preview refuses to snap further back (it parks on the floor rather
  than sliding into the past, as a soft block), and a drag that _begins_ before
  now creates nothing at all. The floor is captured at pointer-down so a ticking
  clock cannot drift it mid-gesture. Backfill — recording study that already
  happened with no Discord evidence — is deliberately **not** this gesture: it
  is a claim about the past and belongs with Manual, under different evidence
  rules.
- **The term is _Planned session_** (2026-10-18). `plan` is the verb; the dashed
  block is a Planned session. It is **not** a Session: no voice evidence, no
  partials, so none of the Session rules (the 30-minute rejoin, Pause) apply.
  The `planned` slot on a Task is a third, separate idea (the Day/instant a task
  is pencilled for) and must not be conflated with it.
- **One planned session at a time** (2026-10-18). A member has **at most one**
  Planned session — the constraint is on the member, not the Day. While a plan
  is on the lane, dragging again **moves** that plan (a patch, never a second
  row): planning is positioning one block, not stacking blocks. This is what
  gives a bare drag its meaning — create-vs-move never has to be guessed from
  the gesture, because "there is already one" is the only thing that
  distinguishes them.
- **A plan is public** (2026-10-18). Same rule as Tasks ([[0007]]): the room may
  see what you plan to do, not only that you are doing it. The read therefore
  cannot filter plans down to the signed-in member, and the block may later
  render on other people's rows.
- **A missed plan is kept** (2026-10-18). A plan whose window passed with no
  voice evidence is not expired, swept or deleted: it stays for the rest of the
  Day and renders as **missed**, so the Day shows what you intended and did not
  do. Nothing enforces "one at a time" by deleting — a new plan replaces the
  row in place.

## Not built yet: the model change

Planning is **frontend-only**. The drag reports `{ startMin, endMin }` to a DEV
harness in `timeline-section.tsx` and nothing is stored: there is no mutation,
and the timeline draws mock scenarios rather than Convex. The decisions above
are the shape the real thing has to take; the work, in order:

- [ ] **Where planned times live.** Recommended: a `plannedSession` table
      (owner + `plannedStart` + `plannedEnd`), because the alternatives ripple.
      `session.status` is `'active' | 'ended'` and `startedAt` is **required** in
      `packages/backend/convex/schema.ts`, so putting a plan on `session` means a
      third status, an optional `startedAt`, and changes to `buildSession`, daily
      totals, the leaderboard and metrics. A separate table costs the existing
      readers nothing.
- [ ] **A create-or-move mutation** behind the drag, enforcing the past floor
      (first 15-minute mark at or after now) and "one at a time" (upsert the
      member's single row).
- [ ] **The today read.** `getTodaysActivitiesForDashboard` is **partial-first**:
      `sessions/service.ts` `groupTodaysMembers` collects `sessionPartial` rows
      and only then groups them by their session, and it derives the member from
      the session. A plan with no partials can never enter that map. Including
      plans means re-basing the read (or unioning it) plus a field on
      `DashboardMember`.
- [ ] **The glossary conflict.** [[GLOSSARY]] defines a Session as evidenced
      ("from a member first joining a study channel until they leave voice"), and
      this note says a Planned session is not a Session. Planned times **on**
      `session` reverses that; whichever way it lands, the reversal gets written
      down — a glossary line, plus an ADR if it lands on `session`.
- [ ] **The timeline still reads mocks.** `/beta` resolves a scenario
      (`useScenario`) instead of subscribing to
      `api.sessions.getTodaysActivitiesForDashboard`, which feeds the older
      dashboard route. Until that seam is swapped, a stored plan renders nowhere.

## Open questions

- [ ] **Desktop:** drag an empty stretch of my own lane → create a planned session;
      drag a task onto the lane → plan a session (with that task). Both, or one?
- [ ] **Mobile flow** (gesture decided: tap): tap empty time → a form? two-tap
      (tap task → tap time)?
- [ ] How a planned session renders (currently the dashed `plans` block) — and
      how **missed** renders differently from upcoming.
- [ ] Multiple tasks per planned session.
- [ ] Does this need the "Task has a Day" decision the [[Roadmap]] flags?
- [ ] Does the past wall need a visible affordance while dragging (dim the past
      stretch of your lane), or is the clamped preview enough?
- [ ] When a plan comes true — you join voice inside its window — does the plan
      become _the_ Session (linked, so planned and actual can be compared), or
      do the two stand side by side?

## Related

- [[Lanes of the day]] · [[Past-session popup]] · [[Roadmap]]
