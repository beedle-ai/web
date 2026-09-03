import type { Point } from "@/lib/gen/types"
import { distance } from "@/lib/gen/geometry"

export interface ProgressCursor {
  strokeIndex: number
  strokeFraction: number
  completeStrokeCount: number
}

const EMPTY_CURSOR: ProgressCursor = { strokeIndex: -1, strokeFraction: 0, completeStrokeCount: 0 }

function findStrokeIndex(cumulative: Float64Array, targetLength: number): number {
  let low = 0
  let high = cumulative.length - 1
  while (low < high) {
    const mid = (low + high) >>> 1
    if (cumulative[mid] >= targetLength) high = mid
    else low = mid + 1
  }
  return low
}

export function progressCursor(
  cumulative: Float64Array,
  totalLength: number,
  progress: number
): ProgressCursor {
  if (cumulative.length === 0 || totalLength <= 0) return EMPTY_CURSOR

  const clamped = Math.min(1, Math.max(0, progress))

  if (clamped >= 1) {
    return {
      strokeIndex: cumulative.length - 1,
      strokeFraction: 1,
      completeStrokeCount: cumulative.length,
    }
  }

  const targetLength = clamped * totalLength
  const strokeIndex = findStrokeIndex(cumulative, targetLength)
  const startOffset = strokeIndex === 0 ? 0 : cumulative[strokeIndex - 1]
  const segmentLength = cumulative[strokeIndex] - startOffset
  const strokeFraction = segmentLength <= 0 ? 1 : (targetLength - startOffset) / segmentLength

  return { strokeIndex, strokeFraction, completeStrokeCount: strokeIndex }
}

export function pointAtStrokeFraction(
  points: readonly Point[],
  strokeLength: number,
  fraction: number
): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1 || fraction <= 0 || strokeLength <= 0) return points[0]
  if (fraction >= 1) return points[points.length - 1]

  const targetDistance = fraction * strokeLength
  let travelled = 0

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]
    const end = points[index]
    const segmentLength = distance(start, end)

    if (travelled + segmentLength >= targetDistance) {
      const segmentFraction = segmentLength <= 0 ? 0 : (targetDistance - travelled) / segmentLength
      return {
        x: start.x + (end.x - start.x) * segmentFraction,
        y: start.y + (end.y - start.y) * segmentFraction,
      }
    }

    travelled += segmentLength
  }

  return points[points.length - 1]
}
