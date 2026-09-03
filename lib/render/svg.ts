import type { Ink, Piece, Stroke } from "@/lib/gen/types"
import { DEFAULT_STROKE_WIDTH } from "@/lib/gen/types"
import { inkColour, PAPER } from "./paper"
import type { ThemeMode } from "./paper"

export interface SvgOptions {
  theme?: ThemeMode
  paper?: boolean
  size?: number
}

const UNSAFE_IDENTIFIER_CHARACTERS = /[^a-zA-Z0-9_-]/g

function safeIdentifier(value: string): string {
  return value.replace(UNSAFE_IDENTIFIER_CHARACTERS, "-")
}

function escapeXmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function round1(value: number): string {
  return value.toFixed(1)
}

function round2(value: number): string {
  return value.toFixed(2)
}

function strokePathData(stroke: Stroke, size: number): string {
  return stroke.points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${round1(point.x * size)} ${round1(point.y * size)}`
    )
    .join(" ")
}

function strokeWidthPx(stroke: Stroke, size: number): number {
  return (stroke.width ?? DEFAULT_STROKE_WIDTH) * size
}

function strokeElement(stroke: Stroke, size: number, groupWidth: number): string {
  const width = strokeWidthPx(stroke, size)
  const widthAttribute =
    round2(width) === round2(groupWidth) ? "" : ` stroke-width="${round2(width)}"`
  return `<path d="${strokePathData(stroke, size)}"${widthAttribute}/>`
}

function penGroupElement(
  pen: number,
  ink: Ink,
  strokes: readonly Stroke[],
  size: number,
  theme: ThemeMode
): string {
  const groupWidth = DEFAULT_STROKE_WIDTH * size
  const paths = strokes.map((stroke) => strokeElement(stroke, size, groupWidth)).join("")
  const colour = inkColour(ink, theme)
  return `<g id="pen-${pen}" data-ink="${safeIdentifier(ink.name)}" stroke="${colour}" stroke-width="${round2(groupWidth)}">${paths}</g>`
}

function strokesForPen(piece: Piece, pen: number): Stroke[] {
  return piece.strokes.filter((stroke) => stroke.pen === pen)
}

export function pieceToSvg(piece: Piece, options: SvgOptions = {}): string {
  const theme = options.theme ?? "light"
  const drawPaper = options.paper ?? true
  const size = options.size ?? 1000

  const groups = piece.inks
    .map((ink, pen) => penGroupElement(pen, ink, strokesForPen(piece, pen), size, theme))
    .join("")

  const paperRect = drawPaper
    ? `<rect width="${size}" height="${size}" fill="${PAPER[theme]}"/>`
    : ""
  const title = escapeXmlText(`${piece.id} — ${piece.family}`)

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    `<title>${title}</title>` +
    paperRect +
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${groups}</g>` +
    `</svg>`
  )
}
