# Task content is public

ADR-0002 made task counts public and task content private; ADR-0005 relaxed that
for the live Session card only. This abolishes the privacy half. A task has no
per-task visibility: no shared/private flag, no eye toggle. Everything a task
says — its title, its active flag, its place as the up-next suggestion — is
public to the room.

The room is the product. Tasks exist to feed shared Sessions (ADR-0004): a task
is a "what am I on" line, not a private plan, and the members are a small,
trusted, all-friends group. A per-task eye asked the member to make a consent
decision on every row and split one list into two kinds of truth; removing it
lets every surface — the rail, the live card, the active-task line, the up-next
suggestion — show the same content with no special cases.

Considered and rejected: keeping the eye as an opt-out. It contradicts the
direction ADR-0005 already set (content goes public on the live card) and pays a
permanent UI and data-model cost for a case members never asked for. If the group
ever grows beyond friends, revisit opt-out for the whole Session, not per task.
