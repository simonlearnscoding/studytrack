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
- **Several planned sessions, never overlapping** (2026-10-20, replacing the
  earlier one-at-a-time rule). A member may keep more than one Planned session,
  on the same Day or across Days. Every drag **creates** a new block. Plans for
  the same member and Day may touch at their edges but never overlap: the
  mutation refuses an overlap, and the drag stops at the next plan in the
  direction of travel and refuses to start on top of one.
- **Edge-drag resizes, body-drag moves** (2026-10-20). Hovering an edge of your
  own plan changes the cursor to a horizontal resize arrow; dragging that edge
  moves the start or end on the 15-minute grid. Dragging the body translates the
  whole block with its duration frozen. Both gestures follow the same walls:
  no start in the past, no overlap, no crossing midnight. The block itself moves
  optimistically — there is no separate "before" outline.
- **Clicking a block opens one shared popover** (2026-10-20). A planned block and
  a real session — yours or anyone's — both open the same read-only popover,
  anchored to the clicked block: member, time window, duration, and the
  session's tasks. Rename, delete and planning tasks into a plan hang off this
  same surface later.
- **A ten-minute warning** (2026-10-20). On the first visit, while the browser
  grant is still untouched, the app asks for notification permission by itself.
  A denied permission renders the bell struck through and is never auto-asked
  again; clicking the struck bell asks once more. Once granted, the bell is on,
  and clicking it mutes or unmutes locally without revoking the grant. While
  unmuted, one notification fires on the tick that watches a plan cross into its
  final ten minutes. A first sighting — page load, a newly created plan, or a
  moved plan — only seeds the baseline, so reloading or creating a plan inside
  the window stays quiet. The notice is remembered per plan window in
  localStorage, so a reload after it fired does not repeat it. This is
  page-level only: a closed tab cannot notify (that needs push + service
  worker).
- **A plan is public** (2026-10-18). Same rule as Tasks ([[0007]]): the room may
  see what you plan to do, not only that you are doing it. The read therefore
  cannot filter plans down to the signed-in member, and the block may later
  render on other people's rows.
- **A missed plan is kept** (2026-10-18). A plan whose window passed with no
  voice evidence is not expired, swept or deleted: it stays for the rest of the
  Day and renders as **missed**, so the Day shows what you intended and did not
  do.

## The model (built 2026-10-20)

Planning is stored, not a DEV harness. The drag reports `{ startMin, endMin }` to
`plannedSessions.create`, and the timeline draws the live read.

- [x] **Where planned times live.** A separate `plannedSession` table (owner +
      `dayStart` + `plannedStart` + `plannedEnd`), so `session`, daily totals,
      the leaderboard and metrics keep their existing shape.
- [x] **A create mutation** behind the drag, enforcing the past floor (first
      15-minute mark at or after now) and refusing an overlap with another plan
      for the same member and Day. Each drag inserts one row, so a member can
      keep several plans.
- [x] **One update mutation** behind both edge drags and body drags, keeping the
      stored Day and applying the same window and overlap rules while ignoring
      the row being edited.
- [x] **The today read.** `getTodaysActivitiesForDashboard` attaches the Day's
      plans to `DashboardMember.plans` after the partial-first grouping,
      appending a card for a plan-only member.
- [x] **The glossary conflict.** A planned session stays outside `session`: it is
      a separate table with no partials, matching the "not a Session" definition.
- [x] **The timeline no longer reads mocks.** It subscribes to
      `api.sessions.getTodaysActivitiesForDashboard` and draws every stored plan
      as a dashed block (missed when the window passed with no voice overlap).

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
