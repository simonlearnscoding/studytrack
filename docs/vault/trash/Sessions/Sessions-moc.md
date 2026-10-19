---
type: moc
---

#wayfinder/map

# Sessions

The Focus view turns its Sessions from data into the room's visible object.
Sprint map for the Session slice. Direction: [[Roadmap]] (Track B). Vocabulary:
`GLOSSARY.md` (Session, Study mode, Task).

## Destination

A built first slice: per-person Session cards in the Focus view, a unified today
list, and Tasks auto-attributed to the Session they were finished in, seen on
hover. The map ends when that slice ships and the remaining Session-feel
questions are settled or parked.

## Notes

- Execution is carried: the terminal ticket ships the slice, not a spec.
- Session keeps meaning "the recorded sitting" (GLOSSARY). A Session can be solo;
  Shared Session is the aspirational outcome, not a stored object (yet).
- Timer is fog, not a ticket. Planning is out of scope (Roadmap owns it).
- Skills: grilling + domain-modeling for the decision tickets; domain-workflow
  for ST-21 (build). Terms that earn their place get added to GLOSSARY.md.

## Tickets

- [[ST-17 Session card task visibility]] (ST-17): done · `#wayfinder/grilling`
- [[ST-19 Task to session binding]] (ST-19): done · `#wayfinder/grilling`
- [[ST-20 Shared-session feel references]] (ST-20): done · `#wayfinder/research`
- [[ST-18 Session card and Focus view prototype]] (ST-18): in-progress · `#wayfinder/prototype`
- [[ST-21 Ship the Session slice]] (ST-21): todo · blocked by ST-18
- [[ST-22 Unified today list and task-to-session hover]] (ST-22): done · `#wayfinder/task`

## Decisions so far

- [[ST-17 Session card task visibility]]: the card shows task titles (open + done) to the room — reverses ADR-0002 (now ADR-0005); privacy opt-out is later fog.
- [[ST-19 Task to session binding]]: a Task attaches to the Session whose span contains its `completedAt` (auto-bound, derived, no schema change); no-session completions stay unattached but keep their timeline marker.
- [[ST-20 Shared-session feel references]]: the shared feel comes from cheap stealable mechanics — a synced timer, a one-line public intention, and a session-end check-in/celebrate; skip video, streamed audio, app-blocking, economies.
- [[ST-22 Unified today list and task-to-session hover]]: built on `sessions/st-22` — unified list + done-task hover (native title, auto-bound by completedAt). Done titles only; open titles follow in ST-21.

## Not yet specified

- **Crucial card info beyond name + tasks** (mode, elapsed, deep focus): settled
  in ST-18's prototype, not ticketable yet.
- **Shared grouping** (one card per voice channel vs per person): per-person for
  now; grouping is fog that graduates only if per-person feels wrong.
- **Common pomodoro timer**: likely-later ingredient, not the soul. Fires as a
  ticket only once the slice proves the Session needs it.
- **Per-member privacy opt-in** (titles public by default now; opt-out to hide
  tasks, or hide the whole session): a refinement after the slice, once
  titles-as-default has been lived with.

## Out of scope

- **Planning (planned Sessions, drag tasks onto a day timeline)**: ruled out for
  this effort; Roadmap owns it. A planned Session is only worth planning if
  Sessions feel real, and this map ships that first.
- **Non-study activities, points/rewards, customization**: Roadmap items, not
  this effort.
