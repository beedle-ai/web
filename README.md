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
- `/m/[id]/svg` — the drawing as a downloadable SVG file.
- `/m/[id]/opengraph-image` — the Open Graph image for that minute.
- `/archive` — a day of minutes as a 60 × 24 field of swatches, `?date=YYYY-MM-DD`.

## Architecture

```
lib/gen/            pure generation: prng, noise, minute maths, inks, families, piece
lib/render/         pure renderers: piece → SVG string; canvas progressive painter
components/         sheet, ink dye, numerals, annotations, controls, hud, theme
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
