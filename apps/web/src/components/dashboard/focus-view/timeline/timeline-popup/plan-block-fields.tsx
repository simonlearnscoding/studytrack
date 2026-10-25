import { formatClock } from '@studytrack/backend/convex/timeline/util'
import { useState, type ReactNode } from 'react'
import { Input } from '~/components/ui/input'
import { parseClockText, type PlanBlockFormValues } from './plan-block-form'

// The three fields a draft and a stored plan share: an optional name, the two
// endpoints on the Day's clock, and the duration derived from them. Editing the
// total moves only the end; the start stays put.
export function PlanBlockFields({
  values,
  onChange,
  isWindowEditable,
  error,
  autoFocusTitle,
}: {
  values: PlanBlockFormValues
  onChange: (values: PlanBlockFormValues) => void
  isWindowEditable: boolean
  error?: string | null
  autoFocusTitle?: boolean
}) {
  const totalMin = values.endMin - values.startMin

  const setStart = (startMin: number) => onChange({ ...values, startMin })
  const setEnd = (endMin: number) => onChange({ ...values, endMin })
  const setTotal = (minutes: number) => onChange({ ...values, endMin: values.startMin + minutes })

  return (
    <div className="mt-2 flex flex-col gap-2">
      <Field label="Title (optional)">
        <Input
          autoFocus={autoFocusTitle}
          value={values.title}
          onChange={(event) => onChange({ ...values, title: event.target.value })}
          placeholder="What are you planning?"
          maxLength={80}
          className="h-8"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Start">
          <ClockField value={values.startMin} disabled={!isWindowEditable} onCommit={setStart} />
        </Field>
        <Field label="End">
          <ClockField value={values.endMin} disabled={!isWindowEditable} onCommit={setEnd} />
        </Field>
      </div>

      <Field label="Total (min)">
        <NumberField
          value={totalMin > 0 ? totalMin : ''}
          disabled={!isWindowEditable}
          onCommit={setTotal}
        />
      </Field>

      {error && <p className="text-caption text-destructive">{error}</p>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label">{label}</span>
      {children}
    </label>
  )
}

// A controlled text field with a local draft so a half-typed "14:0" is not
// rejected mid-keystroke. The field shows the normalized clock whenever it is
// not being edited, so a total edit updates the end immediately.
function ClockField({
  value,
  disabled,
  onCommit,
}: {
  value: number
  disabled: boolean
  onCommit: (minute: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? formatClock(value)

  const commit = () => {
    const minute = draft == null ? null : parseClockText(draft)
    setDraft(null)
    if (minute != null) onCommit(minute)
  }

  const change = (next: string) => {
    setDraft(next)
    const minute = parseClockText(next)
    if (minute != null) onCommit(minute)
  }

  return (
    <Input
      value={text}
      onFocus={() => setDraft(formatClock(value))}
      onChange={(event) => change(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      disabled={disabled}
      inputMode="numeric"
      placeholder="HH:MM"
      className="h-8 font-mono"
    />
  )
}

function NumberField({
  value,
  disabled,
  onCommit,
}: {
  value: number | ''
  disabled: boolean
  onCommit: (minutes: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? (value === '' ? '' : String(value))

  const commit = () => {
    const minutes = draft == null ? NaN : Number(draft)
    setDraft(null)
    if (Number.isInteger(minutes) && minutes > 0) onCommit(minutes)
  }

  const change = (next: string) => {
    setDraft(next)
    const minutes = Number(next)
    if (Number.isInteger(minutes) && minutes > 0) onCommit(minutes)
  }

  return (
    <Input
      value={text}
      onFocus={() => setDraft(value === '' ? '' : String(value))}
      onChange={(event) => change(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      disabled={disabled}
      inputMode="numeric"
      className="h-8 font-mono"
    />
  )
}
