import { createFileRoute } from '@tanstack/react-router'
import { TodayLayout } from '~/components/dashboard/today-layout'

export const Route = createFileRoute('/beta')({
  component: TodayLayout,
})
