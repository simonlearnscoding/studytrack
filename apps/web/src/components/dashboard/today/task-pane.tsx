import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { TaskItem } from './task-item'
import type { TaskQueue } from './use-task-queue'

export function TaskPane({ queue }: { queue: TaskQueue }) {
  const [title, setTitle] = useState('')

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
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a task…"
          className="h-9 rounded-lg border-white/[0.08] bg-white/[0.04] text-sm"
        />
        <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-lg">
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {/* contract: tap row = set active · checkbox = complete · × = clear active */}
      <div className="min-h-0 flex-1 overflow-y-auto max-lg:overflow-visible">
        {queue.items.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            isNext={t === queue.next}
            onSetActive={() => queue.setActive(t.id)}
            onTick={() => queue.tick(t.id)}
            onClear={queue.clearActive}
            onRename={(title) => queue.rename(t.id, title)}
            onRemove={() => queue.remove(t.id)}
          />
        ))}
      </div>
    </section>
  )
}
