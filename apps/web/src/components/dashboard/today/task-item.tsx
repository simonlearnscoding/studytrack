import { Checkbox } from '~/components/ui/checkbox'
import type { Task } from './data'

export function TaskItem({ task }: { task: Task }) {
  return (
    <div
      className={`flex cursor-pointer items-start gap-2.5 border-b border-white/[0.04] px-2 py-2.5 last:border-0 ${task.active ? 'bg-primary/[0.06] rounded-md' : ''}`}
    >
      <Checkbox checked={!!task.done} className="mt-0.5 h-5 w-5 rounded-md" />
      <p
        className={`min-w-0 flex-1 text-sm leading-normal ${task.done ? 'text-subtle-foreground line-through' : 'text-white/85'}`}
      >
        {task.active && (
          <span className="bg-primary-tint text-primary mr-1.5 rounded px-1 py-0.5 align-[1px] font-mono text-[9px] tracking-widest">
            NOW
          </span>
        )}
        {task.txt}
        {task.planned && (
          <span className="bg-primary-tint text-primary ml-1.5 rounded px-1 align-[1px] font-mono text-[9px]">
            → {task.planned}
          </span>
        )}
        {task.doneAt && (
          <span className="text-subtle-foreground ml-1.5 font-mono text-[9px]">{task.doneAt}</span>
        )}
      </p>
    </div>
  )
}
