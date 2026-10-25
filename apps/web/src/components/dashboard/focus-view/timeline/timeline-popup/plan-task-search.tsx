import { api } from '@studytrack/backend/convex/_generated/api'
import type { Task } from '@studytrack/backend/convex/tasks/types'
import { useQuery } from 'convex/react'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Command, CommandInput, CommandItem, CommandList } from '~/components/ui/command'
import { useDebouncedValue } from '~/hooks/use-debounced-value'
import { taskDayLabel } from './task-day-label'

// How many results one search shows; the backend clamps the same value.
const SEARCH_LIMIT = 8
const DEBOUNCE_MS = 250

// The one "add planned task" search shared by the draft and stored plan popovers.
// Before typing it lists the block Day's open Tasks; typing searches every Day,
// so a task from another Day is one pick away. Picking an existing Task and
// creating one are separate callbacks: the stored popover writes immediately,
// while the draft collects a pending list until Create.
export function PlanTaskSearch({
  dayTasks,
  dayStart,
  excludedTaskIds,
  reservedTitles = [],
  onPick,
  onCreate,
}: {
  dayTasks: Task[] | undefined
  dayStart: number
  excludedTaskIds: ReadonlySet<string>
  reservedTitles?: readonly string[]
  onPick: (task: Task) => void
  onCreate: (title: string) => void
}) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS)
  const term = debouncedQuery.trim()
  const isSearching = term.length > 0
  const results = useQuery(
    api.tasks.search,
    isSearching ? { query: term, limit: SEARCH_LIMIT } : 'skip'
  )

  const availableDayTasks = (dayTasks ?? [])
    .filter((task) => !task.done && !excludedTaskIds.has(task.id))
    .slice(0, SEARCH_LIMIT)
  const availableResults = (results ?? []).filter((task) => !excludedTaskIds.has(task.id))
  const visibleTasks = isSearching ? availableResults : availableDayTasks
  const isLoading = isSearching ? results === undefined : dayTasks === undefined

  const knownTasks = [...(results ?? []), ...(dayTasks ?? []).filter((task) => !task.done)]
  const exactTask = isSearching ? findExactTitle(knownTasks, term) : undefined
  const isReserved = isSearching && reservedTitles.some((title) => sameTitle(title, term))
  const isExcluded = exactTask ? excludedTaskIds.has(exactTask.id) : false
  const showReserved = isSearching && (isReserved || isExcluded)
  const canCreate = isSearching && results !== undefined && !exactTask && !isReserved

  const pick = (task: Task) => {
    onPick(task)
    setQuery('')
  }

  const create = () => {
    onCreate(term)
    setQuery('')
  }

  return (
    <div className="mt-3 border-t border-white/6 pt-2.5">
      <p className="text-label">Add a task</p>
      <Command shouldFilter={false} label="Find or create a task" className="mt-1.5">
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Find or create a task"
          aria-label="Find or create a task"
        />
        <CommandList>
          {visibleTasks.map((task) => (
            <CommandItem key={task.id} value={`task-${task.id}`} onSelect={() => pick(task)}>
              <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{task.title}</span>
              <span className="text-caption shrink-0 text-muted-foreground">
                {taskDayLabel(task.plannedAt, dayStart)}
              </span>
            </CommandItem>
          ))}

          {canCreate && (
            <CommandItem value={`create-${term}`} onSelect={create}>
              <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">Create “{term}”</span>
            </CommandItem>
          )}
        </CommandList>

        {showReserved && (
          <p className="text-caption px-1.5 py-1.5 text-muted-foreground">Already in this plan.</p>
        )}

        {!isLoading && visibleTasks.length === 0 && !canCreate && !showReserved && (
          <p className="text-caption px-1.5 py-1.5 text-muted-foreground">
            {isSearching ? 'No open tasks match.' : 'No open tasks on this day.'}
          </p>
        )}

        {isLoading && (
          <p className="text-caption px-1.5 py-1.5 text-muted-foreground">
            {isSearching ? 'Searching…' : 'Loading tasks…'}
          </p>
        )}
      </Command>
    </div>
  )
}

function findExactTitle(tasks: Task[], title: string): Task | undefined {
  return tasks.find((task) => sameTitle(task.title, title))
}

function sameTitle(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}
