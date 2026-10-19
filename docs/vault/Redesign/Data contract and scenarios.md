---
id: LD-7
status: done
type: requirement
priority: A
area: redesign
---

# Data contract and scenarios

**In short:** keep the mock data shaped exactly like the real backend, and give
ourselves switchable scenarios so every situation is reachable while the frontend
is built.

**Decisions complete** — the fixture module ships; the adapter is built by
[[Timeline expansion spec]] (LD-8).

## Owner's thinking

> The first thing we'd probably have to make sure is that the datatypes we use as
> mock match exactly the type of data we expect from the frontend. For prototyping
> it would be good to set ourselves up with some nice test data we can switch
> around to see different scenarios — no one tracked anything, only 3, or 8, or 13;
> what if it's morning, what if it's 03:00, what if it's 05:00, and so on. Maybe
> some temporary buttons so we can quickly switch between the prop objects.

## Decisions

- **One pure seam.** A ctx-free adapter maps the backend payload to timeline view
  models — `(members, { now, dayStart, window }) → rows` — and components take view
  models only. Backend-shaped fixtures exercise the adapter rather than bypassing
  it. Tested with plain Vitest.
- **Clock is an input.** `now` is supplied by the existing `useNow` in live use and
  by the scenario in dev; `dayStart` by `useDayStart`. Components never read the
  wall clock.
- **Switcher.** A `scenarios` module of named `{ members, now, dayStart, me }` sets,
  selected by a `?scenario=` URL param plus a small dev-gated button strip. It
  replaces the **query input** (not the adapter output), so the contract stays
  exercised. The whole harness deletes in one change.
- **Fixtures.** Nobody tracked; 1 / 3 / 8 / 13 members; early morning; 03:00 and
  05:00; just after 22:00; nobody online with sessions earlier; a long camera
  session; a pause-heavy day; a member in manual mode; a member mid-pause;
  completed tasks present and absent; and an unlinked member (null name/image).

## Shipped

`apps/web/src/components/dashboard/today/scenarios.ts` — fixtures typed against the
real `DashboardMember[]` payload plus `now` / `dayStart` / `me`, covering the
scenarios above. Typechecks.

## Facts / constraints

- The live seam already exists: `api.sessions.getTodaysActivitiesForDashboard`
  (`sessions.ts`, built in `sessions/service.ts`), `useNow`, `useDayStart`.
- `DEV_AUTH_BYPASS=1` lets `/beta` run signed-out in dev.
- "You" is identified by matching the current identity to `DashboardMember.userId`;
  fixtures carry `me` for this.

## Related

- [[Timeline expansion spec]] (LD-8) · [[Lanes of the day]] · [[Timeline expansion logic]] · [[data-model]]
