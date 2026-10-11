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

**Online**:
A member who is in a study channel right now — they have an active session.
_Avoid_: Present, connected

**Offline**:
A member who has studied today but is not in a channel now — every session they
started today has ended.
_Avoid_: Away, inactive

**Voice state**:
The tuple Discord reports for a member in voice — the channel they are in, plus
whether their camera and screen share are on. Mute, deafen and headphones are
not part of it.
_Avoid_: Presence, status

**Study mode**:
The engagement half of a voice state: `voice` (just there), `camera`,
`screenShare`, or `cameraAndScreenShare` (both). Camera and screen share are
independent, so both-on is its own mode.
_Avoid_: Activity, participation

**Voice transition**:
What a before/after pair of voice states means for a session: `enter` (joining
from outside), `leave` (going to outside), `change` (any other difference), or
`none` (nothing changed).
_Avoid_: Move, event
