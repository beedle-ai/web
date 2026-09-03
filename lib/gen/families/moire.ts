import type { Family, FamilyContext, Point, Rng, Stroke } from "../types"
import { circlePoints, distance } from "../geometry"
import { SAFE_MARGIN, clamp, degreesToRadians, sheetCentre } from "./shared"

const STYLES = [
  "twinDisc",
  "hexTriple",
  "circleOverSheet",
  "overlappingDiscs",
  "ringMoire",
] as const
const MIN_SPACING = 0.012
const MAX_SPACING = 0.024

interface Line {
  origin: Point
  direction: Point
}

interface Constraint {
  normal: Point
  offset: number
}

type Region =
  | { kind: "circle"; centre: Point; radius: number }
  | { kind: "constraints"; constraints: readonly Constraint[] }

interface Shape {
  region: Region
  centre: Point
  perpendicularExtent: (angle: number) => number
}

function rectConstraints(x0: number, y0: number, x1: number, y1: number): Constraint[] {
  return [
    { normal: { x: 1, y: 0 }, offset: x1 },
    { normal: { x: -1, y: 0 }, offset: -x0 },
    { normal: { x: 0, y: 1 }, offset: y1 },
    { normal: { x: 0, y: -1 }, offset: -y0 },
  ]
}

function rectProjection(halfWidth: number, halfHeight: number): (angle: number) => number {
  return (angle) => Math.abs(halfWidth * Math.sin(angle)) + Math.abs(halfHeight * Math.cos(angle))
}

function rectShape(centre: Point, halfWidth: number, halfHeight: number): Shape {
  return {
    region: {
      kind: "constraints",
      constraints: rectConstraints(
        Math.max(SAFE_MARGIN, centre.x - halfWidth),
        Math.max(SAFE_MARGIN, centre.y - halfHeight),
        Math.min(1 - SAFE_MARGIN, centre.x + halfWidth),
        Math.min(1 - SAFE_MARGIN, centre.y + halfHeight)
      ),
    },
    centre,
    perpendicularExtent: rectProjection(halfWidth, halfHeight),
  }
}

function sheetShape(): Shape {
  const half = 0.5 - SAFE_MARGIN
  return rectShape(sheetCentre(), half, half)
}

function tallRectShape(rng: Rng): Shape {
  const halfWidth = rng.range(0.14, 0.22)
  const halfHeight = rng.range(0.3, 0.4)
  const centre = { x: 0.5 + rng.range(-0.03, 0.03), y: 0.5 + rng.range(-0.02, 0.02) }
  return rectShape(centre, halfWidth, halfHeight)
}

function discShape(rng: Rng, offCentre: boolean): Shape {
  const offsetRange = offCentre ? 0.1 : 0.02
  const centre = {
    x: 0.5 + rng.range(-offsetRange, offsetRange),
    y: 0.5 + rng.range(-offsetRange, offsetRange),
  }
  const maxRadius = 0.5 - SAFE_MARGIN - offsetRange
  const radius = rng.range(0.28, Math.min(0.38, maxRadius))
  return {
    region: { kind: "circle", centre, radius },
    centre,
    perpendicularExtent: () => radius,
  }
}

function spacingForExtent(rng: Rng, extent: number, minCount: number): number {
  const cap = clamp((2 * extent) / minCount, MIN_SPACING, MAX_SPACING)
  return rng.range(MIN_SPACING, cap)
}

function clipLineToCircle(line: Line, centre: Point, radius: number): [Point, Point] | null {
  const ox = line.origin.x - centre.x
  const oy = line.origin.y - centre.y
  const a = line.direction.x * line.direction.x + line.direction.y * line.direction.y
  const b = 2 * (ox * line.direction.x + oy * line.direction.y)
  const c = ox * ox + oy * oy - radius * radius
  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) return null
  const root = Math.sqrt(discriminant)
  const t0 = (-b - root) / (2 * a)
  const t1 = (-b + root) / (2 * a)
  return [
    { x: line.origin.x + line.direction.x * t0, y: line.origin.y + line.direction.y * t0 },
    { x: line.origin.x + line.direction.x * t1, y: line.origin.y + line.direction.y * t1 },
  ]
}

function clipLineToConstraints(
  line: Line,
  constraints: readonly Constraint[]
): [Point, Point] | null {
  let tMin = -Infinity
  let tMax = Infinity
  for (const { normal, offset } of constraints) {
    const denom = normal.x * line.direction.x + normal.y * line.direction.y
    const numerator = offset - (normal.x * line.origin.x + normal.y * line.origin.y)
    if (Math.abs(denom) < 1e-9) {
      if (numerator < 0) return null
      continue
    }
    const t = numerator / denom
    if (denom > 0) tMax = Math.min(tMax, t)
    else tMin = Math.max(tMin, t)
    if (tMin > tMax) return null
  }
  return [
    { x: line.origin.x + line.direction.x * tMin, y: line.origin.y + line.direction.y * tMin },
    { x: line.origin.x + line.direction.x * tMax, y: line.origin.y + line.direction.y * tMax },
  ]
}

function clipLineToRegion(line: Line, region: Region): [Point, Point] | null {
  if (region.kind === "circle") return clipLineToCircle(line, region.centre, region.radius)
  return clipLineToConstraints(line, region.constraints)
}

function gridLines(angle: number, spacing: number, phase: number, reference: Point): Line[] {
  const direction = { x: Math.cos(angle), y: Math.sin(angle) }
  const normal = { x: -direction.y, y: direction.x }
  const reach = Math.SQRT2
  const lines: Line[] = []
  for (let offset = -reach; offset <= reach; offset += spacing) {
    const shifted = offset + phase
    lines.push({
      origin: { x: reference.x + normal.x * shifted, y: reference.y + normal.y * shifted },
      direction,
    })
  }
  return lines
}

function straightGridStrokes(
  pen: number,
  angle: number,
  spacing: number,
  phase: number,
  reference: Point,
  region: Region
): Stroke[] {
  const strokes: Stroke[] = []
  for (const line of gridLines(angle, spacing, phase, reference)) {
    const segment = clipLineToRegion(line, region)
    if (!segment) continue
    const [a, b] = segment
    if (distance(a, b) < 0.01) continue
    strokes.push({ pen, points: [a, b] })
  }
  return strokes
}

function ringGridStrokes(
  pen: number,
  centre: Point,
  spacing: number,
  phase: number,
  maxRadius: number
): Stroke[] {
  const strokes: Stroke[] = []
  for (let radius = spacing + phase; radius <= maxRadius; radius += spacing) {
    if (radius <= 0) continue
    const segments = Math.max(24, Math.round((2 * Math.PI * radius) / 0.006))
    strokes.push({ pen, points: circlePoints(centre, radius, segments) })
  }
  return strokes
}

function relativeAngle(rng: Rng): number {
  const magnitude = degreesToRadians(rng.range(3, 9))
  return rng.chance(0.5) ? magnitude : -magnitude
}

function gridStrokesForShape(
  pen: number,
  shape: Shape,
  angle: number,
  phase: number,
  minCount: number,
  rng: Rng
): { strokes: Stroke[]; spacing: number } {
  const spacing = spacingForExtent(rng, shape.perpendicularExtent(angle), minCount)
  return {
    strokes: straightGridStrokes(pen, angle, spacing, phase, shape.centre, shape.region),
    spacing,
  }
}

function secondAngleAndSpacing(
  rng: Rng,
  shape: Shape,
  angleA: number,
  spacingA: number,
  minCount: number
): { angleB: number; spacingB: number } {
  if (rng.chance(0.5)) {
    const angleB = angleA + relativeAngle(rng)
    return { angleB, spacingB: spacingForExtent(rng, shape.perpendicularExtent(angleB), minCount) }
  }
  const ratio = rng.range(1.03, 1.08)
  return { angleB: angleA, spacingB: rng.chance(0.5) ? spacingA * ratio : spacingA / ratio }
}

function twinDiscMoire(rng: Rng, penCount: number): Stroke[] {
  const roll = rng.next()
  const shape =
    roll < 0.34 ? tallRectShape(rng) : roll < 0.67 ? discShape(rng, true) : discShape(rng, false)
  const minCount = 50
  const angleA = rng.range(0, Math.PI)
  const spacingA = spacingForExtent(rng, shape.perpendicularExtent(angleA), minCount)
  const { angleB, spacingB } = secondAngleAndSpacing(rng, shape, angleA, spacingA, minCount)
  const penB = penCount > 1 ? 1 : 0
  return [
    ...straightGridStrokes(0, angleA, spacingA, rng.range(0, spacingA), shape.centre, shape.region),
    ...straightGridStrokes(
      penB,
      angleB,
      spacingB,
      rng.range(0, spacingB),
      shape.centre,
      shape.region
    ),
  ]
}

function hexTripleMoire(rng: Rng, penCount: number): Stroke[] {
  const roll = rng.next()
  const shape = roll < 0.4 ? discShape(rng, false) : roll < 0.7 ? tallRectShape(rng) : sheetShape()
  const minCount = 35
  const angles = [0, Math.PI / 3, (2 * Math.PI) / 3]
  const strokes: Stroke[] = []
  angles.forEach((angle, index) => {
    const pen = index % penCount
    const { strokes: gridStrokes } = gridStrokesForShape(
      pen,
      shape,
      angle,
      rng.range(0, MAX_SPACING),
      minCount,
      rng
    )
    strokes.push(...gridStrokes)
  })
  return strokes
}

function ringMoirePattern(rng: Rng, penCount: number): Stroke[] {
  const spacing = rng.range(0.005, 0.008)
  const maxRadius = clamp(spacing * rng.int(90, 160), 0.24, 0.42)
  const centreA = { x: 0.5 + rng.range(-0.015, 0.015), y: 0.5 + rng.range(-0.015, 0.015) }
  const centreB = { x: 0.5 + rng.range(-0.015, 0.015), y: 0.5 + rng.range(-0.015, 0.015) }
  const penB = penCount > 1 ? 1 : 0
  return [
    ...ringGridStrokes(0, centreA, spacing, rng.range(0, spacing), maxRadius),
    ...ringGridStrokes(penB, centreB, spacing, rng.range(0, spacing), maxRadius),
  ]
}

function circleOverSheetMoire(rng: Rng, penCount: number): Stroke[] {
  const circle = discShape(rng, rng.chance(0.3))
  const sheet = sheetShape()
  const angleA = rng.range(0, Math.PI)
  const angleB = angleA + relativeAngle(rng)
  const spacingA = spacingForExtent(rng, circle.perpendicularExtent(angleA), 50)
  const spacingB = spacingForExtent(rng, sheet.perpendicularExtent(angleB), 45)
  const penB = penCount > 1 ? 1 : 0
  return [
    ...straightGridStrokes(
      0,
      angleA,
      spacingA,
      rng.range(0, spacingA),
      circle.centre,
      circle.region
    ),
    ...straightGridStrokes(
      penB,
      angleB,
      spacingB,
      rng.range(0, spacingB),
      sheet.centre,
      sheet.region
    ),
  ]
}

function overlappingDiscsMoire(rng: Rng, penCount: number): Stroke[] {
  const radius = rng.range(0.3, 0.36)
  const maxOffset = 0.5 - SAFE_MARGIN - radius
  const separation = clamp(radius * rng.range(0.5, 1), 0.04, maxOffset * 1.9)
  const direction = rng.range(0, Math.PI * 2)
  const half = separation / 2
  const centreA = { x: 0.5 + Math.cos(direction) * half, y: 0.5 + Math.sin(direction) * half }
  const centreB = { x: 0.5 - Math.cos(direction) * half, y: 0.5 - Math.sin(direction) * half }
  const regionA: Region = { kind: "circle", centre: centreA, radius }
  const regionB: Region = { kind: "circle", centre: centreB, radius }
  const minCount = 50
  const angleA = rng.range(0, Math.PI)
  const spacingA = spacingForExtent(rng, radius, minCount)
  const shapeB: Shape = { region: regionB, centre: centreB, perpendicularExtent: () => radius }
  const { angleB, spacingB } = secondAngleAndSpacing(rng, shapeB, angleA, spacingA, minCount)
  const penB = penCount > 1 ? 1 : 0
  return [
    ...straightGridStrokes(0, angleA, spacingA, rng.range(0, spacingA), centreA, regionA),
    ...straightGridStrokes(penB, angleB, spacingB, rng.range(0, spacingB), centreB, regionB),
  ]
}

const MIN_TOTAL_STROKES = 120

function ensureMinimumStrokes(strokes: Stroke[], rng: Rng, penCount: number): Stroke[] {
  if (strokes.length >= MIN_TOTAL_STROKES) return strokes
  const sheet = sheetShape()
  const pen = penCount > 1 ? rng.int(0, penCount - 1) : 0
  const angle = rng.range(0, Math.PI)
  const shortfall = MIN_TOTAL_STROKES - strokes.length + 30
  const spacing = spacingForExtent(rng, sheet.perpendicularExtent(angle), shortfall)
  const fill = straightGridStrokes(
    pen,
    angle,
    spacing,
    rng.range(0, spacing),
    sheet.centre,
    sheet.region
  )
  return [...strokes, ...fill]
}

function generate({ rng, penCount }: FamilyContext): Stroke[] {
  const style = rng.pick(STYLES)
  const strokes =
    style === "twinDisc"
      ? twinDiscMoire(rng, penCount)
      : style === "hexTriple"
        ? hexTripleMoire(rng, penCount)
        : style === "circleOverSheet"
          ? circleOverSheetMoire(rng, penCount)
          : style === "overlappingDiscs"
            ? overlappingDiscsMoire(rng, penCount)
            : ringMoirePattern(rng, penCount)
  return ensureMinimumStrokes(strokes, rng, penCount)
}

export const moire: Family = {
  name: "moire",
  weight: 1,
  generate,
}
