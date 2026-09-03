import type { Point } from "../types"
import { SHEET_MARGIN } from "../types"

export const SAFE_MARGIN = SHEET_MARGIN + 0.004

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function smoothstep(t: number): number {
  const clamped = clamp(t, 0, 1)
  return clamped * clamped * (3 - 2 * clamped)
}

export function sheetCentre(): Point {
  return { x: 0.5, y: 0.5 }
}

export function evenThresholds(min: number, max: number, count: number): number[] {
  const thresholds: number[] = []
  for (let index = 1; index < count; index += 1) {
    thresholds.push(min + ((max - min) * index) / count)
  }
  return thresholds
}

export function penForValue(value: number, thresholds: readonly number[]): number {
  let pen = 0
  for (const threshold of thresholds) {
    if (value < threshold) return pen
    pen += 1
  }
  return pen
}

export function shuffleInPlace<T>(items: T[], next: () => number): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1))
    ;[items[index], items[swap]] = [items[swap], items[index]]
  }
  return items
}

export class SpatialGrid {
  private readonly cells = new Map<string, Point[]>()

  constructor(private readonly cellSize: number) {}

  private key(cellX: number, cellY: number): string {
    return `${cellX}:${cellY}`
  }

  insert(point: Point): void {
    const cellX = Math.floor(point.x / this.cellSize)
    const cellY = Math.floor(point.y / this.cellSize)
    const key = this.key(cellX, cellY)
    const bucket = this.cells.get(key)
    if (bucket) bucket.push(point)
    else this.cells.set(key, [point])
  }

  isFarFrom(point: Point, minDistance: number): boolean {
    const cellX = Math.floor(point.x / this.cellSize)
    const cellY = Math.floor(point.y / this.cellSize)
    const limit = minDistance * minDistance
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const bucket = this.cells.get(this.key(cellX + dx, cellY + dy))
        if (!bucket) continue
        for (const other of bucket) {
          const distanceX = other.x - point.x
          const distanceY = other.y - point.y
          if (distanceX * distanceX + distanceY * distanceY < limit) return false
        }
      }
    }
    return true
  }
}

export interface Circle {
  x: number
  y: number
  radius: number
}

export class CirclePacker {
  private readonly circles: Circle[] = []
  private readonly cells = new Map<string, number[]>()
  private readonly cellSize: number

  constructor(private readonly maxRadius: number) {
    this.cellSize = Math.max(maxRadius * 2, 0.01)
  }

  private key(cellX: number, cellY: number): string {
    return `${cellX}:${cellY}`
  }

  private cellIndex(value: number): number {
    return Math.floor(value / this.cellSize)
  }

  fits(candidate: Circle, gap: number): boolean {
    const reach = candidate.radius + this.maxRadius + gap
    const minCellX = this.cellIndex(candidate.x - reach)
    const maxCellX = this.cellIndex(candidate.x + reach)
    const minCellY = this.cellIndex(candidate.y - reach)
    const maxCellY = this.cellIndex(candidate.y + reach)
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
        const indices = this.cells.get(this.key(cellX, cellY))
        if (!indices) continue
        for (const index of indices) {
          const other = this.circles[index]
          const minDistance = candidate.radius + other.radius + gap
          const distanceX = other.x - candidate.x
          const distanceY = other.y - candidate.y
          if (distanceX * distanceX + distanceY * distanceY < minDistance * minDistance)
            return false
        }
      }
    }
    return true
  }

  add(circle: Circle): void {
    const index = this.circles.length
    this.circles.push(circle)
    const minCellX = this.cellIndex(circle.x - circle.radius)
    const maxCellX = this.cellIndex(circle.x + circle.radius)
    const minCellY = this.cellIndex(circle.y - circle.radius)
    const maxCellY = this.cellIndex(circle.y + circle.radius)
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
        const key = this.key(cellX, cellY)
        const bucket = this.cells.get(key)
        if (bucket) bucket.push(index)
        else this.cells.set(key, [index])
      }
    }
  }

  get all(): readonly Circle[] {
    return this.circles
  }
}
