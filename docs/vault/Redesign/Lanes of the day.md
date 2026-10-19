---
type: moc
---

# Lanes of the day

**In short:** the frontend-first redesign of the day timeline — the "lanes of the
day" — in the `/beta` route. Nail the whole mechanic against mock data, then wire
it to the existing Convex backend unchanged. Seven workstreams, worked one at a
time.

## Approach

**Decided: frontend first, backend second.** Get the full mechanic neat and
working on mocks, then hook up the real backend. The prerequisite is
[[Data contract and scenarios]] — the mock types must match the real Convex types
exactly, and we keep switchable scenarios so every situation is reachable.

## Where it lives

- Route: `apps/web/src/routes/beta.tsx` → `TodayLayout`
  (`components/dashboard/today/index.tsx`)
- The timeline: `components/dashboard/today/day-timeline/` (folder: `index.tsx`,
  `track-scroller.tsx`, `night-band.tsx`, the pinned lanes)
- Mock swap point: `components/dashboard/today/data.ts`; scenario fixtures:
  `components/dashboard/today/scenarios.ts`
- Real types: `packages/backend/convex/sessions/types.ts` (`DashboardMember`,
  `DashboardSession`, `DashboardPartial`, `DashboardCompletedTask`)
- Vocabulary: `GLOSSARY.md` (Session, Partial, Pause, Study mode, Day). Backend:
  [[data-model]].
- Styling goes through `apps/web/src/styles/app.css` tokens (design-tokens skill).
  Mode colours already exist: `bg-mode-cam`, `bg-mode-screen`, `bg-mode-voice`,
  `bg-mode-manual`, `bg-mode-cam-screen` (`mode-colors.ts`).

## Cards

The first three are "the lanes" themselves; 4 rides along with them; 5–6 are the
session interactions that come after; 7 underpins everything.

| #   | Card                            | Status  | When           |
| --- | ------------------------------- | ------- | -------------- |
| 1   | [[Timeline expansion logic]]    | done    | shipped (LD-8) |
| 2   | [[Timeline line styling]]       | todo    | now            |
| 3   | [[Task dots]]                   | todo    | now            |
| 4   | [[Session states and opacity]]  | decided | spec'd (LD-15) |
| 5   | [[Past-session popup]]          | todo    | after 1–4      |
| 6   | [[Future-session planning]]     | todo    | later          |
| 7   | [[Data contract and scenarios]] | done    | shipped        |

## Specs

- [[Timeline expansion spec]] (LD-8) — done · T1–T6 shipped; the window was
  revised by **ADR-0008** (`06:00–24:00` core, one night band).
- [[Session states and opacity spec]] (LD-15) — todo · #ready-for-agent ·
  elaborates card 4, drawn on the expansion seam.

## Tickets

Task graphs, one per spec.

### Timeline expansion (LD-8) — shipped

All six tickets landed. Frontier moves to the session-states graph.

| #   | Ticket                                                 | Blocked by | Status |
| --- | ------------------------------------------------------ | ---------- | ------ |
| T1  | [[T1 Scenario harness and adapter]] (LD-9)             | —          | done   |
| T2  | [[T2 Fixed window and collapsible night]] (LD-10)      | T1         | done   |
| T3  | [[T3 Now-centring]] (LD-11)                            | T2         | done   |
| T4  | [[T4 Manual night expand]] (LD-12)                     | T2         | done   |
| T5  | [[T5 Auto-expand and hidden-activity markers]] (LD-13) | T4         | done   |
| T6  | [[T6 Mobile pinned lane parity]] (LD-14)               | T3, T5     | done   |

### Session states and opacity (LD-15)

The expansion harness (T1) has landed, so this graph is open. Frontier is **T7**.

| #   | Ticket                                                   | Blocked by | Status          |
| --- | -------------------------------------------------------- | ---------- | --------------- |
| T7  | [[T7 Evidence ladder and composite bar]] (LD-16)         | T1         | ready-for-agent |
| T8  | [[T8 Pause bands and the session spine]] (LD-17)         | T7         | blocked         |
| T9  | [[T9 Composite density merge and minimum width]] (LD-18) | T7         | blocked         |
| T10 | [[T10 Pinned mobile lane parity]] (LD-19)                | T8, T9     | blocked         |

## Related

- [[Roadmap]] · [[Requirements-moc]] · [[data-model]] · [[Daily totals]]
- [[In the room]] — the presence rail beside the timeline (sibling map, LD-20)
