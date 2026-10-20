import { api } from '@studytrack/backend/convex/_generated/api'
import { formatClock, toMinute } from '@studytrack/backend/convex/timeline/util'
import { useQuery } from 'convex/react'
import { Bell, BellOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDayStart } from '~/hooks/use-day-start'
import { useMounted } from '~/hooks/use-mounted'

// The notice fires when a planned session enters this window and has not been
// announced yet. A tab that opens mid-window still gets the notice.
const NOTICE_LEAD_MS = 10 * 60 * 1000
const CHECK_MS = 15_000
const MUTE_KEY = 'studytrack.notifications.muted'

type Permission = NotificationPermission | 'unsupported' | null

// The site-header bell: notification permission, mute, and the 10-minute warning
// for the caller's planned sessions. Permission is the browser's; mute is ours
// and lives in localStorage, so muting never touches the browser grant.
export function NotificationBell() {
  const mounted = useMounted()
  const dayStart = useDayStart()
  const plans = useQuery(api.plannedSessions.listMine, { dayStart })
  const [permission, setPermission] = useState<Permission>(null)
  const [muted, setMuted] = useState(false)
  const notified = useRef(new Set<string>())

  useEffect(() => {
    if (!mounted) return
    setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
    setMuted(localStorage.getItem(MUTE_KEY) === '1')
  }, [mounted])

  // A new Day starts a fresh set of plans and a fresh set of notices.
  useEffect(() => {
    notified.current.clear()
  }, [dayStart])

  const enabled = permission === 'granted' && !muted

  useEffect(() => {
    if (!enabled || plans === undefined) return

    const tick = () => {
      const now = Date.now()
      for (const plan of plans) {
        const startsIn = plan.plannedStart - now
        if (startsIn <= 0 || startsIn > NOTICE_LEAD_MS) continue
        if (notified.current.has(plan._id)) continue

        try {
          const notice = new Notification('Planned session in 10 minutes', {
            body: `${formatClock(toMinute(plan.plannedStart, dayStart))} – ${formatClock(
              toMinute(plan.plannedEnd, dayStart)
            )}. Time to get ready.`,
            tag: `plan-${plan._id}`,
          })
          notice.onclick = () => {
            window.focus()
            notice.close()
          }
          notified.current.add(plan._id)
        } catch (error) {
          console.error('[studytrack] notification failed', error)
        }
      }
    }

    tick()
    const id = setInterval(tick, CHECK_MS)
    return () => clearInterval(id)
  }, [enabled, plans, dayStart])

  const requestOrToggle = async () => {
    if (permission === 'unsupported' || permission === null) return

    // Denied and default both go back to the browser. Muting is only for a
    // permission that is already granted.
    if (permission !== 'granted') {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        setMuted(false)
        localStorage.setItem(MUTE_KEY, '0')
      }
      return
    }

    const next = !muted
    setMuted(next)
    localStorage.setItem(MUTE_KEY, next ? '1' : '0')
  }

  const struck = permission === 'denied' || (permission === 'granted' && muted)
  const label =
    permission === 'unsupported'
      ? 'Notifications are not supported in this browser'
      : permission === 'denied'
        ? 'Notifications are blocked by the browser — click to ask again'
        : permission === 'granted'
          ? muted
            ? 'Unmute planned-session notifications'
            : 'Mute planned-session notifications'
          : 'Enable planned-session notifications'

  return (
    <button
      type="button"
      onClick={() => void requestOrToggle()}
      disabled={!mounted || permission === 'unsupported'}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-secondary disabled:cursor-default disabled:opacity-40 ${
        enabled ? 'text-primary' : 'text-subtle-foreground hover:text-foreground'
      }`}
    >
      {struck || permission === 'unsupported' ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
    </button>
  )
}
