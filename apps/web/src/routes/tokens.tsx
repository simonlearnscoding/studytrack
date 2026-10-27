// TEMPORARY — token swatch route for review. Delete after the token PR lands.
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tokens')({
  component: Tokens,
})

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`h-16 rounded-lg border ${className}`} />
      <span className="font-mono text-xs text-subtle-foreground">{name}</span>
    </div>
  )
}

function Tokens() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-12 px-4 py-12 sm:px-6">
      <header className="space-y-2">
        <p className="text-label">Design tokens</p>
        <h1 className="text-display">Token swatches</h1>
        <p className="text-muted-foreground">
          Temporary review route. Surface stack, text ladder, actions, states.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-label">Surface stack</h2>
        <div className="rounded-xl border border-border bg-background p-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="rounded-lg border border-border bg-popover p-6 shadow-popover">
              <span className="text-sm text-muted-foreground">background → card → popover</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Swatch name="background" className="bg-background border-border" />
          <Swatch name="card" className="bg-card border-border" />
          <Swatch name="popover" className="bg-popover border-border" />
          <Swatch name="sidebar" className="bg-sidebar border-border" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-label">Text ladder</h2>
        <div className="space-y-2 rounded-xl border border-border bg-card p-6">
          <p className="text-foreground">Foreground — primary text</p>
          <p className="text-muted-foreground">Muted foreground — secondary text</p>
          <p className="text-subtle-foreground">Subtle foreground — timestamps, hints</p>
          <p className="text-hint">Hint — placeholders and disabled</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-label">Actions &amp; states</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            Primary
          </button>
          <button className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground">
            Secondary
          </button>
          <button className="inline-flex h-9 cursor-pointer items-center rounded-lg px-4 text-sm font-medium text-foreground hover:bg-secondary">
            Ghost
          </button>
          <button className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground">
            Destructive
          </button>
          <span className="inline-flex items-center rounded-full bg-primary-tint px-2.5 py-1 text-label text-primary">
            Now
          </span>
          <span className="inline-flex items-center rounded-full bg-destructive-tint px-2.5 py-1 text-label text-destructive">
            Soft destructive
          </span>
          <span className="inline-flex items-center rounded-full bg-gold/15 px-2.5 py-1 text-label text-gold">
            Longest
          </span>
          <span className="inline-flex items-center rounded-full bg-bronze/15 px-2.5 py-1 text-label text-bronze">
            Almost over
          </span>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-6">
          <span className="h-10 w-10 rounded-full bg-primary shadow-glow" />
          <span className="text-sm text-muted-foreground">Glow (live elements)</span>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-label">Mono — tabular numerals</h2>
        <div className="space-y-1 rounded-xl border border-border bg-card p-6">
          <p className="font-mono text-clock tabular-nums text-foreground">01:23:45 · 07:08:09</p>
          <p className="font-mono text-sm text-muted-foreground">
            1111111111 0000000000 8888888888
          </p>
          <p className="font-mono text-sm text-subtle-foreground">
            Lorem ipsum 1234567890 dolor sit amet
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-label">Radii</h2>
        <div className="flex flex-wrap items-end gap-3">
          {(['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-full'] as const).map(
            (r) => (
              <div
                key={r}
                className={`flex h-20 w-20 items-center justify-center border border-border bg-card font-mono text-xs text-subtle-foreground ${r}`}
              >
                {r.replace('rounded-', '')}
              </div>
            )
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-label">Overlay elevation</h2>
        <div className="flex flex-wrap gap-6 rounded-xl border border-border bg-card p-6">
          <div className="flex h-24 w-40 items-center justify-center rounded-lg border border-border bg-popover shadow-popover">
            <span className="text-xs text-muted-foreground">shadow-popover</span>
          </div>
          <div className="flex h-16 w-56 items-center justify-center rounded-lg border border-border bg-popover shadow-overlay-bar">
            <span className="text-xs text-muted-foreground">shadow-overlay-bar</span>
          </div>
        </div>
      </section>
    </div>
  )
}
