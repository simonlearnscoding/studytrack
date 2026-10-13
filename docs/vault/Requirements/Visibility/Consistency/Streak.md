---
id: ST-14
status: todo
type: requirement
priority: C
area: requirements
---

# ST-14 Streak

#needs-triage

One number in the Focus view: how many Days in a row you have studied ("🔥 12
days"). It is the one piece of Consistency allowed on the page about _now_. The
full record lives in the [[Consistency heatmap]].

Map: [[Visibility-moc]]. Chapter: [[Consistency-moc]]. Vocabulary: `GLOSSARY.md`
(Streak, Day, Study time).

**Gate:** build this only if the [[Consistency heatmap]] bet passes. If members
don't care about their own record, a counter over that record won't change
that.

## What is decided

- **Decided** — the definition is in the glossary. A Streak is the number of
  consecutive Days, ending today or yesterday, with Study time at or above the
  threshold. Today counts as soon as it reaches the threshold. Until then the
  Streak still stands from yesterday, so it doesn't look broken every morning.
- **Decided** — it is private and never ranked. It never appears on Discord or
  on another member's card. A Streak leaderboard would turn a record into a
  score.
- **Decided** — the data comes from [[Daily totals]] (`listMine`, shared with
  ST-13) plus today's live Study time. The calculation is a pure function.

## What is still open

- **Leaning**: a threshold of 15 minutes of Study time, as one constant. The
  aim is to reward showing up, not volume.
- **Open**: where exactly it sits in the Focus view. Options are the self panel
  header, or next to the member's own name.
- **Open**: should a broken streak say anything ("Streak ended at 12"), or just
  quietly reset? Leaning towards a quiet reset, because shame makes people stop
  coming.

Blocked by: [[Daily totals]], and the pass of the [[Consistency heatmap]] test.
