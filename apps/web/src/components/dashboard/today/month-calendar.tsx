import { useMounted } from '~/hooks/use-mounted'
import { useDateStore } from '~/state/date.store'
import { heatLevel, label } from './data'

export function MonthCalendar({
  month,
  streak,
  heat,
  todayIndex,
}: {
  month: string
  streak: string
  heat: number[]
  todayIndex: number
}) {
  const mounted = useMounted()
  const selectedDate = useDateStore((state) => state.selectedDate)
  const selectDate = useDateStore((state) => state.selectDate)
  // Pre-mount (SSR + first paint) fall back to the server-stable today marker so
  // the highlighted cell can't disagree between server and client.
  const selectedIndex = mounted ? selectedDate.getDate() - 1 : todayIndex

  const selectDay = (index: number) =>
    selectDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), index + 1))

  return (
    <section className="bg-card rounded-xl border p-4 max-lg:p-3.5">
      <div className="flex items-baseline gap-2 pb-2.5">
        <span className={label}>{month}</span>
        <b className="font-mono text-xs font-medium">{streak} streak</b>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="text-center text-[8px] tracking-wider text-white/25 uppercase">
            {d}
          </span>
        ))}
        {heat.map((v, i) => (
          <button
            key={i}
            type="button"
            onClick={() => selectDay(i)}
            className={`flex aspect-[1.5] cursor-pointer items-end rounded-md border border-white/[0.04] p-1 font-mono text-[8px] text-white/25 ${heatLevel[v]} ${i === selectedIndex ? 'ring-primary text-primary ring-1' : ''} ${i > todayIndex ? 'border-dashed opacity-45' : ''}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </section>
  )
}
