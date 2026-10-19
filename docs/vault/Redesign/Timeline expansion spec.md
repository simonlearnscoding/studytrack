# Timeline expansion spec

---

id: LD-8
status: done
type: requirement
priority: A
area: redesign
---

# Timeline expansion spec

> **Shipped via T1–T6** (see [[Lanes of the day]]). **ADR-0008 revised the window**:
> the shipped axis is a `06:00–24:00` core with one `00:00–06:00` night band and a
> `32px/h` floor, not the `05:00–22:00` two-band core written below. The spec's
> framing (fixed window, collapsible night, now-centring, auto-open, hidden
> markers, adapter seam) is what shipped.

**In short:** give the day timeline a fixed, readable window — 05:00–22:00 with a
collapsible night — that stops shrinking and scrolls instead, opens centred on
"now", and expands itself when the day runs late. Built frontend-first against
switchable mock scenarios behind one pure adapter, so wiring Convex later is a
swap. Agent detail follows.

#ready-for-agent

Elaborates [[Timeline expansion logic]] (LD-1) and the mock seam of
[[Data contract and scenarios]] (LD-7). Vocabulary follows `GLOSSARY.md`
(Day, Session, Partial, Study mode). Reference behaviour: HEY Calendar's
collapsible nighttime.

## Problem Statement

The day timeline is the surface members read first, but it is a fixed mock that
draws a full midnight-to-midnight axis. On a laptop it wastes width on hours
nobody studies; on a phone it is squashed until the hour labels collide and the
lanes stop reading as times of day. Two thirds of a Day — the small hours and the
late evening — are either noise or, when cropped, silently hidden. There is also
no way to tell, at a glance, where "now" is on a narrow screen, and no way to work
on any of this before the backend is wired.

## Solution

The timeline gets a fixed core window of **05:00–22:00** at full scale, with the
night (00:00–05:00 and 22:00–24:00) rendered as two thin, labelled bands at the
ends that expand on click. The axis stops shrinking at a per-hour floor and
scrolls sideways below it, opening centred on the current time. After 22:00 (or
before 05:00) the relevant band opens on its own, so a late or all-night session
is visible without a click. All of it is built against a set of named mock
scenarios shaped exactly like the live payload, behind one pure adapter, so the
switch to Convex is a payload swap rather than a rewrite.

## User Stories

1. As a member on a narrow screen, I want the timeline to stop shrinking once it gets too narrow, so the hour labels stay legible instead of colliding.
2. As a member, I want to scroll the timeline sideways after it reaches that floor, so no hour is lost off-screen.
3. As a member, I want the timeline to open centred on the current time, so I see what is happening now without hunting for it.
4. As a member, I want the day to show 05:00–22:00 by default, so the hours I never use do not eat the width I do use.
5. As a member, I want the hidden night drawn as thin bands at both ends, so I can still tell that the early-morning and evening hours exist.
6. As a member, I want to click a night band to expand it, so I can look at or reason about activity in those hours.
7. As a member studying after 22:00, I want the evening band to open on its own, so the timeline already includes "now".
8. As a member studying before 05:00, I want the morning band to open on its own, so an all-nighter stays visible.
9. As a member, I want a session, plan or completed task hidden in the night to show as a marker on the band, so real activity is never invisible.
10. As a member, I want my manual expansion to survive a reload, so I do not reopen it every visit.
11. As a member, I want an auto-expanded band to stay open while I am on the page, so the view does not snap shut under me at 05:00.
12. As a member, I want "now" centred but never scroll past the real ends of the day, so I am not shown phantom time.
13. As a member on a phone, I want the same collapse, expand and centring behaviour with tap-sized bands, so it works with a thumb.
14. As a member, I want the name column to stay pinned while the track scrolls, so I can tell whose lane is whose.
15. As a member whose Discord account is not linked, I want my lane to render with a fallback name, so one unlinked member does not break the room.
16. As a developer, I want one pure adapter from the backend payload to the view models, so the axis maths lives in one testable place.
17. As a developer, I want the mocks shaped exactly like the live payload, so the adapter is exercised by fixtures rather than bypassed.
18. As a developer, I want to switch scenarios from a URL param and dev buttons, so I can reach any state fast and share a link to it.
19. As a developer, I want the fixtures to set their own clock, so I can reach 03:00, 05:00 and 22:15 deterministically.
20. As a developer, I want the whole scenario harness removable in one change, so none of it ships to members.

## Implementation Decisions

- **Window.** A single fixed core window of **05:00–22:00** at full scale, shared
  by every breakpoint. No activity-driven shifting; fixed clock bounds also make
  DST a non-issue.
- **Collapse.** The axis stays a full 00:00–24:00. The night renders as two thin,
  independent bands — left **00:00–05:00**, right **22:00–24:00** — around the
  full-scale core, each labelled and expanding on click.
- **Sizing.** A per-hour floor of **48px/h**; below it the track scrolls
  horizontally and the name column stays pinned. Expanding a band keeps px/h
  **fixed** — the band grows to real scale and the axis widens, so expanding is
  zooming into the night, not rescaling the whole axis to fit.
- **The floor is decided by the timeline's own width**, not the viewport, using
  container queries — the column it sits in already changes with the rails.
- **Now-anchor.** "Now" is **centred** when the track overflows; a band's
  expansion snaps the view, but the ticking clock does not re-snap on every tick.
  Centring clamps at the absolute day ends (00:00 / 24:00).
- **Auto-expand** is purely clock-driven: now < 05:00 opens the morning band, now
  ≥ 22:00 opens the evening band. It stays open for the visit; a fresh load inside
  the window starts collapsed. A manual expansion persists **per user** (a local
  preference); auto-expansion is transient and never stored.
- **Hidden activity.** A session, plan or completed task inside a collapsed band
  shows a marker/count on that band instead of force-opening it.
- **One pure seam.** A pure, ctx-free adapter maps the backend payload to timeline
  view models: `(members, { now, dayStart, window }) → rows`, where each row
  carries axis-relative positions, not timestamps. A second pure helper resolves
  window/collapse state from `now` plus the user's expansion state. Components
  render view models only.
- **Data contract.** Mock fixtures are typed as the real payload —
  `DashboardMember[]` from `sessions.getTodaysActivitiesForDashboard` — plus the
  three things a live query cannot carry: `now`, the `dayStart` it was read
  against, and which member is "you". The scenario switcher replaces the **query
  input** (`members`, `now`, `dayStart`, `me`), so the real adapter still runs; the
  live path reuses the existing `useNow`, `useDayStart` and dashboard query, and
  identifies "you" by matching the current identity to `DashboardMember.userId`.
  A `?scenario=` URL param selects a scenario, with a small dev-gated button strip
  as a shortcut.
- **Fixtures.** Named scenarios cover: nobody tracked; 1 / 3 / 8 / 13 members;
  early morning; 03:00 and 05:00; just after 22:00; nobody online but sessions
  earlier; one long camera session; a pause-heavy day; a member in manual mode; a
  member mid-pause; completed tasks present and absent; and an unlinked member
  (null name/image).

## Testing Decisions

- A good test here asserts **external behaviour**: the view models the adapter
  produces and the decisions the window/collapse helper makes. It never reaches
  into the DOM, and never tests styling.
- The seam is the two pure modules — the adapter and the window/collapse helper.
  This is the single new seam the feature adds; components stay dumb.
- Plain Vitest at that seam is the prior art (mirrors the pure-util suites in the
  sessions and leaderboard domains). No `convex-test` is needed: the feature does
  not touch the database.
- Cases: an empty room; 13 members; now 03:00 (morning band auto-expands, now
  centred); the 05:00 boundary (collapsed on a fresh load); now 22:15 (evening band
  auto-expands); a manual expansion preserved; a hidden session surfacing as a band
  marker; centring clamped at 00:00 / 24:00.
- The fixtures are themselves a compile-time contract: they are annotated as the
  live payload type, so a backend shape change fails typecheck rather than the UI.

## Out of Scope

- The look of the lines and bars ([[Timeline line styling]]).
- Task dots ([[Task dots]]).
- Session-state opacity ([[Session states and opacity]]).
- The past-session popup ([[Past-session popup]]).
- Planning and its drag/tap mechanic, including the mobile divergence
  ([[Future-session planning]]).
- Surfacing the live query inside `/beta` beyond the adapter swap — this spec adds
  the seam, not the live wiring.
- Any backend change; real persistence of expansion beyond a local preference; and
  DST-specific handling (out by construction).

## Further Notes

- HEY Calendar collapses a fixed 22:00–06:00 nighttime and reveals it on click;
  this spec keeps its own 05:00–22:00 core and splits HEY's contiguous night into
  two horizontal end-bands.
- The fixed-window-with-collapsible-night choice is a genuine, somewhat
  hard-to-reverse trade-off and a candidate for an ADR once it survives contact
  with the build.
- The scenario harness is a prefactor: it must land first so the expansion work is
  demoable and testable before Convex is wired, and it must be deletable in one
  change.
