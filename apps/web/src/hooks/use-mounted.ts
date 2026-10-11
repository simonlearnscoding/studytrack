import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

// False during the server render and the first client paint, true from the next
// commit on. Use it to gate anything derived from the client clock so hydration
// never disagrees with the server's HTML.
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
