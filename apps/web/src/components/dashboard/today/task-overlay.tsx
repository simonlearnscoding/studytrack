import type { QueueTask } from './task-types'
import { TaskRow } from './task-item/row'

const noop = () => {}

export function TaskOverlay({ task, isNow }: { task: QueueTask; isNow?: boolean }) {
  return (
    <div className="card-surface shadow-popover flex rotate-[-1deg] scale-[1.02] items-center gap-2 px-3 py-2.5">
      <TaskRow
        task={task}
        isNow={isNow}
        editing={false}
        draft={task.title}
        onDraft={noop}
        onCommit={noop}
        onCancel={noop}
        onStartEditing={noop}
        onTick={noop}
        onRemove={noop}
        overlay
      />
    </div>
  )
}
