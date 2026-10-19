---
id: LD-21
status: todo
type: requirement
priority: A
area: redesign
---

# Prototype: presence placement and ring

**In short:** a throwaway prototype that answers two questions prose cannot — where
the presence cards live, and how the avatar ring reads. Build it in `/beta` over
the mock scenarios, look at it, pick, delete. It blocks [[In the room spec]]
(LD-20).

#needs-triage

This is a **design question**, not a build. The card's content is already settled
in [[In the room spec]] (LD-20); what is open is spatial and perceptual, so it is
settled by looking, at real size, over real-ish data.

## The two questions

### 1. Placement

| Variant                       | What it is                                                                                                                           | Why it might win                                                          | Risk                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Band on top**               | a horizontal row of presence cards above the center timeline; cards are columns (avatar, name, session length, mode, now-line, ring) | the owner's first instinct; keeps the timeline un-crowded; uses top width | horizontal scroll when many; eats vertical space above the timeline                    |
| **Left rail**                 | the incumbent: a vertical stack in the left column                                                                                   | room for the now-line; familiar                                           | feels like wasted space beside a second copy of the people list                        |
| **Hero strip**                | a compact "who's there" strip of avatars in the hero                                                                                 | lightest; presence without a second list                                  | no room for the now-line unless it expands on hover/click — and the now-line must stay |
| **Merged into timeline rows** | presence facts attached to each day-timeline row                                                                                     | no duplication at all                                                     | _rejected_ — too crammed; keep only as a checked-and-set-aside option                  |

### 2. Ring encoding

- **Arc** — a partial ring whose sweep is Focus rate. Precise, honest; may read
  cramped at 40px.
- **Opacity** — a green ring whose opacity tracks quality. Reads fast; less
  precise.

Both must honour the warm-up guard (below ~10 min → faint "starting" ring) so a
one-minute camera session cannot read as 100%.

## Method

- Build all placement variants side by side behind the existing `?scenario=`
  switcher (`components/dashboard/today/scenarios.ts`), over the LD-7 fixtures.
- Render each at real size, with the real card fields from LD-20.
- Look at avatar size on a laptop and a phone.
- Also try the "thin card" case — everyone with no tasks (`private list`) — since
  that may be the common case and the now-line's least useful state.

## Output

A one-line pick per question, written back into [[In the room spec]] (LD-20) as a
decision, then the prototype is deleted. No production code from this ticket.

## Related

- [[In the room spec]] (LD-20) · [[In the room]] · [[Data contract and scenarios]] (LD-7)
- [[ST-24 Active task and next suggestion]]
