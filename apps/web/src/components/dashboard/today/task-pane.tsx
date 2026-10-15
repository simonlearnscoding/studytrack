import { Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import type { Task } from './data'
import { TaskItem } from './task-item'

export function TaskPane({ tasks }: { tasks: Task[] }) {
  return (
    <section className="bg-card flex min-h-0 flex-1 flex-col rounded-xl border p-4 max-lg:p-3.5">
      {/* composer */}
      <div className="mb-3 flex gap-2">
        <Input
          placeholder="Add a task…"
          className="h-9 rounded-lg border-white/[0.08] bg-white/[0.04] text-sm"
        />
        <Button size="icon" className="h-9 w-9 shrink-0 rounded-lg">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* contract: tap row = set active · checkbox = complete */}
      <div className="min-h-0 flex-1 overflow-y-auto max-lg:overflow-visible">
        {tasks.map((t) => (
          <TaskItem key={t.txt} task={t} />
        ))}
      </div>
    </section>
  )
}
