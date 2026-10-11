---
id: ST-4
status: done
type: requirement
priority: A
area: requirements
---

# ST-4 Manual precedence (overtake)

When a member tracking manually joins a voice channel, the manual partial closes
and the same session continues in the Discord mode — a normal in-session mode
change. Manual time can never run alongside Discord time.

Blocked by: ST-3. See ADR-0001.

## Done

The voice `enter` strategy finds the active session by user row, and when its
active partial is `manual` closes that partial and inserts the voice partial on
the same session instead of ending it. Covered in `tracking.test.ts`
("manual precedence (overtake)").
