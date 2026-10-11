---
id: ST-3
status: done
type: requirement
priority: A
area: requirements
---

# ST-3 Manual tracking

A member can start and stop tracking from the website, for time spent off
Discord. The new `manual` study mode counts as Study time (never Deep focus).

- start/stop control, auth-checked, disabled while the member has a Discord session
- schema: manual rows may have no guild and no Discord id
- the stale-sweep closes abandoned manual sessions
- `manual` appears in the roster, timeline and totals

Blocked by: ST-1.

## Done

`tracking/` domain (`tracking.ts` + `service.ts` + `util.ts` + `types.ts`):
`start`/`stop` mutations and a `getMine` query. `manual` added to the study-mode
union; `session`/`sessionPartial` `discordId` + `guildId` made optional and a
`by_userId` index added. Self rail carries the start/stop button and live timer.
