# T7 Evidence ladder and composite bar

---

id: LD-16
status: todo
type: requirement
priority: A
area: redesign
---

# T7 · Evidence ladder and composite bar

**What to build:** each session bar renders as a composite of its Partials at
their evidence intensities, replacing the single-mode bar. The ladder lands as
tokens, an ended session keeps its intensity, and the live bar keeps its glow.

**Blocked by:** T1 (LD-9) — the scenario harness and adapter.

**Status:** ready-for-agent

#ready-for-agent

- [ ] A session with mixed Partials renders one segment per Partial, each at its ladder intensity.
- [ ] The order `cameraAndScreenShare > camera = screenShare > voice > manual > Pause` is visible in the bar.
- [ ] An ended session keeps its intensity; only the live session glows.
- [ ] `modeIntensity` and `sessionSegments` are pure and unit-tested.
- [ ] The ladder lands as `app.css` tokens (one hue, many intensities; amber for `manual`; neutral for Pause; no raw hex) and the `/tokens` swatch is updated.
