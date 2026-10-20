# studytrack

Tracks time people spend studying together in a Discord server's voice channels.
The bot reports what Discord says; the backend decides what it means.

## Language

**Session**:
The whole sitting: from a member first joining a study channel until they leave
voice. It stitches together every partial in between, including short pauses —
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
Study time with camera or screen share on — `camera`, `screenShare` or
`cameraAndScreenShare`. The strongest evidence of real studying.
_Avoid_: Cam time

**Total time**:
The whole span of a member's sessions, pauses included. What the personal rail
reports as "Total time"; distinct from Study time, which never counts a pause.
_Avoid_: Elapsed, study time

**Focus rate**:
The share of Total time spent in Deep focus. With no session time there is no
rate; the dashboard shows "—", never 0%.
_Avoid_: Focus score, productivity

**Voice transition**:
What a before/after pair of voice states means for a session: `enter` (joining
from outside), `leave` (going to outside), `change` (any other difference), or
`none` (nothing changed).
_Avoid_: Move, event

## Tasks

**Task**:
An item on a member's study list — something they mean to get done. The member
owns it, but its content is public: titles, the active task and the up-next
suggestion all show to the room (ADR-0007).
_Avoid_: Todo, item, ticket

**Open**:
A task not yet done. Counted in a member's "open" number.
_Avoid_: Pending, incomplete, active

**Done**:
A task the member has marked complete, carrying the instant it was completed.
Un-marking returns it to Open. Counted in "done today".
_Avoid_: Completed, finished, closed

## Visibility

**Consistency**:
The shape of a member's own study read against their own past — how regularly
they show up over time. A member's history of themselves, never a comparison
with anyone else. A Streak is one measure of Consistency, not a synonym for it.
_Avoid_: Stats, progress, history

**Standing**:
How a member's study compares with other members' over a period — what the
leaderboard shows. A comparison with others, never a member's own record.
_Avoid_: Rank, score, position

**Witness**:
A member being seen by others to have shown up. About others' awareness of a
member, not about comparing them with anyone.
_Avoid_: Public, exposure, visibility

**Symbiosis**:
The group's study as a single shared effort — the sense that the room studies
because it studies together, not as separate people.
_Avoid_: Community, energy, vibe, culture

**Collective focus time**:
The room's shared effort in a sitting: the time every member still in a session
has put in, summed — each person adds a second for every second they study, so
three people deep-focusing an hour read `3h`. Under the Focus metric it counts
Deep focus only; under Total, every second in the room. It exists only while the
room is occupied.
_Avoid_: Room meter, together-time, co-presence

**Day**:
One calendar day in the shared Europe/Zurich timezone, midnight to midnight. The
unit every period is built from; a Day is 23 or 25 hours across a DST change.
_Avoid_: 24 hours, date

**Period**:
A calendar span the leaderboard is computed over: the current Day, the current
Week (Monday to Sunday) or the current Month. Always calendar-aligned, never
trailing — a Period resets, and that reset is the point.
_Avoid_: Window, range, last 7 days

**Focus day**:
The Day the dashboard is focused on — the day a member selected in the month
calendar, today by default. The board's Week and Month are the ones containing
it, so looking back at a past day shows that day's periods.
_Avoid_: Selected day, current day

**Viewed Period**:
The Week or Month containing the Focus day — what the consistency board shows
when the focus day is not today. Distinct from the current Week and Month, which
always contain today.
_Avoid_: Selected period, shown period

**Daily total**:
One member's Study time, Deep focus and Total time for one closed Day, stored as
one row. Every Period and the Consistency views are sums or reads of Daily totals.
_Avoid_: Rollup, aggregate, history

**Streak**:
The number of consecutive Days, ending today or yesterday, on which a member
logged at least the threshold of Study time. One number; never ranked.
_Avoid_: Chain, run, combo

## Preferences

**Preference**:
A member's own choice about how the dashboard presents things — today only the
metric it leads with: Deep focus or Total time. Stored per member, so it follows
them across devices; a member who never chose gets the defaults.
_Avoid_: Setting, option, config

## Views

**Focus view**:
The page about _now_: the live room, your current Session, today's Tasks. The
current dashboard is the Focus view.
_Avoid_: Action panel, dashboard, home

**Review view**:
The page about _looking back_: your own Consistency, and the room's Standing over
a Period. Not built yet.
_Avoid_: Statistics, stats page, history
