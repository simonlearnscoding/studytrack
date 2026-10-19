# Session states and opacity spec

---

id: LD-15
status: todo
type: requirement
priority: A
area: redesign
---

# Session states and opacity spec

**In short:** give the day timeline's session bars a meaning — each session drawn
as a composite of its Partials, whose opacity encodes how much real studying
happened, with Pauses shown as attached (not empty) and "now" set apart by the
live glow alone. Frontend-first against the mock scenarios. Agent detail follows.

#ready-for-agent

Elaborates [[Session states and opacity]] (LD-4). Builds on the seam from
[[Timeline expansion spec]] (LD-8) / T1 — the same backend-shaped scenarios
flowing through one pure adapter. Vocabulary follows `GLOSSARY.md` (Session,
Partial, Pause, Study mode, Deep focus, Focus rate).

## Problem Statement

The timeline draws each session as a single flat bar carrying one mode and one
colour, but a real Session stitches many Partials of differing study modes with
Pauses between them. So the bar cannot answer the question the screen exists for:
how much of that block was real studying? Opacity has no agreed meaning, a Pause
is invisible (so one sitting reads as separate blips), and every ended session is
flattened to neutral grey, throwing away the record of how the time was spent.

## Solution

Each session renders as a composite of its Partials. Opacity is one ladder that
encodes **evidence** — how much real studying happened — never recency or
vividness. Strongest to weakest: `cameraAndScreenShare` > `camera` =
`screenShare` > `voice` > `manual` > **Pause**. A Pause is the lowest band,
dashed, kept visibly attached to its Session by a spine, so a Session reads as one
object from first join to leave. An ended Session keeps its intensity; only the
live glow and the now-line mark "now". One hue at many intensities, amber reserved
for `manual`, neutral for Pause — the same ladder [[Timeline line styling]] (LD-2)
consumes.

## User Stories

1. As a member, I want each session drawn as the true mix of its study modes, so that I can see how someone actually studied, not one flattened colour.
2. As a member, I want the strongest evidence (camera + screen share) to read as the strongest, so that the room's most engaged studying is obvious at a glance.
3. As a member, I want camera-only and screen-only to look the same, so that I do not rank two equally-good ways of studying apart.
4. As a member, I want voice-only to read weaker than any camera or screen, so that being in the call is not mistaken for deep work.
5. As a member, I want manual (self-declared) to read weaker than voice, so that an unverified claim never outranks observed presence.
6. As a member, I want a Pause to read as the weakest thing and still be visibly part of its session, so that breaks do not look like leaving and coming back.
7. As a member, I want a Pause never to look like study, so that the bar does not overstate effort.
8. As a member, I want a session to read as one continuous object across its pauses, so that I can tell one sitting from two.
9. As a member, I want a finished session to keep its intensity, so that the day's record still shows how it was studied.
10. As a member, I want only the live session to glow and the now-line to move, so that "now" stands out without fading the past.
11. As a member, I want a live session's current Partial to show its real mode immediately, so that what I see matches what is happening.
12. As a member, I want a glance to separate deep focus from mere presence across the room, so that I read the day's shape without hovering anything.
13. As a member, I want rapid cam on/off toggling to stay readable, so that a fiddly session does not become visual noise.
14. As a member, I want very short partials to stay visible, so that a few-second blip does not vanish.
15. As a member, I want the same treatment on my pinned mobile lane, so that the phone and the desktop agree.
16. As a maintainer, I want the mode-to-intensity mapping in one pure function, so that the ladder is defined once and tested.
17. As a maintainer, I want the partial-to-segments maths pure and ctx-free, so that edge cases (a one-second partial, an unbroken session) are unit-tested.
18. As a maintainer, I want the opacity decided in one place, so that LD-2's line styling and this bar never drift.
19. As a designer, I want the ladder expressed as tokens in `app.css`, so that there is no raw hex and the `/tokens` swatch stays honest.

## Implementation Decisions

- **Purpose.** Opacity encodes evidence (how much real studying happened), never recency or vividness. "Now" is a separate channel — the live glow plus the now-line.
- **The ladder (strongest → weakest).** `cameraAndScreenShare` > `camera` = `screenShare` > `voice` > `manual` > **Pause**. One step per tier; camera and screen share share a step; manual is one step below voice.
- **Counting vs visual.** For statistics, `camera`, `screenShare` and `cameraAndScreenShare` count equally as Deep focus; only the visual ladder separates `cameraAndScreenShare`. The leaderboard consequence is a separate ticket, ST-23.
- **Per-Partial composite.** A session bar is built from its Partials: solid, butt-joined segments, one per Partial, each at its Partial's intensity. Not a session average, and not 30-minute buckets.
- **Merge and minimum width.** Adjacent same-mode Partials merge into one segment, and a minimum segment width keeps a very short Partial visible. No smoothing or averaging of rapid toggles in this pass.
- **Pause.** Rendered as the weakest band, dashed (never a bare gap), and with a thin continuous spine under every bar, so the Session stays one object. A gap _between_ two sessions has no spine.
- **Live vs ended.** An ended Session keeps its intensity. A live session's open Partial follows its current mode directly — no average-so-far lag. Only the live bar glows; the now-line moves.
- **Shared scale.** One intensity ladder, one hue at many intensities; amber reserved for `manual`; neutral and dashed for Pause. [[Timeline line styling]] consumes the same tokens.
- **The seam.** One pure, ctx-free module: `sessionSegments(session, { now }) → Segment[]` (each segment carries its mode, axis start/end and intensity tier), plus pure `modeIntensity(mode)`, a merge pass and a minimum-width pass. Components render segments only. This extends the adapter seam from LD-8/T1 rather than adding a second seam.
- **Data contract.** Consumes `DashboardSession.partials` (`DashboardPartial[]`) from the LD-8/T1 adapter; the mock scenarios already include a pause-heavy day and a manual-mode member.

## Testing Decisions

- A good test asserts **external behaviour**: the ordered segments and their intensity tiers for a given session. It never reaches into the DOM and never tests class names or colours.
- The seam is the one pure module (segments + intensity + merge/min-width). Prior art: the pure-util suites in `sessions` and `leaderboard` (plain Vitest), and the LD-8 adapter tests.
- Cases: an empty session; a single unbroken camera session; a session of N differing partials with the full ladder; adjacent same-mode partials merging; a Pause band between two study partials; two sessions separated by a real gap (no spine); an ended session keeping intensity; a live session whose open Partial is mid-mode; a sub-second Partial gaining the minimum width.
- No `convex-test`: the feature reads nothing from the database.

## Out of Scope

- The look of the lines and tokens beyond the ladder — [[Timeline line styling]] (LD-2) consumes what this spec lands.
- Task dots ([[Task dots]]).
- Redefining Deep focus in the leaderboard and Daily totals — separate ticket ST-23.
- The past-session popup and future planning.
- Any backend or schema change; the bar is derived on the client.

## Further Notes

- The intensity ladder is the first consumer of a shared "evidence" scale. If it survives contact with the build it is an ADR candidate: it is somewhat hard to reverse, surprising without context, and a real trade-off against a per-mode colour scheme.
- The split between "camera = screen share visually, but all three count equally as Deep focus" is deliberate; if it ever confuses, the fallback is to mirror Deep focus exactly.
