import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { TaskAction } from '../task-action'
import { RescheduleMenu } from './reschedule-menu'

// Todoist's row control: a calendar button that opens the quick Days and a month
// grid. Picking the Day the task already sits on just closes the popover.
export function RescheduleButton({
  taskDayStart,
  todayStart,
  onReschedule,
}: {
  taskDayStart: number
  todayStart: number
  onReschedule: (plannedAt: number) => void
}) {
  const [open, setOpen] = useState(false)

  const pickDay = (plannedAt: number) => {
    setOpen(false)
    if (plannedAt !== taskDayStart) onReschedule(plannedAt)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <TaskAction label="Reschedule task">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
        </TaskAction>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={6}
        collisionPadding={8}
        aria-label="Reschedule task"
        className="w-72 p-3"
      >
        <RescheduleMenu taskDayStart={taskDayStart} todayStart={todayStart} onPick={pickDay} />
      </PopoverContent>
    </Popover>
  )
}
