# Deep focus includes screen share

Deep focus — the metric every board ranks by — is now `camera`, `screenShare`
_and_ `cameraAndScreenShare`, counted equally. Before this it was the two camera
modes only, so a member studying by screen share alone logged Study time but no
Deep focus. That excluded them from the boards for a definitional reason, not a
behavioural one.

The reason is that screen share is the same evidence as a camera: Discord
observes it, it cannot be self-declared, and it is just as hard to fake as being
on camera. Treating it as second-class contradicted the definition of Study time
(the dashboard already counted it) and split the app's own metrics, since Focus
rate (`sessions/metrics.ts`) already counted all three. Deep focus and Focus rate
now agree on the mode set.

The trade-off is that screen-share-only sessions — which can be passive, a
recording or a lecture playing unattended — now rank alongside camera sessions.
This was accepted: an unattended screen share is rarer than an unattended voice
call, and camera-only has the same passive failure mode. Splitting the visual
ladder (where a both-on partial still reads strongest, see the Session states and
opacity work) keeps the distinction visible on the timeline without punishing
screen-share study in the standings.

This is hard to reverse once members are used to ranking by it, and the widened
metric changed stored numbers: every past `dailyTotal` row must be recomputed by
re-running the backfill (`npx convex run dailyTotals:backfill`, idempotent), so
past Days use the new definition. See ST-23.
