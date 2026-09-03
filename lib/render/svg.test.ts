import { describe, expect, it } from "vitest"
import type { Piece } from "@/lib/gen/types"
import { pieceToSvg } from "./svg"

function buildPiece(): Piece {
  return {
    id: "20260903-2142",
    minute: 29_807_862,
    seed: 1,
    family: "streams",
    inks: [
      { name: "indigo", light: "#22307a", dark: "#95a4ff" },
      { name: "vermilion", light: "#c9391f", dark: "#ff7452" },
    ],
    strokes: [
      {
        pen: 0,
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.30001, y: 0.40009 },
        ],
      },
      {
        pen: 0,
        points: [
          { x: 0.5, y: 0.5 },
          { x: 0.6, y: 0.6 },
        ],
        width: 0.004,
      },
      {
        pen: 1,
        points: [
          { x: 0.7, y: 0.1 },
          { x: 0.8, y: 0.2 },
          { x: 0.9, y: 0.1 },
        ],
      },
    ],
    totalLength: 1,
  }
}

describe("pieceToSvg", () => {
  it("produces a standalone svg document with a title", () => {
    const svg = pieceToSvg(buildPiece())
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain("<title>20260903-2142 — streams</title>")
  })

  it("creates one pen group per ink, in order, including empty ones", () => {
    const piece = buildPiece()
    const svg = pieceToSvg(piece)

    const penZero = svg.indexOf('<g id="pen-0"')
    const penOne = svg.indexOf('<g id="pen-1"')
    expect(penZero).toBeGreaterThanOrEqual(0)
    expect(penOne).toBeGreaterThan(penZero)

    expect(svg).toContain('data-ink="indigo"')
    expect(svg).toContain('data-ink="vermilion"')

    const emptyPiece: Piece = { ...piece, strokes: [] }
    const emptySvg = pieceToSvg(emptyPiece)
    expect(emptySvg).toContain(
      '<g id="pen-0" data-ink="indigo" stroke="#22307a" stroke-width="1.20"></g>'
    )
    expect(emptySvg).toContain(
      '<g id="pen-1" data-ink="vermilion" stroke="#c9391f" stroke-width="1.20"></g>'
    )
  })

  it("rounds path coordinates to one decimal place", () => {
    const svg = pieceToSvg(buildPiece())
    expect(svg).toContain("M100.0 200.0 L300.0 400.1")
  })

  it("only sets a per-path stroke width when it differs from the group default", () => {
    const svg = pieceToSvg(buildPiece())
    expect(svg).toContain('M100.0 200.0 L300.0 400.1"/>')
    expect(svg).toContain('stroke-width="4.00"')
  })

  it("selects colours by theme", () => {
    const piece = buildPiece()
    const light = pieceToSvg(piece, { theme: "light" })
    const dark = pieceToSvg(piece, { theme: "dark" })
    expect(light).toContain('stroke="#22307a"')
    expect(dark).toContain('stroke="#95a4ff"')
  })

  it("draws a paper background by default and omits it when disabled", () => {
    const piece = buildPiece()
    const withPaper = pieceToSvg(piece)
    const withoutPaper = pieceToSvg(piece, { paper: false })
    expect(withPaper).toContain('<rect width="1000" height="1000" fill="#f4f1ea"/>')
    expect(withoutPaper).not.toContain("<rect")
  })

  it("scales coordinates and stroke widths to the requested size", () => {
    const svg = pieceToSvg(buildPiece(), { size: 500 })
    expect(svg).toContain('viewBox="0 0 500 500" width="500" height="500"')
    expect(svg).toContain("M250.0 250.0 L300.0 300.0")
    expect(svg).toContain('stroke-width="0.60"')
    expect(svg).toContain('stroke-width="2.00"')
  })
})
