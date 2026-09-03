import type { Family, Noise, Point, Rng, Stroke } from "../types"
import { circlePoints } from "../geometry"
import { CirclePacker, SAFE_MARGIN, clamp, evenThresholds, penForValue } from "./shared"

const PLACEMENT_STYLES = ["field", "disc", "clustered"] as const
type PlacementStyle = (typeof PLACEMENT_STYLES)[number]

const FILL_MODES = ["rings", "spiral", "hatch", "outline", "empty"] as const
type FillMode = (typeof FILL_MODES)[number]

const MIN_RADIUS = 0.01
const MAX_RADIUS = 0.18
const GAP = 0.004

interface PlacedCircle {
  x: number
  y: number
  radius: number
  fillMode: FillMode
  hatchAngle: number
  ringSpacing: number
}

interface Placement {
  point: (rng: Rng, radius: number) => Point | null
}

function uniformWithinSheet(rng: Rng, radius: number): Point | null {
  const low = SAFE_MARGIN + radius
  const high = 1 - SAFE_MARGIN - radius
  if (low > high) return null
  return { x: rng.range(low, high), y: rng.range(low, high) }
}

function fieldPlacement(): Placement {
  return { point: uniformWithinSheet }
}

function discPlacement(centre: Point, discRadius: number): Placement {
  return {
    point: (rng, radius) => {
      const reach = discRadius - radius
      if (reach <= 0) return null
      const angle = rng.range(0, Math.PI * 2)
      const distance = Math.sqrt(rng.next()) * reach
      const point = {
        x: centre.x + Math.cos(angle) * distance,
        y: centre.y + Math.sin(angle) * distance,
      }
      const low = SAFE_MARGIN + radius
      const high = 1 - SAFE_MARGIN - radius
      if (point.x < low || point.x > high || point.y < low || point.y > high) return null
      return point
    },
  }
}

function clusteredPlacement(noise: Noise, frequency: number): Placement {
  return {
    point: (rng, radius) => {
      const base = uniformWithinSheet(rng, radius)
      if (!base) return null
      const density = (noise.fbm(base.x * frequency, base.y * frequency, 3) + 1) / 2
      return rng.chance(density * density) ? base : null
    },
  }
}

function radiusSequence(rng: Rng, targetCount: number, maxRadius: number): number[] {
  const radii: number[] = []
  for (let index = 0; index < targetCount; index += 1) {
    const skew = rng.next() ** 2.2
    radii.push(MIN_RADIUS + (maxRadius - MIN_RADIUS) * skew)
  }
  return radii.sort((a, b) => b - a)
}

function chooseFillMode(rng: Rng): FillMode {
  const roll = rng.next()
  if (roll < 0.32) return "rings"
  if (roll < 0.56) return "spiral"
  if (roll < 0.8) return "hatch"
  if (roll < 0.92) return "outline"
  return "empty"
}

function ringStrokes(circle: PlacedCircle, pen: number): Stroke[] {
  const strokes: Stroke[] = []
  for (
    let radius = circle.radius;
    radius > circle.ringSpacing * 0.6;
    radius -= circle.ringSpacing
  ) {
    const segments = Math.max(16, Math.round((2 * Math.PI * radius) / 0.008))
    strokes.push({ pen, points: circlePoints({ x: circle.x, y: circle.y }, radius, segments) })
  }
  return strokes
}

function spiralStroke(circle: PlacedCircle, pen: number): Stroke {
  const turns = Math.max(3, Math.round(circle.radius / circle.ringSpacing))
  const maxAngle = turns * Math.PI * 2
  const growth = circle.radius / maxAngle
  const targetSpacing = 0.006
  const points: Point[] = [{ x: circle.x, y: circle.y }]

  let angle = 0
  while (angle < maxAngle) {
    const radius = growth * angle
    const step = clamp(targetSpacing / Math.max(radius, circle.ringSpacing * 0.5), 0.05, 0.4)
    angle += step
    const cappedAngle = Math.min(angle, maxAngle)
    const cappedRadius = growth * cappedAngle
    points.push({
      x: circle.x + Math.cos(cappedAngle) * cappedRadius,
      y: circle.y + Math.sin(cappedAngle) * cappedRadius,
    })
  }

  return { pen, points }
}

function hatchStrokes(circle: PlacedCircle, pen: number): Stroke[] {
  const strokes: Stroke[] = []
  const cos = Math.cos(circle.hatchAngle)
  const sin = Math.sin(circle.hatchAngle)
  for (
    let offset = -circle.radius + circle.ringSpacing / 2;
    offset < circle.radius;
    offset += circle.ringSpacing
  ) {
    const halfChord = Math.sqrt(Math.max(0, circle.radius * circle.radius - offset * offset))
    if (halfChord <= 0) continue
    const localStart = { x: -halfChord, y: offset }
    const localEnd = { x: halfChord, y: offset }
    strokes.push({
      pen,
      points: [
        {
          x: circle.x + localStart.x * cos - localStart.y * sin,
          y: circle.y + localStart.x * sin + localStart.y * cos,
        },
        {
          x: circle.x + localEnd.x * cos - localEnd.y * sin,
          y: circle.y + localEnd.x * sin + localEnd.y * cos,
        },
      ],
    })
  }
  return strokes
}

function outlineStroke(circle: PlacedCircle, pen: number): Stroke {
  const segments = Math.max(16, Math.round((2 * Math.PI * circle.radius) / 0.008))
  return { pen, points: circlePoints({ x: circle.x, y: circle.y }, circle.radius, segments) }
}

function strokesForCircle(circle: PlacedCircle, pen: number): Stroke[] {
  if (circle.fillMode === "rings") return [outlineStroke(circle, pen), ...ringStrokes(circle, pen)]
  if (circle.fillMode === "spiral") return [outlineStroke(circle, pen), spiralStroke(circle, pen)]
  if (circle.fillMode === "hatch") return [outlineStroke(circle, pen), ...hatchStrokes(circle, pen)]
  if (circle.fillMode === "outline") return [outlineStroke(circle, pen)]
  return []
}

function choosePen(rule: "size" | "fill", penCount: number, circle: PlacedCircle): number {
  if (penCount <= 1) return 0
  if (rule === "size")
    return penForValue(circle.radius, evenThresholds(MIN_RADIUS, MAX_RADIUS, penCount))
  const fillIndex = FILL_MODES.indexOf(circle.fillMode)
  return Math.min(penCount - 1, Math.floor((fillIndex / FILL_MODES.length) * penCount))
}

interface PlacementPlan {
  placement: Placement
  maxRadius: number
}

function buildPlacement(style: PlacementStyle, rng: Rng, noise: Noise): PlacementPlan {
  if (style === "disc") {
    const centre = { x: rng.range(0.42, 0.58), y: rng.range(0.42, 0.58) }
    const discRadius = rng.range(0.26, 0.42)
    return {
      placement: discPlacement(centre, discRadius),
      maxRadius: Math.min(MAX_RADIUS, discRadius * 0.22),
    }
  }
  if (style === "clustered") {
    return { placement: clusteredPlacement(noise, rng.range(1.2, 2.6)), maxRadius: MAX_RADIUS }
  }
  return { placement: fieldPlacement(), maxRadius: MAX_RADIUS }
}

export const orbits: Family = {
  name: "orbits",
  weight: 1,
  generate: ({ rng, noise, penCount }) => {
    const style = rng.pick(PLACEMENT_STYLES)
    const { placement, maxRadius } = buildPlacement(style, rng, noise)
    const targetCount = rng.int(80, 400)
    const globalHatchAngle = rng.range(0, Math.PI)
    const useGlobalAngle = rng.chance(0.5)
    const penRule = rng.chance(0.5) ? "size" : "fill"
    const packer = new CirclePacker(maxRadius)
    const placed: PlacedCircle[] = []
    const attemptsPerCircle = 40

    const tryPlace = (radius: number, forcedFillMode?: FillMode): boolean => {
      for (let attempt = 0; attempt < attemptsPerCircle; attempt += 1) {
        const point = placement.point(rng, radius)
        if (!point) continue
        const candidate = { x: point.x, y: point.y, radius }
        if (!packer.fits(candidate, GAP)) continue
        packer.add(candidate)
        placed.push({
          x: point.x,
          y: point.y,
          radius,
          fillMode: forcedFillMode ?? chooseFillMode(rng),
          hatchAngle: useGlobalAngle ? globalHatchAngle : rng.range(0, Math.PI),
          ringSpacing: rng.range(0.004, 0.01),
        })
        return true
      }
      return false
    }

    for (const radius of radiusSequence(rng, targetCount * 3, maxRadius)) {
      if (placed.length >= targetCount) break
      tryPlace(radius)
    }

    const strokes: Stroke[] = []
    for (const circle of placed) {
      const pen = choosePen(penRule, penCount, circle)
      strokes.push(...strokesForCircle(circle, pen))
    }

    const fillerRadius = clamp(maxRadius * 0.2, MIN_RADIUS * 2.5, 0.05)
    let topUpBudget = 3000
    while (strokes.length < 150 && topUpBudget > 0) {
      topUpBudget -= 1
      const before = placed.length
      tryPlace(fillerRadius, "rings")
      if (placed.length === before) continue
      const circle = placed[placed.length - 1]
      strokes.push(...strokesForCircle(circle, choosePen(penRule, penCount, circle)))
    }

    return strokes
  },
}
