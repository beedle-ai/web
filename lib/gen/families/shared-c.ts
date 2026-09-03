import type { Noise, Point } from "../types"

export interface Segment {
  start: number
  end: number
}

export function visibleSegments(values: readonly number[], horizon: Float64Array): Segment[] {
  const segments: Segment[] = []
  let start = -1
  for (let index = 0; index < values.length; index += 1) {
    const visible = values[index] < horizon[index]
    if (visible) {
      if (start === -1) start = index
      horizon[index] = values[index]
      continue
    }
    if (start !== -1) {
      segments.push({ start, end: index - 1 })
      start = -1
    }
  }
  if (start !== -1) segments.push({ start, end: values.length - 1 })
  return segments
}

export function averageOf(values: readonly number[], segment: Segment): number {
  let total = 0
  for (let index = segment.start; index <= segment.end; index += 1) total += values[index]
  return total / (segment.end - segment.start + 1)
}

export function polarPoint(centre: Point, radius: number, angle: number): Point {
  return { x: centre.x + Math.cos(angle) * radius, y: centre.y + Math.sin(angle) * radius }
}

export function swapAxes(point: Point): Point {
  return { x: point.y, y: point.x }
}

export function rotatePoint(centre: Point, point: Point, angle: number): Point {
  const dx = point.x - centre.x
  const dy = point.y - centre.y
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: centre.x + dx * cos - dy * sin,
    y: centre.y + dx * sin + dy * cos,
  }
}

export function domainWarp(point: Point, noise: Noise, frequency: number, strength: number): Point {
  const dx = noise.fbm(point.x * frequency, point.y * frequency, 2) - 0.5
  const dy = noise.fbm(point.x * frequency + 31.7, point.y * frequency + 57.2, 2) - 0.5
  return { x: point.x + dx * strength, y: point.y + dy * strength }
}
