import { Plus } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { handleComposerKeyDown } from './hooks/use-task-composer-hotkey'

// The one-line way into a plan group. It owns only the draft and the refusal
// copy; the queue's `assignNewTask` creates and assigns in one write, so the
// live read lands the row and the group count follows. Every Enter variant adds
// here — placement belongs to the group, not to the main composer's shortcuts.
export function PlanBlockComposer({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const errorId = useId()
  const trimmedTitle = title.trim()

  const add = async () => {
    if (!trimmedTitle || isSubmittingRef.current) return

    const submittedTitle = title
    isSubmittingRef.current = true
    setIsSubmitting(true)
    setError(null)
    try {
      await onAdd(trimmedTitle)
      setTitle((current) => (current === submittedTitle ? '' : current))
    } catch (cause) {
      setError(addTaskErrorMessage(cause))
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
      inputRef.current?.focus()
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void add()
  }

  return (
    <div>
      <form
        onSubmit={submit}
        className="mt-1 flex items-center gap-1.5 border-t border-white/[0.06] px-1 pt-1.5 pb-1"
      >
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          disabled={!trimmedTitle || isSubmitting}
          aria-label="Add task to this block"
          className="size-7 shrink-0 rounded-md"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </Button>
        <Input
          ref={inputRef}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            if (error) setError(null)
          }}
          onKeyDown={(event) =>
            handleComposerKeyDown(
              event,
              () => void add(),
              () => {
                setTitle('')
                setError(null)
              }
            )
          }
          placeholder="Add a task to this block…"
          aria-label="Add a task to this block"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          maxLength={80}
          className="peer h-8 border-0 bg-transparent px-1 placeholder:text-hint focus-visible:ring-0 dark:bg-transparent"
        />
      </form>
      {error ? (
        <p id={errorId} role="alert" className="text-caption px-2 pb-1 text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

// The backend's refusals are already written for the member; only the ones the
// composer can explain stay visible, and anything unexpected gets the generic
// line instead of a stack-trace-shaped message.
function addTaskErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message === 'That plan has ended.') return message
  if (message.startsWith('A plan block can hold at most ')) return message
  return 'Could not add the task.'
}
