---
id: ST-17
status: done
type: decision
priority: A
area: sessions
---

#wayfinder/grilling

## Question

What does a member's Session card show of their tasks? The open/done counts are
already public (ADR-0002); the titles are private. The owner's instinct is to
show the titles by default ("all friends in there"), which reverses ADR-0002.
Decide: counts only, or titles — and if titles, record why ADR-0002 relaxes, and
whether a privacy opt-in is a later ticket or out of scope.

## Answer

The Session card shows the member's task **titles** — both open and done — to
the whole room. This reverses ADR-0002 (see ADR-0005).

- **Open + done** titles, public by default ("all friends in there").
- **Privacy is later**: an opt-out to hide tasks, or the whole session, is fog —
  Not yet specified, not this slice.

Interpretation to confirm in ST-18: "done" here means the member's tasks done
today; "done in _this_ session" is the hover surface (ST-19).
