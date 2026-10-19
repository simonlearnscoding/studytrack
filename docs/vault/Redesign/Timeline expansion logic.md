---
id: LD-1
status: done
type: requirement
priority: A
area: redesign
---

# Timeline expansion logic

**In short:** how the day axis sizes, which hours it shows, and how far you can
scroll — the responsive and day-window rules for the lanes.

**Decisions complete** — ready to spec. No open questions. **Shipped** as
[[Timeline expansion spec]] (LD-8) / T1–T6; the window decision was revised by
**ADR-0008** (one `00:00–06:00` night band, `06:00–24:00` core, `32px/h` floor).

## Owner's thinking

Quoted, lightly tidied:

> When the screen gets smaller the thing gets narrower, which is good, but at
> some point it gets too squashed. From that point it should refuse to get even
> smaller and become scrollable instead. By default on smaller screens the
> current time of day should be visible — scrolled all the way to the right.
>
> It feels unnatural for the day to start and end at midnight. Maybe it could
> start at like 4am? 5am? and end at 22:00. But then we need a way to smartly
> expand it. When I look at the site and it's after 22:00, just auto-expand it.
>
> I like how Hey Calendar auto-hides the night and then you can click to expand.
> I'd like to take over that functionality.

## Decisions

- **Day window:** fixed **05:00–22:00** at full scale, one definition shared
  across every breakpoint, no activity shifting. Fixed clock bounds make DST a
  non-issue.
- **Narrowing:** stop at a per-hour floor of **48px/h** (05:00–22:00 ≈ 816px, fits
  the xl centre column unscrolled, scrolls below ~lg); then scroll horizontally.
  Hour labels thin out toward the floor; the name column stays pinned.
- **Now-anchor:** **centre** "now" when the track overflows; snap on mount /
  window change, not on every tick.
- **Trigger:** **container queries**, not viewport breakpoints.
- **Collapse:** keep a full **00:00–24:00** axis; the night is rendered as two
  thin, independent bands — left **00:00–05:00**, right **22:00–24:00** — at
  ~28–32px, labelled, flanking the full-scale 05:00–22:00 middle. Click a band to
  expand that end.
- **Resize on expand:** px/h stays **fixed** — expanding grows the band to real
  scale and widens the axis (you scroll more); it does not rescale the axis to
  fit.
- **Auto-expand:** purely on the clock — now < 05:00 or ≥ 22:00 opens that end.
  A session / plan / done task inside a collapsed band shows a marker/count on the
  band instead of force-opening it. Once open, it stays open for the visit; a
  fresh load inside the window starts collapsed.
- **Persistence:** a _manual_ expand persists per user (localStorage);
  auto-expand is transient, not stored.
- **Edge centring:** clamp at the absolute ends (00:00 / 24:00); centre elsewhere.
- **Mobile:** same model — touch-sized bands, tap to expand, centre "now" via the
  lane's own initial `scrollLeft`, shared persistence.

## Facts / constraints

- The Day is midnight–midnight **Europe/Zurich**; the older `MemberTimeline` used
  that fixed axis. The current mock axis (`data.ts`) is 06:00–24:00 with `NOW = 72`.
- Tailwind v4 defaults: `lg` = 1024px, `xl` = 1280px (no custom screens).
- The track area already scrolls on `max-lg` inside `scrollerRef`, and a mirror
  keeps the pinned "you" lane in lockstep.
- **HEY Calendar** collapses a fixed nighttime of **22:00–06:00** (not
  configurable) and reveals it on click — the reference behaviour.

## Related

- [[Timeline expansion spec]] (LD-8) — the spec this card folds into
- [[Lanes of the day]] · [[Timeline line styling]] · [[Data contract and scenarios]]
