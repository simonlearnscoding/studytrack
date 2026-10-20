import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { cn } from '~/lib/utils'
import type { QueueTask } from '../task-types'
import { TaskRow } from './row'

export function TaskItem({
  task,
  isNext,
  onSetActive,
  onTick,
  onClear,
  onRename,
  onRemove,
}: {
  task: QueueTask
  isNext?: boolean
  onSetActive: () => void
  onTick: () => void
  onClear: () => void
  onRename: (title: string) => void
  onRemove: () => void
}) {
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
        'group flex items-center gap-2 border-b border-white/[0.04] px-2 py-2.5 outline-none last:border-0',
        !editing && 'cursor-grab select-none active:cursor-grabbing',
        isDragging && 'cursor-grabbing opacity-40',
        task.active && 'rounded-md bg-primary/[0.06]',
        'focus-visible:ring-2 focus-visible:ring-primary/20'
      )}
      {...(editing ? {} : listeners)}
    >
      <TaskRow
        task={task}
        isNext={isNext}
        editing={editing}
        draft={draft}
        onDraft={setDraft}
        onCommit={commit}
        onCancel={cancel}
        onStartEditing={startEditing}
        onTick={onTick}
        onSetActive={onSetActive}
        onClear={onClear}
        onRemove={onRemove}
      />
    </li>
  )
}
