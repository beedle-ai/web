import type { Point, Stroke } from "./types"
import { SHEET_MARGIN } from "./types"

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function strokeLength(stroke: Stroke): number {
  let total = 0
  for (let index = 1; index < stroke.points.length; index += 1) {
    total += distance(stroke.points[index - 1], stroke.points[index])
  }
  return total
}

export function isInsideSheet(point: Point, margin = SHEET_MARGIN): boolean {
  return point.x >= margin && point.x <= 1 - margin && point.y >= margin && point.y <= 1 - margin
}

export function clipStrokeToSheet(stroke: Stroke, margin = SHEET_MARGIN): Stroke[] {
  const pieces: Stroke[] = []
  let current: Point[] = []
  for (const point of stroke.points) {
    if (isInsideSheet(point, margin)) {
      current.push(point)
      continue
    }
    if (current.length > 1) pieces.push({ ...stroke, points: current })
    current = []
  }
  if (current.length > 1) pieces.push({ ...stroke, points: current })
  return pieces
}

export function circlePoints(centre: Point, radius: number, segments: number): Point[] {
  const points: Point[] = []
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2
    points.push({ x: centre.x + Math.cos(angle) * radius, y: centre.y + Math.sin(angle) * radius })
  }
  return points
}
