import { describe, expect, it } from "vitest"
import { generatePiece } from "./piece"
import { isInsideSheet } from "./geometry"
import { FAMILIES } from "./families"

const START = 29_807_000
const COUNT = 240
const WARM_UP = 6
const MEDIAN_BUDGET_MS = 100
const WORST_CASE_BUDGET_MS = 800

describe("generation sweep", () => {
  it("generates consecutive minutes quickly, in bounds and deterministically", () => {
    const seen = new Set<string>()
    const durations: number[] = []
    for (let offset = 0; offset < WARM_UP; offset += 1) generatePiece(START - 1 - offset, FAMILIES)

    for (let offset = 0; offset < COUNT; offset += 1) {
      const minute = START + offset
      const started = performance.now()
      const piece = generatePiece(minute, FAMILIES)
      const elapsed = performance.now() - started
      durations.push(elapsed)

      expect(elapsed, `${piece.family} at minute ${minute} took ${elapsed}ms`).toBeLessThan(
        WORST_CASE_BUDGET_MS
      )
      expect(piece.strokes.length).toBeGreaterThanOrEqual(100)
      expect(piece.strokes.length).toBeLessThanOrEqual(8000)
      expect(piece.strokes.every((stroke) => stroke.pen < piece.inks.length)).toBe(true)
      expect(
        piece.strokes.every((stroke) => stroke.points.every((point) => isInsideSheet(point, 0.05)))
      ).toBe(true)

      seen.add(piece.family)
      expect(generatePiece(minute, [...FAMILIES])).toEqual(piece)
    }
    expect(seen.size).toBe(FAMILIES.length)
    const sorted = [...durations].sort((a, b) => a - b)
    expect(sorted[Math.floor(sorted.length / 2)]).toBeLessThan(MEDIAN_BUDGET_MS)
  }, 60_000)
})
