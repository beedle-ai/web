import { describe, expect, it } from "vitest"
import { generatePiece } from "./piece"
import { FAMILIES } from "./families"
import { isInsideSheet } from "./geometry"
import type { Family } from "./types"

const fakeFamily = (name: Family["name"], count: number): Family => ({
  name,
  weight: 1,
  generate: ({ rng, penCount }) =>
    Array.from({ length: count }, () => ({
      pen: rng.int(0, penCount - 1),
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.5, y: 0.5 },
      ],
    })),
})

describe("generatePiece", () => {
  it("is deterministic for a minute", () => {
    const a = generatePiece(29_807_862, [fakeFamily("streams", 20)])
    const b = generatePiece(29_807_862, [fakeFamily("streams", 20)])
    expect(a).toEqual(b)
    expect(a.id).toBe("20260903-2142")
  })

  it("orders strokes by pen and totals their length", () => {
    const piece = generatePiece(1234, [fakeFamily("weave", 40)])
    const pens = piece.strokes.map((stroke) => stroke.pen)
    expect(pens).toEqual([...pens].sort((a, b) => a - b))
    expect(piece.totalLength).toBeCloseTo(40 * Math.hypot(0.4, 0.4))
    expect(piece.inks.length).toBeGreaterThanOrEqual(1)
    expect(piece.inks.length).toBeLessThanOrEqual(3)
  })
})

describe.each(FAMILIES.map((family) => [family.name, family] as const))(
  "family %s",
  (_, family) => {
    it("produces a plausible, in-bounds drawing for several minutes", () => {
      for (const minute of [0, 1, 29_807_862, 31_000_000]) {
        const piece = generatePiece(minute, [family])
        expect(piece.strokes.length).toBeGreaterThanOrEqual(100)
        expect(piece.strokes.length).toBeLessThanOrEqual(8000)
        for (const stroke of piece.strokes) {
          expect(stroke.points.length).toBeGreaterThanOrEqual(2)
          expect(stroke.pen).toBeGreaterThanOrEqual(0)
          expect(stroke.pen).toBeLessThan(piece.inks.length)
          for (const point of stroke.points) {
            expect(isInsideSheet(point, 0.05)).toBe(true)
          }
        }
      }
    })
  }
)
