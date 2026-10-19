---
id: ST-25
status: in-progress
type: concept
priority: C
area: requirements
---

# Collective focus time

**In short:** the room's shared effort this sitting — one live number that adds
a second for every second each member in the room studies, so three people
deep-focusing an hour read `3h`. It shows whenever anyone is in the room (one
person counts too) and is gone when the room empties. The cut follows the
site-wide metric switch: Focus counts Deep focus only, Total counts every second
in the room. Built in the presence rail; where it finally sits is still open.

Map: [[Visibility-moc]]. Chapter: [[Symbiosis-moc]]. Vocabulary: `GLOSSARY.md`
(Symbiosis, Collective focus time, Session, Partial, Deep focus, Focus view).

## Why this is Symbiosis

[[Visibility-moc]] parks **Symbiosis** ("the room as one") for one reason: it
"needs a record to share". The live room now carries today's partials, and this
is the first concrete Symbiosis surface. It also answers a [[general-ideas]]
want: the "common timers" that make a Session feel like a Session.

## Decided (owner, this round)

- **Room total effort (volume), not togetherness.** The number is the integral
  of how many members are earning time right now — a sum of person-seconds. It
  deliberately does **not** measure simultaneity: three people who study an hour
  at different times still read `3h`. A shared "the room has been going for X"
  wall-clock was considered and rejected; the point is the growing total, not a
  real clock.
- **The cut follows the site metric switch.** Under **Focus**, only `camera`,
  `screenShare` and `cameraAndScreenShare` add a second (they count equally —
  [[ST-23 Deep focus counts screen share]]); `voice`, `manual` and `break` add
  nothing, so an idle body in the channel earns nothing **— optimise for focus**.
  Under **Total**, every second in the room counts, pauses included. The meter is
  the room-wide twin of the per-person times the rail already shows, so it obeys
  the same switch.
- **Scope: the live Session; gone when the room empties.** It starts at `0` when
  the room first has activity, holds while the room is occupied (even if nobody
  is deep-focusing it simply stops advancing), and is gone the instant no one is
  in a session any more. Not Day-scoped, not all-time. This is the "total session
  volume".
- **Shows from one person.** No two-person floor: when everyone else leaves the
  number stays, so it does not vanish while you are still studying. Visibility
  only — the count is the same.
- **Live, derived on the client.** No backend, no stored table for v1: sum the
  members' active sessions against the single `useNow(1000)` tick, taking the
  Deep-focus slice (Focus) or the whole span (Total) per session
  (`sessions/metrics.ts` `collectiveFocusMs`, `hooks/use-now.ts`).
- **Counting is uniform across the three Deep-focus modes.** No per-mode weight
  multiplies the rate. Any visual tiering (the LD-15 evidence ladder) is a look,
  separate from the number.

## Open (settle before #ready-for-agent)

- **Placement — the timer question.** Three timers are in play in the Focus view,
  and which exist (and where) is unresolved. Built provisionally in the presence
  rail, under "In the room · N":
  1. **"my total time today"** — personal, may not show at all.
  2. **"my time in this session"** — maybe the Session card already carries it.
  3. **"total session volume"** — this meter (the room).
     Constraints: the hero already owns the seconds-tick slot (`hero.tsx`), and
     the presence rail already shows "In the room · N" (`presence-rail.tsx`).
- **Visual difference between deep focus and voice.** Counting is uniform; only
  the _look_ could separate evidence tiers (reuse the LD-15 ladder, not new
  colours).

## Related

- [[Visibility-moc]] · [[Symbiosis-moc]] · [[ST-23 Deep focus counts screen share]]
- [[Session states and opacity spec]] · [[Daily totals]]
- [[general-ideas]] · [[Roadmap]]
