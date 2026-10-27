// The backend's window rules speak in domain terms; the popovers speak in the
// member's words. Shared by the lane and the task-pane draft so the two creation
// paths never explain the same refusal differently.
export function planBlockWriteMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('overlaps')) return 'That time is already planned.'
  if (message.includes('past')) return 'That time is in the past.'
  if (message.includes('started')) return 'This plan has started; only its title can change.'
  if (message.includes('15-minute')) return 'Times sit on 15-minute marks.'
  if (message.includes('inside its Day')) return 'Keep the plan inside its day.'
  return fallback
}
