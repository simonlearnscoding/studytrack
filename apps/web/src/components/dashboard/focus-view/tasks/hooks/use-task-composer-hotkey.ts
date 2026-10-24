import { useHotkey } from '@tanstack/react-hotkeys'
import type { TaskPlacement } from '@studytrack/backend/convex/tasks/types'
import type { KeyboardEvent, RefObject } from 'react'

// "New task": jump straight to the composer instead of adding it from the
// keyboard. `Mod` is Ctrl on Linux/Windows and Cmd on macOS.
export const NEW_TASK_HOTKEY = 'Mod+Enter'

/**
 * The composer's keyboard contract. Enter adds at the bottom, Shift+Enter right
 * after the current Now, Mod+Enter (Ctrl/Cmd) at the top so the new task becomes
 * Now; Escape abandons the draft. Kept as a plain helper so every composer entry
 * point shares the exact same behaviour.
 *
 * The handler stops the event so the global NEW_TASK_HOTKEY never fires while
 * the composer has focus — inside it, Mod+Enter inserts instead of focusing.
 */
export function handleComposerKeyDown(
  event: KeyboardEvent<HTMLInputElement>,
  onAdd: (placement: TaskPlacement) => void,
  onClear: () => void
) {
  if (event.nativeEvent.isComposing) return

  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    onClear()
    event.currentTarget.blur()
    return
  }

  if (event.key !== 'Enter') return
  event.preventDefault()
  event.stopPropagation()
  onAdd(event.ctrlKey || event.metaKey ? 'now' : event.shiftKey ? 'next' : 'end')
}

/**
 * Focuses the composer input on NEW_TASK_HOTKEY. Composers that can be mounted
 * but hidden (the mobile sheet, the desktop pane under `lg:hidden`) pass their
 * own `enabled`; a hidden input is skipped so the shortcut never steals focus
 * into something off screen.
 */
export function useTaskComposerHotkey(
  inputRef: RefObject<HTMLInputElement | null>,
  enabled = true
) {
  useHotkey(
    NEW_TASK_HOTKEY,
    () => {
      const input = inputRef.current
      if (!input || input.getClientRects().length === 0) return
      input.focus()
    },
    { enabled }
  )
}
