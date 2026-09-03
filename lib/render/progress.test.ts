import { describe, expect, it } from "vitest"
import { pointAtStrokeFraction, progressCursor } from "./progress"

describe("progressCursor", () => {
  const cumulative = Float64Array.from([10, 25, 25, 40])
  const totalLength = 40

  it("returns an empty cursor when there are no strokes", () => {
    expect(progressCursor(new Float64Array(0), 0, 0.5)).toEqual({
      strokeIndex: -1,
      strokeFraction: 0,
      completeStrokeCount: 0,
    })
  })

  it("returns an empty cursor when the piece has zero total length", () => {
    expect(progressCursor(Float64Array.from([0, 0]), 0, 0.5)).toEqual({
      strokeIndex: -1,
      strokeFraction: 0,
      completeStrokeCount: 0,
    })
  })

  it("starts at the first stroke with zero fraction", () => {
    expect(progressCursor(cumulative, totalLength, 0)).toEqual({
      strokeIndex: 0,
      strokeFraction: 0,
      completeStrokeCount: 0,
    })
  })

  it("finds the midpoint of the current stroke", () => {
    const cursor = progressCursor(cumulative, totalLength, 5 / 40)
    expect(cursor.strokeIndex).toBe(0)
    expect(cursor.strokeFraction).toBeCloseTo(0.5)
    expect(cursor.completeStrokeCount).toBe(0)
  })

  it("advances to the next stroke once the previous one is exceeded", () => {
    const cursor = progressCursor(cumulative, totalLength, 15 / 40)
    expect(cursor.strokeIndex).toBe(1)
    expect(cursor.strokeFraction).toBeCloseTo((15 - 10) / 15)
    expect(cursor.completeStrokeCount).toBe(1)
  })

  it("reaches the exact end of a stroke with a fraction of one", () => {
    const cursor = progressCursor(cumulative, totalLength, 25 / 40)
    expect(cursor.strokeIndex).toBe(1)
    expect(cursor.strokeFraction).toBe(1)
    expect(cursor.completeStrokeCount).toBe(1)
  })

  it("skips straight over a zero-length stroke once its start is passed", () => {
    const cursor = progressCursor(cumulative, totalLength, 25.5 / 40)
    expect(cursor.strokeIndex).toBe(3)
    expect(cursor.completeStrokeCount).toBe(3)
  })

  it("clamps progress above one to the final, fully complete stroke", () => {
    expect(progressCursor(cumulative, totalLength, 1.4)).toEqual({
      strokeIndex: 3,
      strokeFraction: 1,
      completeStrokeCount: 4,
    })
  })

  it("clamps progress below zero to the first stroke", () => {
    expect(progressCursor(cumulative, totalLength, -0.4)).toEqual({
      strokeIndex: 0,
      strokeFraction: 0,
      completeStrokeCount: 0,
    })
  })
})

describe("pointAtStrokeFraction", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ]
  const length = 20

  it("returns the start point at fraction zero", () => {
    expect(pointAtStrokeFraction(points, length, 0)).toEqual({ x: 0, y: 0 })
  })

  it("returns the end point at fraction one", () => {
    expect(pointAtStrokeFraction(points, length, 1)).toEqual({ x: 10, y: 10 })
  })

  it("interpolates within the first segment", () => {
    expect(pointAtStrokeFraction(points, length, 0.25)).toEqual({ x: 5, y: 0 })
  })

  it("interpolates within the second segment", () => {
    expect(pointAtStrokeFraction(points, length, 0.75)).toEqual({ x: 10, y: 5 })
  })

  it("returns the single point for a degenerate stroke", () => {
    expect(pointAtStrokeFraction([{ x: 3, y: 4 }], 0, 0.5)).toEqual({ x: 3, y: 4 })
  })

  it("returns the origin for an empty stroke", () => {
    expect(pointAtStrokeFraction([], 0, 0.5)).toEqual({ x: 0, y: 0 })
  })
})
