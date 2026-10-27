import { api } from '@studytrack/backend/convex/_generated/api'
import type { Id } from '@studytrack/backend/convex/_generated/dataModel'
import { planBlockDraftProposal } from '@studytrack/backend/convex/planBlocks/util'
import type { Task } from '@studytrack/backend/convex/tasks/types'
import { DASHBOARD_TIME_ZONE, nextDayStart } from '@studytrack/backend/convex/workSessions/util'
import { useMutation } from 'convex/react'
import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { planBlockWriteMessage } from '../timeline/timeline-popup/plan-block-write-message'
import {
  planBlockWindow,
  type PlanBlockFormValues,
  type PlanTaskSelection,
} from '../timeline/timeline-popup/plan-block-form'
import { DraftPlanBlockPopup } from '../timeline/timeline-popup/draft-plan-popup'

// The queue's own way into planning: a draft for today, prefilled with the next
// quarter-hour plus the lane's two-hour span when that window is free. A block
// that would collide opens blank instead, so Create never starts on a refusal.
export function PlanBlockButton({
  dayStart,
  now,
  isLoading,
  planBlocks,
  dayTasks,
  onCreated,
}: {
  dayStart: number
  now: number
  isLoading: boolean
  planBlocks: { plannedStart: number; plannedEnd: number }[]
  dayTasks: Task[] | undefined
  onCreated: (planBlockId: Id<'planBlock'>) => void
}) {
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const createPlanBlock = useMutation(api.planBlocks.create)

  const proposal = planBlockDraftProposal({
    dayStart,
    dayEnd: nextDayStart(dayStart, DASHBOARD_TIME_ZONE),
    now,
    planBlocks,
  })
  const hasNoRoom = proposal.kind === 'no-room'

  const openChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setCreateError(null)
      setIsCreating(false)
    }
  }

  const create = (values: PlanBlockFormValues, tasks: PlanTaskSelection) => {
    const window = planBlockWindow(values, dayStart)
    if (!window) return

    setIsCreating(true)
    setCreateError(null)
    void createPlanBlock({
      dayStart,
      title: values.title,
      plannedStart: window.startAt,
      plannedEnd: window.endAt,
      taskIds: tasks.taskIds,
      newTaskTitles: tasks.newTaskTitles,
    })
      .then((planBlockId) => {
        setOpen(false)
        setIsCreating(false)
        onCreated(planBlockId)
      })
      .catch((error) => {
        console.error('[studytrack] plan create failed', error)
        setCreateError(planBlockWriteMessage(error, 'Could not create the plan.'))
        setIsCreating(false)
      })
  }

  return (
    <div className="mb-4">
      <Popover open={open} onOpenChange={openChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center"
            disabled={isLoading || hasNoRoom}
            aria-describedby={hasNoRoom ? 'plan-block-no-room' : undefined}
          >
            <CalendarPlus className="h-4 w-4" aria-hidden />
            Plan a block
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          className="max-h-[70dvh] w-72 overflow-y-auto p-3"
        >
          <DraftPlanBlockPopup
            initialWindow={
              proposal.kind === 'window'
                ? { startAt: proposal.startAt, endAt: proposal.endAt }
                : null
            }
            dayStart={dayStart}
            now={now}
            dayTasks={dayTasks}
            onCreate={create}
            onCancel={() => openChange(false)}
            isCreating={isCreating}
            createError={createError}
          />
        </PopoverContent>
      </Popover>

      {hasNoRoom ? (
        <p id="plan-block-no-room" className="text-caption mt-1.5 px-1 text-muted-foreground">
          No time left today.
        </p>
      ) : null}
    </div>
  )
}
