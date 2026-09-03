# beedle.ai — The Minute Plotter

Date: 2026-09-03

## Idea

beedle.ai is a pen plotter that never stops. Every minute of UTC time, from
1970-01-01 00:00 onwards, seeds one unique generative drawing. The homepage shows the
current minute's drawing being drawn, one stroke at a time, one pen at a time, and it
finishes exactly as the minute ends. Then a fresh sheet is loaded and the next drawing
begins. Anyone on Earth who opens the site at the same instant sees the same drawing at
the same stage.

Every minute that has already happened has a permalink and a downloadable SVG that
could be sent to a real plotter. Minutes that have not happened yet are blank sheets.

There is no other content. The site is the instrument.

## Feel

- Presentation: a square sheet of paper on a desk. The desk is a flat neutral. The
  sheet has a faint edge and shadow. Light theme: warm white paper, dark inks. Dark
  theme: black card, light inks. The theme changes the paper stock and ink variants,
  never the composition.
- Inks: a fixed set of named plotter inks. Each drawing uses one to three of them.
  The plotter draws one pen fully before changing to the next, exactly as a real one
  would.
- Type: Geist Mono everywhere, small, letter-spaced, low contrast. Reads like a
  printer's annotation, not a website.
- Motion: only the pen. The pen tip is a small ring in the current ink colour that
  travels along the stroke being drawn. Sheets crossfade at the minute boundary.
  Nothing else animates. `prefers-reduced-motion` keeps the progressive reveal (it is
  the content) but removes the crossfade and pen ring.

## Screen

```
 beedle.ai                                                 archive   ◐

 A new drawing every minute.
 The same drawing for everyone.

                     ┌────────────────────────────┐
                     │                            │
                     │                            │
                     │          (sheet)           │
                     │                            │
                     │                            │
                     └────────────────────────────┘
                      2026-09-03 21:42 UTC        No. 29 799 942
                      streams · indigo, vermilion         svg ↓

 ◀  now  ▶                                            21:42:34 local
 ──────────────────────────────────────────── progress (thin line)
```

- Wordmark top-left, two-line statement below it. `archive` and theme toggle top-right.
- Under the sheet, like a print's pencil annotation: the minute in UTC and its edition
  number (minutes since the epoch, thin-space grouped), then the family and the ink
  names, and an `svg` download link.
- Bottom: previous / now / next minute controls (also ArrowLeft, ArrowRight, and `n`),
  the visitor's local time, and a hairline progress bar across the full width showing
  the second within the minute. When viewing a past minute the bar is full and the
  controls show `now` as a return link. When viewing a future minute the sheet is blank
  with the words `not yet drawn`.
- Mobile: the sheet fills the width; annotations stack; controls stay reachable at the
  bottom.

## Routes

- `/` live: the current minute, drawn progressively, rolling over automatically.
- `/m/[id]` a fixed minute, `id` = `YYYYMMDD-HHMM` in UTC. Drawn with a fast
  (about 1.2 s) reveal, then static. Prev/next navigate between ids. Full metadata and
  an Open Graph image rendered from the same drawing.
- `/m/[id]/svg` returns the drawing as an SVG file (`Content-Disposition: attachment`).
- `/archive` a day of minutes as a 60 × 24 grid of swatches coloured by each minute's
  inks, defaulting to today in UTC, with a date input. Each swatch links to its minute.

## Architecture

```
lib/gen/            pure generation: prng, noise, minute maths, inks, families, piece
lib/render/         pure renderers: piece → SVG string; canvas progressive painter
components/         sheet, annotations, controls, hud, theme
app/                routes, layout, og image, svg route
```

### lib/gen contracts

```ts
interface Point {
  x: number
  y: number
} // unit square, 0..1
interface Stroke {
  pen: number
  points: Point[]
  width?: number
}
interface Ink {
  name: string
  light: string
  dark: string
}
interface Piece {
  id: string
  minute: number
  seed: number
  family: FamilyName
  inks: Ink[]
  strokes: Stroke[]
  totalLength: number
}
interface FamilyContext {
  rng: Rng
  noise: Noise
  penCount: number
}
interface Family {
  name: FamilyName
  weight: number
  generate(ctx): Stroke[]
}
```

`generatePiece(minute)` is deterministic: seed from the minute index, one `Rng`
(mulberry32), one seeded simplex `Noise`. It draws the ink count and inks first, then
picks the family by weight, calls `generate`, stable-sorts strokes by pen, computes
`totalLength`, and memoises by minute. Families must keep strokes inside a margin of
0.06 and produce between roughly 300 and 6000 strokes.

Families (all plotter-style polylines, no fills):

1. `streams`: evenly spaced streamlines through a curl-noise field, seeded from a
   jittered grid, terminated at the margin, at a max length, or when they come within a
   spacing distance of an existing line (spatial hash). Pens assigned by region.
2. `strata`: horizontal lines displaced by layered noise with hidden-line occlusion, so
   ridges hide what lies behind them. Sometimes only a central band is displaced.
3. `orbits`: non-overlapping circle packing; each circle filled with concentric rings,
   a spiral, or parallel hatching at a seeded angle.
4. `weave`: truchet arcs on a grid with several parallel offsets per tile; occasional
   tiles are diagonals or blanks; grid size and offset count are seeded.
5. `attractor`: a Clifford or De Jong attractor iterated, points binned into short
   dashes, framed to the sheet; sometimes two attractors in two pens.
6. `partition`: recursive rectangle subdivision with a seeded stopping rule; cells are
   hatched at 0°, 45°, 90° or cross-hatched, some left empty; gutters between cells.

### lib/render

- `pieceToSvg(piece, options)`: 1000 × 1000 user units, `stroke-linecap="round"`,
  one `<g>` per pen with `id="pen-N"` and the ink name, polylines as `<path d>`,
  theme-selectable colours, paper rectangle optional. Output must be plotter friendly.
- `SheetPainter` (canvas): takes a piece and a progress value 0..1 measured in cumulative
  stroke length, draws onto a device-pixel-ratio-aware canvas, keeps an offscreen layer
  of completed strokes so each frame only draws the delta, exposes the pen tip position
  and current pen index for the ring.

### Live timing

`progress = (now − minuteStart) / 60000`. A `useMinuteClock` hook returns the current
minute index and the fractional progress, ticking on animation frames while the tab is
visible and on a 1 s interval otherwise. At rollover the sheet component keeps the old
piece for a 600 ms crossfade.

## Removed

Everything in `components/`, `contexts/`, `lib/` (except `lib/utils.ts`), and
`app/api/`; the three, swr, radix, lucide and date-fns dependencies; the test panel env
flag. `next-themes`, Tailwind v4 and the tooling stay.

## Testing

vitest for `lib/gen` (determinism, bounds, stroke counts per family, minute id
round-trips) and `lib/render/svg` (valid structure, pen groups). `pnpm check-all` and
`pnpm build` pass. Browser verification of the live page across a rollover, a past
minute, a future minute, the archive, both themes, and a 390 px viewport.

## Design language: Ink Room

This replaces the "Feel" and "Screen" sections above wherever they conflict.

The interface is a print room whose walls are dyed by whatever is on the plotter. It is
loud in exactly two places, type and colour, and silent everywhere else.

### Principles

1. **The page is inked by the drawing.** The current piece's inks become CSS variables
   `--ink-0`, `--ink-1`, `--ink-2` (theme variant colours; missing inks fall back to
   `--ink-0`). Every accent on the page uses them: the giant numerals, the progress bar,
   the pen ring, link hover, text selection, focus rings, the archive swatches, and a
   faint tint of `--ink-0` mixed into the desk background (`color-mix` at 5–7%). At every
   minute rollover the whole page re-dyes with a 700 ms colour transition. That is the
   visible pen change.
2. **Type at two extremes, nothing in between.** Display: Syne 800 (Google Fonts), used
   only for the giant minute readout and the archive date, at sizes from 16vw down to 9vw,
   tight tracking, tabular numerals. Everything else is Geist Mono at 11–12 px with
   0.08em tracking. No 16–24 px "body" text exists anywhere.
3. **The numerals are the clock.** The giant `21:42` sits bottom-left, overlapping the
   sheet's lower-left corner, and is filled with `--ink-0` from the bottom up in
   proportion to the minute's progress (a two-stop linear gradient with `background-clip:
text`; the unfilled part is a 1px outline in `--ink-0` at 35% opacity, implemented
   with `-webkit-text-stroke` on a duplicate layer). When the minute completes the
   numerals are solid for an instant, then the next minute starts empty.
4. **Overlap, do not box.** Nothing has a card, a border radius or a panel. The sheet
   overlaps the numerals; the edition number runs vertically up the sheet's right edge in
   mono, rotated 90°, like a margin note; the annotation line hangs under the sheet's
   left corner; controls sit bottom-right. Asymmetric grid, generous empty space top-right.
5. **Texture, not decoration.** A fixed full-page SVG turbulence noise overlay at 4–6%
   opacity (`mix-blend-mode: multiply` light, `overlay` dark) gives the desk tooth. A
   1px hairline around the sheet in the ink at 25%. No shadows.
6. **The cursor is a pen.** On pointer devices the page cursor is a 12px crosshair SVG in
   `--ink-0` (CSS `cursor: url(...)` with a data URI regenerated when the ink changes);
   over links it is the same crosshair with a filled centre. Touch devices: default.
7. **Motion is mechanical.** Colour transitions 700 ms ease; the pen ring moves without
   easing; numerals fill continuously; the sheet crossfade is 600 ms. Hover states are
   instant. Nothing bounces, floats or parallaxes. `prefers-reduced-motion` removes the
   colour transition, the pen ring and the crossfade.

### Screen (desktop)

```
 beedle.ai                                                  archive   ◐
 a new drawing every minute
 the same drawing for everyone

                               ┌─────────────────────────────┐ N
                               │                             │ o
                               │                             │ .
                               │                             │
                               │          (sheet)            │ 2
                               │                             │ 9
                               │                             │
      ████████████             │                             │ 8
    ██ 21:42 ████████          │                             │ 0
  ████████████████████         └─────────────────────────────┘ 7
  (giant numerals, ink-filled  2026-09-03 21:42 utc · streams · indigo, vermilion · svg ↓
   bottom-up by progress)
                                                          ◀  now  ▶   21:42:34 local
 ───────────────────────── progress hairline in ink-0 ────────────────────────────────
```

The sheet is `min(78vh, 60vw)` square, positioned right of centre. The numerals are
`clamp(96px, 16vw, 260px)` tall, left-aligned at the page margin, baseline near the
bottom, and sit _behind_ the sheet (`z-index` lower) so the sheet's corner cuts into them.

### Screen (mobile, ≤ 640 px)

Sheet 92vw at the top under the wordmark; the numerals at 22vw below the sheet, left;
annotation under them; controls pinned bottom with safe-area inset; vertical edition
note becomes a horizontal line under the annotation.

### Archive

Date as Syne display at 9vw; beneath it the 60 × 24 field of 1440 swatches, each a
small vertical bar 3 px wide and 14 px tall (two or three stacked ink segments), hour
labels in mono down the left. Hover scales the bar to 2× and shows the minute id in the
corner. Future minutes are hairline outlines.

### Fixed minute page

Same as live, but the numerals are fully filled, the hairline is full, and `now` is a
link home. A future minute shows empty outlined numerals and `not yet drawn` in mono in
the sheet's centre.
