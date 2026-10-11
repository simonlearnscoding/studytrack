# studytrack

Tracks time people spend studying together in a Discord server's voice channels.
The bot reports what Discord says; the backend decides what it means.

## Language

**Session**:
The whole sitting: from a member first joining a study channel until they leave
voice. It stitches together every partial in between, including short breaks —
re-entering within 30 minutes continues the same session.
_Avoid_: Sitting, study session

**Partial**:
A stretch of time during which one member's voice state in a study channel is
constant. It opens when the member is in a channel and ends the moment that
voice state changes, however short the stretch.
_Avoid_: Leg, chunk, study session

**Pause**:
The gap between two study partials of the same session — time when the member is
not in a study channel (coffee, phone). A pause belongs to its session but is
never study time.
_Avoid_: Break, idle

**Online**:
A member who has an active session right now — in a study channel, or tracking
manually.
_Avoid_: Present, connected

**Offline**:
A member who has studied today but has no active session now — every session
they started today has ended.
_Avoid_: Away, inactive

**Voice state**:
The tuple Discord reports for a member in voice — the channel they are in, plus
whether their camera and screen share are on. Mute, deafen and headphones are
not part of it.
_Avoid_: Presence, status

**Study mode**:
How a member is studying during a partial: `voice` (just there), `camera`,
`screenShare`, `cameraAndScreenShare` (both), or `manual` (self-declared, with
no Discord evidence). Camera and screen share are independent, so both-on is its
own mode. A pause is not a study mode.
_Avoid_: Activity, participation

**Manual**:
A study mode a member declares on the dashboard, for when they are not on
Discord. It is overridden the moment a Discord voice state arrives.
_Avoid_: Logging, focus, web tracking

**Study time**:
Time a member spends in a study mode, across their sessions — pauses excluded.
The base unit every total is built from.
_Avoid_: Focus time, hours

**Deep focus**:
Study time spent on camera — `camera` or `cameraAndScreenShare`. Treated as the
strongest evidence of real studying.
_Avoid_: Cam time

**Total time**:
The whole span of a member's sessions, pauses included. What the personal rail
reports as "Total time"; distinct from Study time, which never counts a pause.
_Avoid_: Elapsed, study time

**Focus rate**:
The share of Total time spent with camera or screen share on (`camera`,
`screenShare`, `cameraAndScreenShare` — `manual` never counts, it has no
Discord evidence). With no session time there is no rate; the dashboard shows
"—", never 0%.
_Avoid_: Focus score, productivity

**Voice transition**:
What a before/after pair of voice states means for a session: `enter` (joining
from outside), `leave` (going to outside), `change` (any other difference), or
`none` (nothing changed).
_Avoid_: Move, event

## Tasks

**Task**:
An item on a member's private study list — something they mean to get done. The
member owns its title; only the open/done counts are shared with the room.
_Avoid_: Todo, item, ticket

**Open**:
A task not yet done. Counted in a member's "open" number.
_Avoid_: Pending, incomplete, active

**Done**:
A task the member has marked complete, carrying the instant it was completed.
Un-marking returns it to Open. Counted in "done today".
_Avoid_: Completed, finished, closed
