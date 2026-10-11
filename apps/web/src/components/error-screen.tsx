import type { ErrorComponentProps } from '@tanstack/react-router'

// Router-level error boundary. Logs the full error (Vite mirrors client
// console output into the `pnpm dev` terminal) and shows it on screen instead
// of a blank/generic fallback.
export function ErrorScreen({ error, reset }: ErrorComponentProps) {
  console.error('[studytrack] route error:', error)
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-red-400">Something went wrong</h1>
      <pre className="max-h-96 overflow-auto rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-xs text-red-300">
        {detail}
      </pre>
      <button
        onClick={reset}
        className="inline-flex h-9 items-center rounded-md bg-neutral-100 px-4 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
      >
        Try again
      </button>
    </div>
  )
}
