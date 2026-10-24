import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { cn } from '~/lib/utils'
import type { QueueTask } from '../task-types'
import { TaskRow } from './task-row'

type TaskItemProps = {
  task: QueueTask
  isNow?: boolean
  onTick: () => void
  onRename: (title: string) => void
  onRemove: () => void
}

// One Open row in the sortable list. Only Open tasks join it; Done rows use
// DoneTaskItem below, because history cannot be dragged.
export function TaskItem({ task, isNow, onTick, onRename, onRemove }: TaskItemProps) {
  const editor = useTaskEditing(task, onRename)
  const { editing } = editor

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: editing,
  })

  return (
    <li
      ref={setNodeRef}
      tabIndex={editing ? undefined : 0}
      aria-roledescription="sortable task"
      aria-describedby={attributes['aria-describedby']}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group relative flex items-center gap-2 border-b border-white/[0.04] px-2 py-2.5 outline-none last:border-0',
        !editing && 'cursor-grab select-none active:cursor-grabbing',
        isDragging && 'cursor-grabbing opacity-40',
        isNow && 'rounded-md bg-primary/[0.06]',
        'focus-visible:ring-2 focus-visible:ring-primary/20'
      )}
      {...(editing ? {} : listeners)}
    >
      <TaskRow task={task} isNow={isNow} {...editor} onTick={onTick} onRemove={onRemove} />
    </li>
  )
}

// A Done row: a plain list item at either fold state. No drag listeners, no
// keyboard lift, no grab cursor and no sortable announcement — only the record
// and its actions.
export function DoneTaskItem({ task, onTick, onRename, onRemove }: TaskItemProps) {
  const editor = useTaskEditing(task, onRename)

  return (
    <li className="group relative flex items-center gap-2 border-b border-white/[0.04] px-2 py-2.5 last:border-0">
      <TaskRow task={task} {...editor} onTick={onTick} onRemove={onRemove} />
    </li>
  )
}

function useTaskEditing(task: QueueTask, onRename: (title: string) => void) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)

  const startEditing = () => {
    setDraft(task.title)
    setEditing(true)
  }

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== task.title) onRename(trimmed)
    setEditing(false)
  }

  const cancel = () => {
    setDraft(task.title)
    setEditing(false)
  }

  return {
    editing,
    draft,
    onDraft: setDraft,
    onCommit: commit,
    onCancel: cancel,
    onStartEditing: startEditing,
  }
}
