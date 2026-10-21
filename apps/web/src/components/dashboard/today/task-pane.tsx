import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { TaskComposerHint } from '~/components/dashboard/task-composer-hint'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { handleComposerEscape, useTaskComposerHotkey } from '~/hooks/use-task-composer-hotkey'
import { TaskItem } from './task-item'
import { TaskOverlay } from './task-overlay'
import type { TaskId } from './task-types'
import type { TaskQueue } from './use-task-queue'

const screenReaderInstructions = {
  draggable:
    'Press space or enter to lift the task. Use the arrow keys to move it. Press space or enter to drop, or escape to cancel.',
}

export function TaskPane({ queue }: { queue: TaskQueue }) {
  const [title, setTitle] = useState('')
  const [draggingId, setDraggingId] = useState<TaskId | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useTaskComposerHotkey(inputRef)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const ids = queue.items.map((task) => task.id)
  const dragging = queue.items.find((task) => task.id === draggingId)

  const titleOf = (id: string | number) =>
    queue.items.find((task) => task.id === id)?.title ?? 'task'
  const positionOf = (id: string | number) => ids.indexOf(id as TaskId) + 1

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${titleOf(active.id)} moved to position ${positionOf(over.id)} of ${ids.length}.`
        : undefined,
    onDragEnd: ({ active }) => `Dropped ${titleOf(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Reordering cancelled. ${titleOf(active.id)} returned to its place.`,
  }

  const startDrag = ({ active }: DragStartEvent) => {
    setDraggingId(active.id as TaskId)
  }

  const endDrag = ({ active, over }: DragEndEvent) => {
    setDraggingId(null)
    if (!over || active.id === over.id) return

    const from = ids.indexOf(active.id as TaskId)
    const to = ids.indexOf(over.id as TaskId)
    if (from < 0 || to < 0) return

    queue.reorder(arrayMove(ids, from, to))
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    setTitle('')
    queue.add(trimmed)
  }

  return (
    <section className="bg-card flex min-h-0 flex-1 flex-col rounded-xl border p-4 max-lg:p-3.5">
      {/* composer */}
      <form onSubmit={submit} className="mb-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            ref={inputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => handleComposerEscape(event, () => setTitle(''))}
            placeholder=" "
            aria-label="New task"
            className="peer h-9 rounded-lg border-white/[0.08] bg-white/[0.04] text-sm"
          />
          <TaskComposerHint />
        </div>
        <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-lg">
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {/* contract: checkbox = complete · pencil = rename · trash = delete */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={startDrag}
        onDragEnd={endDrag}
        onDragCancel={() => setDraggingId(null)}
        accessibility={{ announcements, screenReaderInstructions }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto max-lg:overflow-visible">
          {queue.loading ? (
            <div className="skeleton h-16 rounded-lg" />
          ) : queue.items.length === 0 ? (
            <p className="text-caption px-3 py-6 text-center">
              No tasks planned for this day — add one above.
            </p>
          ) : (
            <ul>
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {queue.items.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isNow={task.id === queue.now?.id}
                    onTick={() => queue.tick(task.id)}
                    onRename={(title) => queue.rename(task.id, title)}
                    onRemove={() => queue.remove(task.id)}
                  />
                ))}
              </SortableContext>
            </ul>
          )}
        </div>

        <DragOverlay>
          {dragging ? <TaskOverlay task={dragging} isNow={dragging.id === queue.now?.id} /> : null}
        </DragOverlay>
      </DndContext>
    </section>
  )
}
