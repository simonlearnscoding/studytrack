import { useDoneFold } from '~/preferences/use-done-fold'
import { DoneTaskItem } from '../../item/task-item'
import { TaskGroup } from '../../task-group'
import type { DayTaskQueueActions, QueueTask } from '../../task-types'

// Done always comes last and folds on its own stored preference. That preference
// resolves after mount, so the first frame shows a skeleton instead of rows.
export function DoneTaskGroup({
  tasks,
  actions,
}: {
  tasks: QueueTask[]
  actions: DayTaskQueueActions
}) {
  const [isDoneFolded, setDoneFolded] = useDoneFold()
  const isDoneExpanded = !isDoneFolded
  const isDoneResolved = isDoneFolded !== undefined

  return (
    <TaskGroup
      label="Done"
      count={tasks.length}
      isExpanded={isDoneExpanded}
      onToggle={() => setDoneFolded(isDoneExpanded)}
    >
      {isDoneResolved ? (
        tasks.map((task) => (
          <DoneTaskItem
            key={task.id}
            task={task}
            onTick={() => actions.toggleTaskDone(task.id)}
            onRename={(nextTitle) => actions.renameTask(task.id, nextTitle)}
            onRemove={() => actions.removeTask(task.id)}
          />
        ))
      ) : (
        <li className="px-2 py-2">
          <div className="skeleton h-9 rounded-lg" />
        </li>
      )}
    </TaskGroup>
  )
}
