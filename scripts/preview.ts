import { mkdirSync, writeFileSync } from "node:fs"
import { execSync } from "node:child_process"
import { generatePiece } from "../lib/gen/piece"
import { FAMILIES } from "../lib/gen/families"
import type { Piece } from "../lib/gen/types"

const SIZE = 1000

function pieceToPreviewSvg(piece: Piece): string {
  const paths = piece.strokes
    .map((stroke) => {
      const d = stroke.points
        .map(
          (p, i) => `${i === 0 ? "M" : "L"}${(p.x * SIZE).toFixed(1)} ${(p.y * SIZE).toFixed(1)}`
        )
        .join("")
      const width = ((stroke.width ?? 0.0012) * SIZE).toFixed(2)
      return `<path d="${d}" stroke="${piece.inks[stroke.pen].light}" stroke-width="${width}"/>`
    })
    .join("\n")
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}"><rect width="${SIZE}" height="${SIZE}" fill="#f4f1ea"/><g fill="none" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`
}

const [familyArg, outDir = "previews", countArg = "6", startArg = "29807862"] =
  process.argv.slice(2)
const families = familyArg ? FAMILIES.filter((f) => f.name === familyArg) : FAMILIES
if (families.length === 0) throw new Error(`unknown family ${familyArg}`)
mkdirSync(outDir, { recursive: true })

for (const family of families) {
  for (let offset = 0; offset < Number(countArg); offset += 1) {
    const minute = Number(startArg) + offset
    const piece = generatePiece(minute, [family])
    const base = `${outDir}/${family.name}-${minute}`
    writeFileSync(`${base}.svg`, pieceToPreviewSvg(piece))
    execSync(`rsvg-convert -w 800 -h 800 "${base}.svg" -o "${base}.png"`)
    process.stdout.write(
      `${base}.png  strokes=${piece.strokes.length} inks=${piece.inks.map((i) => i.name).join(",")}\n`
    )
  }
}
