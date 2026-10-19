# ST-23 Deep focus counts screen share

---

id: ST-23
status: in-review
type: requirement
priority: A
area: requirements
---

# ST-23 Deep focus counts screen share

**What to build:** count `screenShare` as Deep focus everywhere, so `camera`,
`screenShare` and `cameraAndScreenShare` contribute equally. Today
screen-share-only time is Study time but not Deep focus; after this it is both,
matching `Focus rate`.

**Why:** the owner's decision (see [[Session states and opacity]] LD-4 and
`GLOSSARY.md` `Deep focus`): screen-share-only studying is deep focus on a par
with camera. This widens what the leaderboard ranks by and what
`dailyTotal.deepFocusMs` stores.

**Blocked by:** None (can start immediately).

**Status:** in-review

_Implemented locally on `lanes-of-the-day`; backend and bot suites green. The
worker reads the metric through `isDeepFocus`, so the boards inherit the change
with no bot UI change. Deploy the backend, then run the backfill for the
historical rows (below)._

- [x] `isDeepFocus` / `DEEP_FOCUS_MODES` (`leaderboard/util.ts`) includes `screenShare`; [[Daily totals]] (which calls `isDeepFocus`) inherits it.
- [x] A screen-share-only partial counts as Deep focus; a `voice`, `manual` or `break` partial still does not.
- [x] Leaderboard ranking, the bot's Discord board and `dailyTotal.deepFocusMs` reflect the wider metric; existing tests are updated and a screen-share case added.
- [x] The Visibility docs ([[Daily totals]] ST-11, [[Weekly and monthly leaderboard]] ST-12, [[data-model]]) drop the camera-only wording; `GLOSSARY.md` already matches.
- [ ] Historical `dailyTotal` rows are recomputed (re-run the backfill) so past Days use the new definition — **ops, after deploy**: `npx convex run dailyTotals:backfill`.
- [x] An ADR records the widened Deep focus metric — hard to reverse, surprising without context, and a real trade-off. See `docs/adr/0006-deep-focus-includes-screen-share.md`.
