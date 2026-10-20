import { useHotkey } from '@tanstack/react-hotkeys'
import type { KeyboardEvent, RefObject } from 'react'

// "New task": jump straight to the composer instead of adding it from the
// keyboard. `Mod` is Ctrl on Linux/Windows and Cmd on macOS.
export const NEW_TASK_HOTKEY = 'Mod+Enter'

/**
 * Escape inside the composer abandons the draft: clear the input and drop
 * focus. Kept as a plain helper so every composer entry point shares the
 * exact same behaviour.
 */
export function handleComposerEscape(event: KeyboardEvent<HTMLInputElement>, onClear: () => void) {
  if (event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  onClear()
  event.currentTarget.blur()
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
