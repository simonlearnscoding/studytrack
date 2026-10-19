---
name: design-tokens
description: The web design system — tokens, type-scale utilities, and shared patterns in apps/web/src/styles/app.css. Use when writing or reviewing any web UI: any className, color, font size, heading, timer, card, chip, radius, shadow, loading skeleton, or live indicator. Catches drift like font-bold, shadow-sm on cards, magic text-[Npx] sizes, and hand-rolled animate-ping/animate-pulse dots.
compatibility: opencode
---

## North star

`apps/web/src/styles/app.css` is the single source of truth for the look.
Before styling anything, check what already exists there; when a composite
repeats ~3 times, it earns a name in app.css — it does not get copy-pasted
a fourth time. The `/tokens` route (`apps/web/src/routes/tokens.tsx`) is
the living swatch page for reviewing the system.

## The type scale — roles, not elements

The tag carries the document outline; the class carries the look. Never
style a heading with a raw size: an `<h2>` may be a `text-title` or a
`text-label` depending on its role.

| Utility        | Size          | Use for                                   |
| -------------- | ------------- | ----------------------------------------- |
| `text-display` | 28→40px fluid | page and hero titles                      |
| `text-clock`   | 32→48px fluid | the session clock (unit suffixes in `em`) |
| `text-metric`  | 20→28px fluid | card/rail timers and counters             |
| `text-title`   | 18→22px fluid | card and section titles                   |
| `text-label`   | 10.5px fixed  | uppercase tracked micro-labels            |
| `text-body`    | 14px fixed    | body copy                                 |
| `text-caption` | 12px fixed    | muted meta / timestamps                   |

Fluid utilities are `clamp()`s spanning a 360→1920px viewport; label/body/
caption are fixed on purpose. Compose with `font-mono` for numerals — the
base layer forces tabular figures on all mono text so timers never jitter.

## Hard bans (drift we have already cleaned once)

- **`font-bold` / weight 700** — the shipped Space Grotesk has 400/500/600
  only; 700 is browser-synthesized fake bold. Max weight is 600.
- **`shadow-sm` on cards** — cards are flat: a hairline border on the card
  surface. Elevation tokens (`shadow-popover`, `shadow-overlay-bar`,
  `shadow-glow`) are for floating overlays only.
- **`text-[11px]`, `text-[10px]`, …** — no magic micro sizes. Chips and
  labels use `text-label` (or `text-caption`).
- **Hand-rolled `animate-ping` dots** — use `LiveDot`
  (`apps/web/src/components/dashboard/live-dot.tsx`). It colors itself from
  `currentColor` (pass `text-primary` etc.), takes a size via className, and
  hides the ring under `prefers-reduced-motion`.
- **Hand-rolled `animate-pulse` + `motion-reduce:` pairs** — use the
  `skeleton` class; the reduced-motion freeze is built in.

## Shared patterns

- **`card-surface`** (components layer) — border + card bg + radius token.
  Padding stays at the call site. Single-property overrides are safe:
  `card-surface border-primary/25` tints, `card-surface p-6` pads.
- **`skeleton`** — loading placeholder; add size + rounding only.
- **`LiveDot`** — liveness indicator (see bans above).

## Color, radius, and the theme

Dark-only; every color is a `--token` in `:root` surfaced as a utility
(`text-muted-foreground`, `bg-primary-tint`, …). No raw hex in components.
The neutrals carry a deliberate blue cast (hue ≈ 216–222) — do not
neutralize. Radii derive from `--radius` (12px); use the scale
(`rounded-lg`, `rounded-xl`, `rounded-2xl`), not arbitrary values.
`--primary` (emerald) marks every live/active state; `--gold` is the
longest-session badge only.

## Extending the system

1. Spot the same composite ~3 times → name it by **role**, not by element.
2. Add it to app.css: `@utility` for leaf utilities (no overrides
   expected), `@layer components` for overridable composites like
   `card-surface`.
3. Dogfood it: add a swatch to the `/tokens` route so it stays reviewable.
4. Roll out touch-only — convert the file you're in, never sweep.
