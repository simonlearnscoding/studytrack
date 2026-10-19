---
type: moc
---

# In the room

**In short:** the presence view of the `/beta` Today layout — one card per person
studying right now, carrying a present-tense read: how long this sitting has run,
what mode they are in, what they are on, and how engaged the session is.

A sibling map to [[Lanes of the day]]: that map owns the day timeline; this one
owns presence beside it. Both read the same `DashboardMember[]` payload. The
container is not settled — see the prototype.

## Tickets

Frontier is **LD-21**.

| #     | Ticket                                     | Blocked by | Status               |
| ----- | ------------------------------------------ | ---------- | -------------------- |
| LD-21 | [[Prototype: presence placement and ring]] | —          | todo · #needs-triage |
| LD-20 | [[In the room spec]]                       | LD-21      | blocked              |

## Decisions so far

- The card's **function is present-tense presence** — never a day total.
- Headline = **current session length**; the day total leaves the card.
- The **now-line stays** (hard rule); ladder = active → next-open (dimmed) → all
  done → private list. No bare task count.
- The **avatar ring** shows current-session quality; encoding is the prototype's.
- **Placement** is open: band on top vs left rail vs hero strip (merge into
  timeline rows set aside — too crammed).

## Related

- [[Lanes of the day]] · [[Requirements-moc]] · [[Roadmap]]
- [[ST-24 Active task and next suggestion]] · [[Collective focus time]]
