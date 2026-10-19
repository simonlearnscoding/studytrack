# T1 Scenario harness and adapter

---

id: LD-9
status: done
type: requirement
priority: A
area: redesign
---

# T1 · Scenario harness and adapter

**What to build:** `/beta` renders the day timeline from a selected mock scenario,
flowing through the same pure adapter the live query will later feed. A
`?scenario=` URL param plus a small dev-only button strip chooses between the
named fixtures, which carry their own clock and "you". No expansion behaviour yet
— this is the seam and a faithful render only.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] `/beta` renders the timeline from backend-shaped scenarios through one pure adapter, not the old view-model mocks.
- [x] Both the `?scenario=` param and the dev buttons switch scenarios; every shipped scenario renders without error, including empty and the unlinked member.
- [x] The adapter is pure and unit-tested (empty room; 13 members; a member with null name/image).
- [x] No live Convex query is required, and the harness runs signed-out in dev.

_Shipped: `packages/backend/convex/timeline/util.ts` (`toTimelineRows`, `resolveWindow`) with `timeline/util.test.ts`; fixtures in `apps/web/src/components/dashboard/today/scenarios.ts`; the `?scenario=` param, `scenario-switcher.tsx` and `use-scenario.ts`. The `/beta` route still renders from these fixtures — the live Convex swap is a separate, mechanical change._
