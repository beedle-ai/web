import type { Point, Rng, Stroke } from "../types"
import { SHEET_MARGIN } from "../types"

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const CONTENT_MARGIN = SHEET_MARGIN + 0.008

export function drawableRect(margin = CONTENT_MARGIN): Rect {
  return { x: margin, y: margin, width: 1 - margin * 2, height: 1 - margin * 2 }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function rectCentre(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

export function rectOutlineStroke(rect: Rect, pen: number, width?: number): Stroke {
  const points = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x, y: rect.y },
  ]
  return { pen, points, width }
}

export function clipLineToRect(origin: Point, direction: Point, rect: Rect): [Point, Point] | null {
  let tMin = -Infinity
  let tMax = Infinity

  const clipAxis = (p: number, d: number, low: number, high: number): boolean => {
    if (Math.abs(d) < 1e-12) return p >= low && p <= high
    let t0 = (low - p) / d
    let t1 = (high - p) / d
    if (t0 > t1) [t0, t1] = [t1, t0]
    tMin = Math.max(tMin, t0)
    tMax = Math.min(tMax, t1)
    return tMin <= tMax
  }

  if (!clipAxis(origin.x, direction.x, rect.x, rect.x + rect.width)) return null
  if (!clipAxis(origin.y, direction.y, rect.y, rect.y + rect.height)) return null
  if (tMin > tMax) return null

  return [
    { x: origin.x + direction.x * tMin, y: origin.y + direction.y * tMin },
    { x: origin.x + direction.x * tMax, y: origin.y + direction.y * tMax },
  ]
}

export function hatchLines(
  rect: Rect,
  angleDegrees: number,
  spacing: number,
  pen: number,
  width?: number
): Stroke[] {
  const angle = (angleDegrees * Math.PI) / 180
  const direction = { x: Math.cos(angle), y: Math.sin(angle) }
  const normal = { x: -direction.y, y: direction.x }
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x + rect.width, y: rect.y + rect.height },
  ]
  const projections = corners.map((corner) => corner.x * normal.x + corner.y * normal.y)
  const minProjection = Math.min(...projections)
  const maxProjection = Math.max(...projections)

  const strokes: Stroke[] = []
  for (let offset = minProjection + spacing / 2; offset <= maxProjection; offset += spacing) {
    const origin = { x: normal.x * offset, y: normal.y * offset }
    const segment = clipLineToRect(origin, direction, rect)
    if (!segment) continue
    strokes.push({ pen, points: segment, width })
  }
  return strokes
}

export function isInsideRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

export function clipPolylineToRect(points: readonly Point[], rect: Rect): Point[][] {
  const pieces: Point[][] = []
  let current: Point[] = []
  for (const point of points) {
    if (isInsideRect(point, rect)) {
      current.push(point)
      continue
    }
    if (current.length > 1) pieces.push(current)
    current = []
  }
  if (current.length > 1) pieces.push(current)
  return pieces
}

export function concentricInsets(rect: Rect, step: number, pen: number, width?: number): Stroke[] {
  const strokes: Stroke[] = []
  let inset = step / 2
  while (rect.width - inset * 2 > step && rect.height - inset * 2 > step) {
    const inner: Rect = {
      x: rect.x + inset,
      y: rect.y + inset,
      width: rect.width - inset * 2,
      height: rect.height - inset * 2,
    }
    strokes.push(rectOutlineStroke(inner, pen, width))
    inset += step
  }
  return strokes
}

export function arcPoints(
  centre: Point,
  radius: number,
  startAngle: number,
  endAngle: number,
  spacing: number
): Point[] {
  const arcLength = Math.abs(endAngle - startAngle) * radius
  const steps = Math.max(3, Math.ceil(arcLength / spacing))
  const points: Point[] = []
  for (let step = 0; step <= steps; step += 1) {
    const angle = startAngle + ((endAngle - startAngle) * step) / steps
    points.push({ x: centre.x + Math.cos(angle) * radius, y: centre.y + Math.sin(angle) * radius })
  }
  return points
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function boundsOf(points: readonly Point[]): Bounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of points) {
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }
  return { minX, minY, maxX, maxY }
}

export function fitPointsToSheet(points: readonly Point[], margin = CONTENT_MARGIN): Point[] {
  const bounds = boundsOf(points)
  const spanX = bounds.maxX - bounds.minX || 1
  const spanY = bounds.maxY - bounds.minY || 1
  const span = Math.max(spanX, spanY)
  const available = 1 - margin * 2
  const scale = available / span
  const centreX = (bounds.minX + bounds.maxX) / 2
  const centreY = (bounds.minY + bounds.maxY) / 2
  return points.map((point) => ({
    x: 0.5 + (point.x - centreX) * scale,
    y: 0.5 + (point.y - centreY) * scale,
  }))
}

export function pickIndex(rng: Rng, count: number): number {
  return rng.int(0, count - 1)
}
