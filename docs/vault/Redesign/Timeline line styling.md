---
id: LD-2
status: todo
type: requirement
priority: B
area: redesign
---

# Timeline line styling

**In short:** the colour and feel of the lane lines — the session bars, the hour
gridlines, the plan outlines, the now-line.

## Owner's thinking

> The colour and feel of the lines.

One of the three named frontend areas. Not yet specified — needs a grill round.

## Current state

Today the code is **one hue per mode**, mock and tokens together: `app.css` defines
`--color-mode-cam/-screen/-voice/-manual/-cam-screen` and `mode-colors.ts` wires them
as `MODE_BAR`; the mock (`scenarios.ts`, the real-shaped `DashboardMember` payload,
which replaced the old hand-coloured `data.ts`) renders through those same classes,
so fixture and live agree. Styling goes through `app.css` tokens, no raw hex.

That is **not the decided design.** [[Session states and opacity]] (LD-4) settles the
shared scale on **one hue at many intensities** — a single intensity ladder ordered
`cameraAndScreenShare > camera = screenShare > voice > manual > pause` — which
**retires the per-mode hues** to intensity steps (amber kept only for `manual`,
pause neutral + dashed). The ladder is not built yet; [[Session states and opacity
spec]] (LD-15) is where its tokens get pinned.

## Open questions

- [x] **One hue, many intensities** (encode by strength) **vs one colour per mode**
      (encode by hue)? — **decided: one hue, many intensities**, the shared ladder in
      [[Session states and opacity]]. The per-mode `--color-mode-*` hues retire to
      intensity steps; amber stays for `manual`, pause is neutral + dashed.
- [ ] How loud should a **live** bar be (glow? saturation?) vs the same bar once
      **ended** — should ended sessions go fully neutral so only "now" is vivid?
      (The evidence purpose in [[Session states and opacity]] argues **no**.)
- [ ] **Gridline** strength and count: hourly, every 2h, faint enough to stay
      quiet.
- [ ] Where does **manual** sit — the amber "self-declared" token, or a weaker
      intensity of the study hue?
- [ ] **Token hygiene:** which new tokens (if any) land in `app.css`, and do they
      get a `/tokens` swatch?

## Related

- [[Lanes of the day]] · [[Timeline expansion logic]] · [[Session states and opacity]]
