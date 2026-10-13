---
id: ST-15
status: in-review
type: bug
priority: B
area: bugs
---

# ST-15 Timeline segments are rounded at every mode change

Source: [[general-ideas]] ("the progress bar of everyone should only be round at
the end or start, not on the transition between two states").

## Symptom

On every member's timeline bar in the Focus view, a Session that changes Study
mode (for example camera → screen share) looks like a chain of separate pills,
with a pinch at each change. It should read as one continuous bar that changes
colour, rounded only where study actually starts or stops.

## Cause

`apps/web/src/components/dashboard/member-timeline.tsx` draws each non-Pause
partial as its own absolutely-positioned `div` with `rounded-full`. Adjacent
partials therefore both round their touching ends.

## Fix

- **Decided** — for each visible segment, after sorting, Pause partials are
  skipped and day clipping is applied:
  - round the **left** end only if no visible segment ends where this one
    starts;
  - round the **right** end only if no visible segment starts where this one
    ends.
- **Decided** — two segments touch when `next.startedAt - prev.end <= 1000` ms.
  The bot closes and opens partials with the same `now` (`bot/strategies.ts`),
  so the real gap is 0. The 1 s tolerance only absorbs rounding.
- **Decided** — a Pause leaves a visible gap, so the segments either side of it
  are rounded. That is correct: study stopped there.
- **Decided** — use Tailwind `rounded-l-full` / `rounded-r-full` / none, chosen
  per segment. Compute the flags in a small pure function in the same file,
  `segmentEnds(segments) → { roundLeft, roundRight }[]`.
- `min-w-[4px]` stays as it is.

## Verification

_Implemented on `st-15`, merged into `integration`. `pnpm lint`, `pnpm typecheck`
and `pnpm format:check` pass. The visual cases below are unverified (no browser
in the build session)._

`apps/web` has no test runner, and adding one is out of scope. Verify visually
with `pnpm dev`:

- a manual session, then join voice (ST-4 overtake): one continuous bar;
- toggle the camera mid-session: no pinch at the change;
- leave and rejoin voice: a gap, with rounded ends on both sides.

Run `pnpm lint`, `pnpm typecheck` and `pnpm format:check`.

Blocked by: nothing.
