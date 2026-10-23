---
id: LD-20
status: blocked
type: requirement
priority: A
area: redesign
---

# In the room spec

**In short:** the presence card for the `/beta` Today layout — the live "In the
room" view. One card per person studying right now, carrying a **present-tense**
read: how long this sitting has run, what mode they are in, what they are on, and
how engaged the session is. One hard rule survives every variant: **the now-line
stays.** The card's **content** is decided; its **placement** is not — that is
[[Prototype: presence placement and ring]] (LD-21), which blocks this build.
Agent detail follows.

**Blocked by [[Prototype: presence placement and ring]] (LD-21).** The card's
fields below are settled; where the card lives (and how the ring reads) is the
open fork.

Elaborates the **In the room** surface of the `/beta` redesign. Builds on the
adapter seam of [[Timeline expansion spec]] (LD-8) / T1. Vocabulary follows
`GLOSSARY.md` (Online, Session, Partial, Pause, Study mode, Study time, Deep
focus, Focus rate, Witness, Symbiosis, Standing). The task line draws on
[[ST-24 Active task and next suggestion]]. Reference art: `docs/adr/desired-state-desktop.html`.

## Problem Statement

The presence view exists to answer one question in the present tense: **who is
here, what are they on, and how locked in are they?** The incumbent left lane
answers it badly — it duplicates the center timeline's list of people, and its
incumbent fields drift into the day (a per-day session count, a day total) that
the timeline already carries. So the lane reads as wasted space beside a second
copy of itself, and its single genuine asset — the now-line — sits among fields
that say little.

Two things are true at once: the card's **content** should be ruthlessly
present-tense, and its **container** is unresolved. Ditching the left lane is not
the goal; giving presence a home that does not repeat the timeline is.

## Solution

One card per person with an active session, showing only present-tense facts:

- **Session length** as the headline — how long _this sitting_ has run, live.
- A **mode icon** — how they are studying right now.
- A **now-line** — what they are on, with the ladder below.
- An **avatar ring** — how engaged the current session is.

The card's **placement** is decided by prototype, not here. Candidates: cards as
columns in a band **above** the center timeline (the owner's first instinct),
the incumbent **left rail**, a compact **who's-there strip in the hero**, or
**merged into the timeline rows** (considered and set aside: too crammed).

## User Stories

1. As a member, I want to see who is studying right now, so that I feel I am studying with others.
2. As a member, I want each present person as one card, so that I can read the room at a glance while I work.
3. As a member, I want a member's **current session length** as the card's headline, so that I can see who just started and who is deep in — a present-tense fact, not a day total.
4. As a member, I want that number to tick live, so that the card feels present rather than a snapshot.
5. As a member, I want the headline to be _this sitting_, not the whole day, so that the card does not repeat the timeline's day view.
6. As a member, I want to see the study mode each person is in right now, so that I can tell who is just on voice and who is on camera or screen.
7. As a member, I want camera and screen share distinguishable as modes, so that I can tell how someone studies.
8. As a member, I want a one-line "what they're on" — the now-line — so that the room feels like shared work. _(This field is non-negotiable.)_
9. As a member, I want my active task shown at full strength when I have one, so that the room sees what I am on.
10. As a member, I want the next open task shown dimmed when I have no active one, so that "up next" reads as a hint, not a claim.
11. As a member, I want "all N done" when someone has cleared their list, so that finishing reads as an achievement.
12. As a member with no tasks, I want the line to say so plainly, so that an empty list does not read as an error.
13. As a member, I want the now-line never to show more than one task, so that the ADR-0005 visibility line is respected.
14. As a member, I want an avatar ring that shows how engaged someone's current session is, so that I can read deep focus at a glance.
15. As a member, I want a new joiner's ring not to glow as if they were a veteran, so that the ring never overstates.
16. As a member, I want the presence view not to crowd the day timeline, so that both stay readable.
17. As a member on a phone, I want the presence view to work with a thumb, so that the room is readable on mobile.
18. As a member whose account is not linked, I want my card to render with a fallback name, so that one unlinked member does not break the view.
19. As a member, I want the empty room to say so, so that I know to join a study voice channel.
20. As a developer, I want the card's fields derived in one pure function, so that the maths is defined once and tested.
21. As a developer, I want the next-task line to come from the dashboard query, so that the mock line becomes real.
22. As a developer, I want the mocks shaped exactly like the live payload, so that the adapter is exercised by fixtures rather than bypassed.
23. As a designer, I want the ring and any chip expressed as tokens, so that there is no raw hex and the `/tokens` swatch stays honest.
24. As a maintainer, I want one seam for the view model, so that it can be tested without the DOM, whichever container wins.

## Implementation Decisions

- **Function: present-tense presence.** The card answers "who is here, what are
  they on, how locked in" — never "how big is their day". This is the ruling
  decision; every field below follows from it.
- **Headline = current session length** (a.k.a. "since"), live-ticking via
  `formatDuration` against the client clock. **Not** Study time today.
- **Fields kept.** Avatar + name, session-length headline, mode icon, now-line.
  **Fields added.** Avatar ring. **Fields cut.** Session count today, "just
  joined" badge, streak, planned-time, task progress bar, and the day-total
  headline.
- **Mode icon, one per Study mode.** `voice` / `camera` / `screenShare` /
  `cameraAndScreenShare` / `manual`, taken from the member's currently open
  Partial. Colour from the existing mode tokens (`app.css` `--color-mode-*`,
  `mode-colors.ts`), `manual` amber as elsewhere.
- **The now-line ladder** (top wins):
  1. active task → title, full strength;
  2. no active, has open tasks → **next open task, dimmed** ("up next");
  3. no open tasks → "all N done";
  4. no list at all → "private list".
     A bare **task count is not shown** — the line answers _"what"_, never _"how
     many"_. Today only (2) is live, because the active-task pointer is ST-24's; the
     line reads the _next open task_ until ST-24 lands.
- **Avatar ring = current-session quality.** A proportion 0..1 drawn in emerald
  (`--primary`) — one quality channel, kept separate from the mode hue. Encoding
  (an **arc** vs a green-ring **opacity**) is settled by LD-21.
- **Ring warm-up guard.** Below a floor of session time (proposed 10 minutes) the
  ring reads as "starting" — full but faint — so a one-minute camera session
  cannot read as 100% deep focus.
- **Backend — one read-path change.** The dashboard query already attaches
  completed tasks to sessions; it also attaches, per member, their **next open
  task title** (the first remaining task in list order) so the now-line is real.
  Behind the existing auth; no schema change. Not built until ST-24's
  active-vs-next shape is settled (see Out of Scope / Further Notes).
- **One seam, reused.** The view model is a pure, ctx-free projection of the same
  `DashboardMember[]` payload the timeline already consumes:
  `presenceCards(members, { now, me }) → { cards }`, each card carrying name,
  avatar, mode, session-length-ms, focus-rate, next-task line. Components render
  the view model only. Extends the LD-8/T1 adapter rather than adding a seam.
- **Clock is an input** (`useNow`, `useDayStart`), as in LD-7. Components never
  read the wall clock.
- **Motion.** The timer already ticks. The ring animates via a CSS transition on
  its arc/opacity, never a keyframe; the "studying" pulse stays on the shared
  `LiveDot`; the card enters with the mock's `rise`. No hand-rolled
  `animate-ping`/`pulse`; tokens only (`design-tokens`).
- **Fallbacks.** Unlinked member → `discordId` as name, initials avatar; null
  image → initials. No Focus rate yet → no ring fill, never 0%.
- **Placement is not decided here.** The container is LD-21's outcome. Nothing in
  the view model depends on it.

## Open Questions

- **Placement.** Cards as columns above the center timeline (owner's first
  instinct), the incumbent left rail, a who's-there strip in the hero, or merged
  into the timeline rows (set aside — too crammed). Resolved by LD-21.
- **Ring encoding.** Arc vs opacity — by LD-21.
- **The leader chip.** Earlier agreed (sort order + leader chip only). With the
  headline now _session length_, a **day** leader chip is Standing on a
  present-tense card — it may no longer belong. Decide: drop it, move the
  competition to the timeline / Consistency board order, or keep it. **Not
  currently in any user story above** — flagged, unresolved.
- **Active-task read timing.** Whether to build the query extension before ST-24
  settles (leaning no — see Further Notes).

## Testing Decisions

- A good test asserts **external behaviour**: the view model the pure projection
  returns for a given payload and clock. It never reaches into the DOM and never
  tests colours or class names.
- The seam is the one pure module (`presenceCards`). Prior art: the pure-util
  suites in `sessions` and `leaderboard` (plain Vitest) and the LD-8 adapter
  tests. No `convex-test` for the projection itself.
- Cases: an empty room; one member; a member in each of the five modes; a
  manual-mode member; a member mid-Pause (online, mode `break` → no mode icon,
  ring frozen); the now-line's four states; an unlinked member (null name/image);
  no session time yet (no ring fill, not 0%); a sub-10-minute ring warm-up;
  session length ticking across a second boundary.
- The query change (next open task) is covered by a `convex-test` at the sessions
  read path, alongside the existing dashboard-query tests — once built.

## Out of Scope

- **Placement** and the ring's visual encoding — LD-21 decides, then this builds.
- The day timeline and its lanes ([[Lanes of the day]], LD-8 / LD-15).
- The explicit **active task** pointer and the "up next" promotion mechanic —
  [[ST-24 Active task and next suggestion]] owns those; this spec only reads the
  _next open task_.
- **Task progress** (`done/total`) as a bar, and any bare task **count**.
- Day totals / Standing surfaces — the consistency board ([[Streak]],
  [[Consistency heatmap]]) and period Standing ([[Weekly and monthly
                                                  leaderboard]]).
- The collective "room meter" ([[Collective focus time]], ST-25) — a separate
  surface.
- Planned-time on tasks (future planning).
- Any schema change; the ring and any chip are derived on the client.

## Further Notes

- **Where this came from.** The incumbent left lane was pushed for, but the
  owner's first instinct was a band of **columns above the center timeline**, and
  the "wasted space" feeling never went away. Merging presence into the timeline
  rows was proposed and rejected — too crammed. So the fork is real: **band on
  top vs left rail vs hero strip.**
- **Don't build the task read early.** The next-open read is the read half of
  ST-24, which has not settled active-vs-next or how the pointer is set. Wire it
  once ST-24 lands, or you will rework it.
- **The Standing tension.** A leader chip is the one remaining day-comparison on
  a card we just made present-tense. Keep it only if the card can say what it is
  for without ambiguity; otherwise the competition belongs in the timeline order
  and the Consistency board.

## Related

- [[Prototype: presence placement and ring]] (LD-21) · [[In the room]] · [[Lanes of the day]]
- [[ST-24 Active task and next suggestion]] · [[Collective focus time]]
- [[Timeline expansion spec]] · [[Session states and opacity spec]] · [[Data contract and scenarios]]
- [[data-model]] · [[Roadmap]]
