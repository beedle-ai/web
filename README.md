# beedle.ai — The Minute Plotter

A pen plotter that never stops. Every minute of UTC time seeds one unique generative
drawing. The homepage draws the current minute stroke by stroke, one pen at a time,
finishing exactly as the minute ends. Every past minute has a permalink and a
downloadable SVG; future minutes are blank sheets.

See `docs/superpowers/specs/2026-09-03-minute-plotter-design.md` for the full design.

## Routes

- `/` — the live minute, drawn progressively, rolling over automatically.
- `/m/[id]` — a fixed minute (`id` = `YYYYMMDD-HHMM` UTC), revealed once then static.
  Prev/next links between adjacent minutes, full metadata and an Open Graph image.
- `/m/[id]/svg` — the drawing as SVG. `?download=1` attaches it as a file; `?theme=dark`
  and `?paper=0` select the ink variant and drop the paper rectangle for embedding.
- `/m/[id]/opengraph-image` — the Open Graph image for that minute.
- `/archive` — a day of minutes as a 60 × 24 field of swatches, `?date=YYYY-MM-DD`, plus a
  "your minute" finder that jumps to any instant in the visitor's local time.
- `/today` — the wall: the last twenty-four hours as one drawing per hour.

## Sound

The plotter can be heard. The `sound` toggle in the controls bar enables a synthesised
pen-on-paper scratch tied to pen speed, a faint motor hum, a click on pen-down and a thunk
on pen change, all built with Web Audio in `lib/audio`. It is off by default and the
preference is remembered per browser.

## Architecture

```
lib/gen/            pure generation: prng, noise, minute maths, inks, families, piece
lib/render/         pure renderers: piece → SVG string; canvas progressive painter
lib/audio/          the plotter sound engine and its preference hook
components/         sheet, ink dye, numerals, annotations, controls, hud, wall sheet, theme
app/                routes, layout, og image, svg route
```

## Development

```bash
pnpm install
pnpm dev
```

## Checks

```bash
pnpm check-all    # format:check, lint, type-check, test
pnpm build
pnpm smoke        # starts the built app and checks every route responds correctly
```

## Preview generated pieces

```bash
pnpm preview [family] [outDir] [count] [startMinute]
```

Renders sample pieces to SVG/PNG (requires `rsvg-convert`) for eyeballing a family's
output without running the app.

## Production

```bash
pnpm build
pnpm start
```
