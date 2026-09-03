import type { Family, Noise, Point, Rng, Stroke } from "../types"
import { distance, isInsideSheet } from "../geometry"
import {
  SAFE_MARGIN,
  SpatialGrid,
  clamp,
  evenThresholds,
  lerp,
  penForValue,
  sheetCentre,
  shuffleInPlace,
} from "./shared"

const STYLES = ["masked", "gradient", "band", "open", "dual", "weighted"] as const
type StreamStyle = (typeof STYLES)[number]

const MIN_STROKE_LENGTH = 0.04
const CURL_EPSILON = 0.003

interface FieldParams {
  frequency: number
  baseAngle: number
  octaves: number
}

interface IntegrationParams {
  spacing: number
  stepSize: number
  maxLength: number
}

interface Region {
  contains: (point: Point) => boolean
}

const openRegion: Region = { contains: () => true }

function circleRegion(centre: Point, radius: number, inside: boolean): Region {
  return {
    contains: (point) => {
      const within = Math.hypot(point.x - centre.x, point.y - centre.y) <= radius
      return inside ? within : !within
    },
  }
}

function rectRegion(x0: number, y0: number, x1: number, y1: number, inside: boolean): Region {
  return {
    contains: (point) => {
      const within = point.x >= x0 && point.x <= x1 && point.y >= y0 && point.y <= y1
      return inside ? within : !within
    },
  }
}

function maskedRegion(rng: Rng): Region {
  const centre = { x: rng.range(0.4, 0.6), y: rng.range(0.4, 0.6) }
  const inside = rng.chance(0.65)
  if (rng.chance(0.5)) {
    return circleRegion(centre, rng.range(0.16, 0.34), inside)
  }
  const halfWidth = rng.range(0.14, 0.3)
  const halfHeight = rng.range(0.14, 0.3)
  return rectRegion(
    centre.x - halfWidth,
    centre.y - halfHeight,
    centre.x + halfWidth,
    centre.y + halfHeight,
    inside
  )
}

function bandRegion(rng: Rng): Region {
  const angle = rng.chance(0.6) ? 0 : rng.range(-0.35, 0.35)
  const normalX = -Math.sin(angle)
  const normalY = Math.cos(angle)
  const offset = rng.range(-0.12, 0.12)
  const halfWidth = rng.range(0.09, 0.17)
  return {
    contains: (point) => {
      const projected = (point.x - 0.5) * normalX + (point.y - 0.5) * normalY
      return Math.abs(projected - offset) <= halfWidth
    },
  }
}

function gradientSpacing(rng: Rng): (point: Point) => number {
  const angle = rng.range(0, Math.PI * 2)
  const axisX = Math.cos(angle)
  const axisY = Math.sin(angle)
  const maxSpacing = rng.range(0.024, 0.032)
  return (point) => {
    const projected = (point.x - 0.5) * axisX + (point.y - 0.5) * axisY
    const t = clamp(projected / 0.6 + 0.5, 0, 1)
    return lerp(0.006, maxSpacing, t)
  }
}

function randomField(rng: Rng, baseAngle: number): FieldParams {
  return {
    frequency: rng.range(1.5, 3),
    baseAngle,
    octaves: rng.int(1, 2),
  }
}

function fieldAngle(noise: Noise, point: Point, field: FieldParams): number {
  const x = point.x * field.frequency
  const y = point.y * field.frequency
  const north = noise.fbm(x, y + CURL_EPSILON, field.octaves)
  const south = noise.fbm(x, y - CURL_EPSILON, field.octaves)
  const east = noise.fbm(x + CURL_EPSILON, y, field.octaves)
  const west = noise.fbm(x - CURL_EPSILON, y, field.octaves)
  const gradientX = (east - west) / (2 * CURL_EPSILON)
  const gradientY = (north - south) / (2 * CURL_EPSILON)
  return Math.atan2(gradientX, -gradientY) + field.baseAngle
}

function stepPoint(point: Point, angle: number, direction: number, stepSize: number): Point {
  return {
    x: point.x + Math.cos(angle) * direction * stepSize,
    y: point.y + Math.sin(angle) * direction * stepSize,
  }
}

interface TraceResult {
  points: Point[]
  curvature: number
}

function traceHalf(
  seed: Point,
  direction: number,
  field: FieldParams,
  integration: IntegrationParams,
  noise: Noise,
  grid: SpatialGrid,
  region: Region
): TraceResult {
  const points: Point[] = []
  let current = seed
  let previousAngle: number | null = null
  let length = 0
  let curvatureTotal = 0
  let curvatureSamples = 0

  while (length < integration.maxLength) {
    const angle = fieldAngle(noise, current, field)
    const next = stepPoint(current, angle, direction, integration.stepSize)
    if (!isInsideSheet(next, SAFE_MARGIN)) break
    if (!region.contains(next)) break
    if (!grid.isFarFrom(next, integration.spacing)) break

    points.push(next)
    length += integration.stepSize
    if (previousAngle !== null) {
      curvatureTotal += Math.abs(angle - previousAngle)
      curvatureSamples += 1
    }
    previousAngle = angle
    current = next
  }

  return { points, curvature: curvatureSamples > 0 ? curvatureTotal / curvatureSamples : 0 }
}

function depositAlongLine(points: readonly Point[], spacing: number, grid: SpatialGrid): void {
  let sinceDeposit = spacing
  let previous = points[0]
  for (const point of points) {
    sinceDeposit += distance(previous, point)
    if (sinceDeposit >= spacing) {
      grid.insert(point)
      sinceDeposit = 0
    }
    previous = point
  }
}

function arcLength(points: readonly Point[]): number {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    total += distance(points[index - 1], points[index])
  }
  return total
}

function growStreamline(
  seed: Point,
  field: FieldParams,
  integration: IntegrationParams,
  noise: Noise,
  grid: SpatialGrid,
  region: Region
): TraceResult {
  const forward = traceHalf(seed, 1, field, integration, noise, grid, region)
  const backward = traceHalf(seed, -1, field, integration, noise, grid, region)
  const points = [...backward.points.reverse(), seed, ...forward.points]
  return { points, curvature: (forward.curvature + backward.curvature) / 2 }
}

function jitteredSeeds(rng: Rng, spacing: number): Point[] {
  const seeds: Point[] = []
  const cell = spacing * 3.2
  for (let x = SAFE_MARGIN; x <= 1 - SAFE_MARGIN; x += cell) {
    for (let y = SAFE_MARGIN; y <= 1 - SAFE_MARGIN; y += cell) {
      seeds.push({
        x: x + rng.range(-cell * 0.35, cell * 0.35),
        y: y + rng.range(-cell * 0.35, cell * 0.35),
      })
    }
  }
  return shuffleInPlace(seeds, rng.next)
}

function widthFromCurvature(curvature: number): number {
  return lerpClamped(curvature, 0, 0.6, 0.0008, 0.0022)
}

function lerpClamped(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1)
  return outMin + (outMax - outMin) * t
}

function choosePen(
  style: StreamStyle,
  penCount: number,
  seed: Point,
  centre: Point,
  band: number,
  curvature: number
): number {
  if (penCount <= 1) return 0
  if (style === "dual") return penForValue(band, evenThresholds(-0.5, 0.5, penCount))
  if (style === "masked" || style === "band") {
    const distanceFromCentre = Math.hypot(seed.x - centre.x, seed.y - centre.y)
    return penForValue(distanceFromCentre, evenThresholds(0, 0.6, penCount))
  }
  if (style === "weighted") return penForValue(curvature, evenThresholds(0, 0.5, penCount))
  return penForValue(seed.x, evenThresholds(SAFE_MARGIN, 1 - SAFE_MARGIN, penCount))
}

export const streams: Family = {
  name: "streams",
  weight: 1,
  generate: ({ rng, noise, penCount }) => {
    const style = rng.pick(STYLES)
    const baseSpacing = rng.range(0.007, 0.012)
    const stepSize = rng.range(0.005, 0.008)
    const maxLength = rng.range(0.5, 1.2)
    const baseAngle = rng.range(0, Math.PI * 2)
    const primaryField = randomField(rng, baseAngle)
    const secondaryField = randomField(rng, baseAngle + rng.range(1.2, 2.4))
    const bandFrequency = rng.range(1.5, 3)
    const region =
      style === "masked" ? maskedRegion(rng) : style === "band" ? bandRegion(rng) : openRegion
    const spacingAt = style === "gradient" ? gradientSpacing(rng) : () => baseSpacing
    const centre = sheetCentre()
    const grid = new SpatialGrid(baseSpacing)
    const strokes: Stroke[] = []

    const plantSeed = (seed: Point, spacingScale: number): void => {
      if (strokes.length >= 3200) return
      if (!region.contains(seed)) return
      const localSpacing = spacingAt(seed) * spacingScale
      if (!grid.isFarFrom(seed, localSpacing)) return

      const band = noise.fbm(seed.x * bandFrequency + 40, seed.y * bandFrequency + 40, 3)
      const field = style === "dual" && band > 0 ? secondaryField : primaryField
      const integration: IntegrationParams = { spacing: localSpacing, stepSize, maxLength }

      const { points, curvature } = growStreamline(seed, field, integration, noise, grid, region)
      if (points.length < 4) return
      if (arcLength(points) < MIN_STROKE_LENGTH) return
      depositAlongLine(points, localSpacing, grid)

      const pen = choosePen(style, penCount, seed, centre, band, curvature)
      const width = style === "weighted" ? widthFromCurvature(curvature) : undefined
      strokes.push(width === undefined ? { pen, points } : { pen, points, width })
    }

    for (const seed of jitteredSeeds(rng, baseSpacing)) plantSeed(seed, 1)

    const target = style === "masked" || style === "band" ? 400 : 700
    const randomSeed = (): Point => ({
      x: rng.range(SAFE_MARGIN, 1 - SAFE_MARGIN),
      y: rng.range(SAFE_MARGIN, 1 - SAFE_MARGIN),
    })

    let gapFillBudget = 8000
    while (strokes.length < target && gapFillBudget > 0) {
      gapFillBudget -= 1
      plantSeed(randomSeed(), 1)
    }

    let topUpScale = 1
    let topUpRounds = 0
    while (strokes.length < 100 && topUpRounds < 6) {
      topUpRounds += 1
      topUpScale *= 0.6
      for (let attempt = 0; attempt < 700 && strokes.length < 100; attempt += 1) {
        plantSeed(randomSeed(), topUpScale)
      }
    }

    return strokes
  },
}
