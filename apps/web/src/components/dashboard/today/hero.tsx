import { Play } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import type { Hero as HeroData } from './data'

export function Hero(props: HeroData) {
  if (props.live) {
    return (
      <section className="flex items-center gap-6 max-lg:flex-col max-lg:items-start max-lg:gap-4 lg:sticky lg:top-0 lg:z-10 lg:bg-background/80 lg:backdrop-blur">
        <div>
          {/* contract: single clock with seconds — yours; everyone else ticks per minute */}
          <div className="font-mono text-[44px] leading-none font-medium tracking-tight max-lg:text-[32px]">
            {props.h}
            <span className="text-subtle-foreground text-[0.62em]">h </span>
            {props.m}
            <span className="text-subtle-foreground text-[0.62em]">m </span>
            <span className="text-white/50">{props.s}</span>
            <span className="text-subtle-foreground text-[0.62em]">s</span>
          </div>
          <p className="text-subtle-foreground mt-1 text-xs">your session</p>
        </div>

        {/* the active task, promoted to the hero so the room can see what you're on */}
        <div className="flex min-w-0 items-center gap-3 self-stretch border-l border-primary/25 pl-6 max-lg:w-full max-lg:self-auto max-lg:border-l-0 max-lg:pl-0">
          <Checkbox className="h-7 w-7 shrink-0 rounded-lg border-primary/35" />
          <p className="from-foreground to-foreground/60 truncate bg-linear-to-b bg-clip-text text-3xl leading-tight font-semibold tracking-tight text-transparent max-lg:text-2xl">
            {props.now}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="flex items-center gap-4">
      <Button className="border-primary/35 bg-primary-tint text-primary hover:bg-primary/[0.22] gap-2 rounded-xl font-semibold">
        <Play className="h-3.5 w-3.5 fill-current" /> Start tracking
      </Button>
      <p className="text-muted-foreground text-xs">
        <b className="text-foreground font-medium">{props.together} studying together</b> · room
        opened {props.openedAt} · {props.streak} streak on the line
      </p>
    </section>
  )
}
