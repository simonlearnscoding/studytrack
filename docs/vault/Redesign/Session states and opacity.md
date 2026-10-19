---
id: LD-4
status: done
type: requirement
priority: A
area: redesign
---

# Session states and opacity

**Decisions complete** — ready to spec. What is left is implementation detail the
spec pins (exact tokens, the opacity steps, the minimum segment width), not open
design.

**In short:** how a whole session reads as one block — the states inside it and how
they combine into one intensity that reports how much real studying happened.

## Owner's thinking

> I still need to think about the opacity of tracking. In a session there can be
> the following states: on a break, voice only, cam, screen share, both, manual
> tracking. Manual tracking and voice have same intensity, voice manual less(?),
> and break is obviously the least. We have to make sure it stays informative but
> also visually pleasing — either the opacity is the average of total focus during
> the session, or we directly use the right opacity for the right partial, or we
> average out every 30 min and make opacity based on that. Either way I will need
> to get grilled on that.

## Decisions

Settled in the grill:

- **Purpose — encode evidence, not emphasis.** Opacity reports _how much real
  studying happened_ behind a stretch, not how recent or vivid it is. Vividness
  (the live glow, the now-line) is a **separate** channel and is never bought with
  opacity.
- **Intensity order (visual), strongest → weakest:** `cameraAndScreenShare` >
  `camera` = `screenShare` > `voice` > `manual` > **Pause**. `both` is the top tier
  (and the future point system's most prestigious); the pair share one step;
  `manual` sits strictly below `voice` (declared vs observed); Pause is weakest.
- **Counting — Deep focus.** For statistics `camera`, `screenShare` and
  `cameraAndScreenShare` count as **Deep focus, equally**; only the _visual_ ladder
  (and a later point system) separates `both`. `GLOSSARY.md` `Deep focus` is
  updated to match — see Ripple.
- **Granularity — per Partial, direct.** One intensity per **Partial**, never a
  session average and never a 30-minute bucket. The bar is a **composite** of its
  partials; an average would erase the shape that makes the timeline worth reading.
- **Composite rendering.** Solid butt-joined segments, one per Partial; adjacent
  **same-mode** partials merge; a **minimum segment width** keeps a short blip
  visible. No smoothing or averaging of rapid toggles.
- **Pause is a visible band, not a gap.** The weakest band, inside the same
  Session, rendered **dashed**, with a thin continuous **spine** under every bar.
  The spine keeps a Session one object across its pauses; a gap _between_ two
  sessions simply has no spine.
- **Live vs ended.** An ended Session keeps its intensity (evidence does not
  fade); only the live glow and the now-line mark "now". A live session's open
  Partial follows its current mode directly — no average-so-far lag.
- **Shared scale with [[Timeline line styling]].** One intensity ladder drives
  both cards, and it is **one hue at many intensities**, not hue-per-mode —
  `camera = screenShare` share a step, so hue-per-mode has nowhere to put them.
  **Amber is reserved for `manual`** (the one self-declared outlier); **Pause is
  neutral + dashed**. This retires the other `--color-mode-*` hues to intensity
  steps.
- **Naming.** Canonical **Pause** in prose and UI; `break` stays only the stored
  enum literal.

## Ripple

- Counting `screenShare` as Deep focus has landed as [[ST-23 Deep focus counts
                        screen share]] (in-review). `DEEP_FOCUS_MODES` (`leaderboard/util.ts`) now
                        includes `screenShare`, so Standing rankings and the bot board moved with it —
                        and `Deep focus` now uses the same mode set as `Focus rate`
                        (`sessions/metrics.ts`, `FOCUS_MODES`).

## Raw states

| State           | Discord evidence | Note                                      |
| --------------- | ---------------- | ----------------------------------------- |
| Pause           | pause            | written as mode `break`; never study time |
| voice           | yes              | in channel, no cam/SS                     |
| camera          | yes              |                                           |
| screen share    | yes              |                                           |
| both (cam + SS) | yes              | strongest evidence, top visual tier       |
| manual          | no               | self-declared from the web                |

## Related

- [[Lanes of the day]] · [[Timeline line styling]] · [[data-model]]
