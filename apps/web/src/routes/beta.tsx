import { createFileRoute } from '@tanstack/react-router'
import { TodayLayout } from '~/components/dashboard/today'

export const Route = createFileRoute('/beta')({
  component: TodayLayout,
})
