import type { Family, Noise, Point, Rng, Stroke } from "../types"
import { SAFE_MARGIN, clamp, evenThresholds, penForValue, smoothstep } from "./shared"
import { type Segment, averageOf, polarPoint, swapAxes, visibleSegments } from "./shared-c"

type LinearStyle =
  | "rolling"
  | "mountain"
  | "pulsar"
  | "hill"
  | "twinHorizon"
  | "densityGradient"
  | "band"
  | "terrace"

type StrataStyle = LinearStyle | "dithered" | "radial" | "vertical"

const STYLES: readonly StrataStyle[] = [
  "rolling",
  "mountain",
  "pulsar",
  "hill",
  "twinHorizon",
  "densityGradient",
  "band",
  "terrace",
  "dithered",
  "radial",
  "vertical",
]

const VERTICAL_CANDIDATES: readonly LinearStyle[] = [
  "rolling",
  "mountain",
  "pulsar",
  "hill",
  "twinHorizon",
  "densityGradient",
  "band",
  "terrace",
]

interface ProfileStyle {
  weight: (rowFraction: number) => number
  heightAt: (columnFraction: number, row: number, rowFraction: number) => number
  rowFractionAt?: (row: number, lineCount: number) => number
  includeRow?: (row: number, rowFraction: number) => boolean
  quantiseStep?: number
  maxSlope?: number
  baselineAt: (rowFraction: number) => number
  pointAt: (columnFraction: number, value: number) => Point
  clampRange: readonly [number, number]
  penForSegment: (rowFraction: number, segment: Segment, heights: readonly number[]) => number
}

interface LinearBuild {
  lineCount: number
  columns: number
  style: ProfileStyle
}

function edgeTaper(rowFraction: number): number {
  const margin = 0.1
  if (rowFraction < margin) return smoothstep(rowFraction / margin)
  if (rowFraction > 1 - margin) return smoothstep((1 - rowFraction) / margin)
  return 1
}

function bandWeight(rowFraction: number, centre: number, width: number): number {
  const offset = (rowFraction - centre) / width
  return Math.exp(-4 * offset * offset)
}

function hillBump(x: number, centre: number, halfWidth: number): number {
  const t = clamp((x - centre) / halfWidth, -1, 1)
  return Math.cos((t * Math.PI) / 2) ** 2
}

function softAbs(value: number, softness: number): number {
  return Math.sqrt(value * value + softness * softness) - softness
}

function capSlope(heights: number[], maxSlope: number): void {
  for (let column = 1; column < heights.length; column += 1) {
    const delta = clamp(heights[column] - heights[column - 1], -maxSlope, maxSlope)
    heights[column] = heights[column - 1] + delta
  }
}

function makePenForSegment(
  penCount: number,
  useHeightFade: boolean,
  heightReference: number
): (rowFraction: number, segment: Segment, heights: readonly number[]) => number {
  if (penCount <= 1) return () => 0
  if (useHeightFade) {
    const thresholds = evenThresholds(0, heightReference * 0.7, penCount)
    return (_rowFraction, segment, heights) => penForValue(averageOf(heights, segment), thresholds)
  }
  const thresholds = evenThresholds(0, 1, penCount)
  return (rowFraction) => penForValue(rowFraction, thresholds)
}

function renderProfile(lineCount: number, columns: number, style: ProfileStyle): Stroke[] {
  const rowFractionAt = style.rowFractionAt ?? ((row, count) => row / (count - 1))
  const horizon = new Float64Array(columns).fill(Infinity)
  const strokes: Stroke[] = []

  for (let row = lineCount - 1; row >= 0; row -= 1) {
    const rowFraction = rowFractionAt(row, lineCount)
    if (style.includeRow && !style.includeRow(row, rowFraction)) continue

    const baseline = style.baselineAt(rowFraction)
    const heights = new Array<number>(columns)
    const values = new Array<number>(columns)

    for (let column = 0; column < columns; column += 1) {
      const columnFraction = column / (columns - 1)
      let height = style.heightAt(columnFraction, row, rowFraction) * style.weight(rowFraction)
      if (style.quantiseStep) height = Math.round(height / style.quantiseStep) * style.quantiseStep
      heights[column] = height
    }

    if (style.maxSlope !== undefined) capSlope(heights, style.maxSlope)

    for (let column = 0; column < columns; column += 1) {
      values[column] = clamp(baseline - heights[column], style.clampRange[0], style.clampRange[1])
    }

    const segments = visibleSegments(values, horizon)
    for (const segment of segments) {
      if (segment.end - segment.start < 1) continue
      const points: Point[] = []
      for (let column = segment.start; column <= segment.end; column += 1) {
        points.push(style.pointAt(column / (columns - 1), values[column]))
      }
      strokes.push({ pen: style.penForSegment(rowFraction, segment, heights), points })
    }
  }

  return strokes
}

function generateWithRetry(
  build: (lineCount: number) => Stroke[],
  initialLineCount: number,
  maxLineCount: number
): Stroke[] {
  let lineCount = initialLineCount
  let strokes = build(lineCount)
  while (strokes.length < 100 && lineCount < maxLineCount) {
    lineCount = Math.round(lineCount * 1.5)
    strokes = build(lineCount)
  }
  return strokes
}

function horizontalPointAt(columnFraction: number, value: number): Point {
  return { x: SAFE_MARGIN + columnFraction * (1 - 2 * SAFE_MARGIN), y: value }
}

function horizontalBaselineAt(rowFraction: number): number {
  return SAFE_MARGIN + rowFraction * (1 - 2 * SAFE_MARGIN)
}

const HORIZONTAL_CLAMP: readonly [number, number] = [SAFE_MARGIN, 1 - SAFE_MARGIN]

function buildRolling(rng: Rng, noise: Noise, penCount: number): LinearBuild {
  const amplitude = rng.range(0.02, 0.05)
  const frequency = rng.range(1.4, 3.4)
  const rowFrequency = rng.range(0.05, 0.18)
  const octaves = rng.int(2, 4)
  const penForSegment = makePenForSegment(penCount, rng.chance(0.4), amplitude)

  return {
    lineCount: rng.int(110, 160),
    columns: 220,
    style: {
      weight: edgeTaper,
      heightAt: (columnFraction, row) =>
        noise.fbm(columnFraction * frequency, row * rowFrequency, octaves) * amplitude,
      baselineAt: horizontalBaselineAt,
      pointAt: horizontalPointAt,
      clampRange: HORIZONTAL_CLAMP,
      penForSegment,
    },
  }
}

function buildMountain(rng: Rng, noise: Noise, penCount: number): LinearBuild {
  const amplitude = rng.range(0.16, 0.34)
  const frequency = rng.range(1.5, 3)
  const rowFrequency = rng.range(0.05, 0.14)
  const octaves = rng.int(1, 2)
  const softness = rng.range(0.08, 0.18)
  const penForSegment = makePenForSegment(penCount, rng.chance(0.4), amplitude)

  return {
    lineCount: rng.int(60, 110),
    columns: 220,
    style: {
      weight: edgeTaper,
      heightAt: (columnFraction, row) =>
        softAbs(noise.fbm(columnFraction * frequency, row * rowFrequency, octaves), softness) *
        amplitude,
      maxSlope: 0.02,
      baselineAt: horizontalBaselineAt,
      pointAt: horizontalPointAt,
      clampRange: HORIZONTAL_CLAMP,
      penForSegment,
    },
  }
}

function buildPulsar(rng: Rng, noise: Noise, penCount: number): LinearBuild {
  const amplitude = rng.range(0.16, 0.34)
  const frequency = rng.range(1.4, 3.4)
  const rowFrequency = rng.range(0.05, 0.18)
  const octaves = rng.int(2, 4)
  const bandCentre = rng.range(0.42, 0.58)
  const bandWidthValue = rng.range(0.06, 0.11)
  const bandFloor = 0.02
  const penForSegment = makePenForSegment(penCount, rng.chance(0.4), amplitude)

  return {
    lineCount: rng.int(70, 130),
    columns: 220,
    style: {
      weight: (rowFraction) =>
        edgeTaper(rowFraction) *
        Math.max(bandFloor, bandWeight(rowFraction, bandCentre, bandWidthValue)),
      heightAt: (columnFraction, row) =>
        Math.abs(noise.fbm(columnFraction * frequency, row * rowFrequency, octaves)) * amplitude,
      baselineAt: horizontalBaselineAt,
      pointAt: horizontalPointAt,
      clampRange: HORIZONTAL_CLAMP,
      penForSegment,
    },
  }
}

function buildHill(rng: Rng, noise: Noise, penCount: number): LinearBuild {
  const amplitude = rng.range(0.16, 0.34)
  const frequency = rng.range(1.4, 3.4)
  const rowFrequency = rng.range(0.05, 0.18)
  const octaves = rng.int(2, 4)
  const hillCentre = rng.range(0.3, 0.7)
  const hillHalfWidth = rng.range(0.22, 0.4)
  const penForSegment = makePenForSegment(penCount, rng.chance(0.4), amplitude)

  return {
    lineCount: rng.int(60, 100),
    columns: 220,
    style: {
      weight: edgeTaper,
      heightAt: (columnFraction, row) => {
        const bump = hillBump(columnFraction, hillCentre, hillHalfWidth)
        const texture = noise.fbm(columnFraction * frequency, row * rowFrequency, octaves)
        return amplitude * bump + amplitude * 0.12 * texture
      },
      baselineAt: horizontalBaselineAt,
      pointAt: horizontalPointAt,
      clampRange: HORIZONTAL_CLAMP,
      penForSegment,
    },
  }
}

function buildTwinHorizon(rng: Rng, noise: Noise, penCount: number): LinearBuild {
  const amplitude = rng.range(0.14, 0.28)
  const frequency = rng.range(1.5, 3)
  const rowFrequency = rng.range(0.05, 0.14)
  const octaves = rng.int(1, 2)
  const centreA = rng.range(0.14, 0.32)
  const centreB = rng.range(0.68, 0.86)
  const halfWidthA = rng.range(0.14, 0.24)
  const halfWidthB = rng.range(0.14, 0.24)
  const penForSegment = makePenForSegment(penCount, rng.chance(0.5), amplitude)

  return {
    lineCount: rng.int(55, 95),
    columns: 220,
    style: {
      weight: edgeTaper,
      heightAt: (columnFraction, row) => {
        const bumpA = hillBump(columnFraction, centreA, halfWidthA)
        const bumpB = hillBump(columnFraction, centreB, halfWidthB)
        const texture = noise.fbm(columnFraction * frequency, row * rowFrequency, octaves)
        return amplitude * Math.max(bumpA, bumpB) + amplitude * 0.1 * texture
      },
      maxSlope: 0.02,
      baselineAt: horizontalBaselineAt,
      pointAt: horizontalPointAt,
      clampRange: HORIZONTAL_CLAMP,
      penForSegment,
    },
  }
}

function buildDensityGradient(rng: Rng, noise: Noise, penCount: number): LinearBuild {
  const amplitude = rng.range(0.05, 0.16)
  const frequency = rng.range(1.6, 3.4)
  const rowFrequency = rng.range(0.06, 0.2)
  const octaves = rng.int(2, 4)
  const threshold = rng.range(0.35, 0.62)
  const penForSegment = makePenForSegment(penCount, rng.chance(0.3), amplitude)

  return {
    lineCount: rng.int(120, 160),
    columns: 220,
    style: {
      weight: edgeTaper,
      heightAt: (columnFraction, row) =>
        noise.fbm(columnFraction * frequency, row * rowFrequency, octaves) * amplitude,
      includeRow: (row, rowFraction) => rowFraction >= threshold || row % 2 === 0,
      baselineAt: horizontalBaselineAt,
      pointAt: horizontalPointAt,
      clampRange: HORIZONTAL_CLAMP,
      penForSegment,
    },
  }
}

function buildBand(rng: Rng, noise: Noise, penCount: number): LinearBuild {
  const amplitude = rng.range(0.02, 0.05)
  const frequency = rng.range(1.6, 3.6)
  const rowFrequency = rng.range(0.08, 0.22)
  const octaves = rng.int(2, 3)
  const bandSpan = rng.range(0.14, 0.26)
  const bandStart = rng.range(0.06, 0.94 - bandSpan)
  const penForSegment = makePenForSegment(penCount, rng.chance(0.4), amplitude)

  return {
    lineCount: rng.int(90, 150),
    columns: 220,
    style: {
      weight: () => 1,
      heightAt: (columnFraction, row) =>
        noise.fbm(columnFraction * frequency, row * rowFrequency, octaves) * amplitude,
      rowFractionAt: (row, lineCount) => bandStart + (row / (lineCount - 1)) * bandSpan,
      baselineAt: horizontalBaselineAt,
      pointAt: horizontalPointAt,
      clampRange: HORIZONTAL_CLAMP,
      penForSegment,
    },
  }
}

function buildTerrace(rng: Rng, noise: Noise, penCount: number): LinearBuild {
  const amplitude = rng.range(0.18, 0.32)
  const frequency = rng.range(1.2, 2.6)
  const rowFrequency = rng.range(0.06, 0.16)
  const octaves = rng.int(2, 3)
  const steps = rng.int(3, 7)
  const penForSegment = makePenForSegment(penCount, rng.chance(0.5), amplitude)

  return {
    lineCount: rng.int(35, 70),
    columns: 220,
    style: {
      weight: edgeTaper,
      heightAt: (columnFraction, row) =>
        Math.abs(noise.fbm(columnFraction * frequency, row * rowFrequency, octaves)) * amplitude,
      quantiseStep: amplitude / steps,
      baselineAt: horizontalBaselineAt,
      pointAt: horizontalPointAt,
      clampRange: HORIZONTAL_CLAMP,
      penForSegment,
    },
  }
}

const LINEAR_BUILDERS: Record<
  LinearStyle,
  (rng: Rng, noise: Noise, penCount: number) => LinearBuild
> = {
  rolling: buildRolling,
  mountain: buildMountain,
  pulsar: buildPulsar,
  hill: buildHill,
  twinHorizon: buildTwinHorizon,
  densityGradient: buildDensityGradient,
  band: buildBand,
  terrace: buildTerrace,
}

function generateLinearStyle(
  style: LinearStyle,
  rng: Rng,
  noise: Noise,
  penCount: number
): Stroke[] {
  const built = LINEAR_BUILDERS[style](rng, noise, penCount)
  return generateWithRetry(
    (lineCount) => renderProfile(lineCount, built.columns, built.style),
    built.lineCount,
    420
  )
}

function buildRadial(rng: Rng, noise: Noise, penCount: number): LinearBuild {
  const centre: Point = { x: rng.range(0.42, 0.58), y: rng.range(0.42, 0.58) }
  const marginDistance = Math.min(centre.x, centre.y, 1 - centre.x, 1 - centre.y) - SAFE_MARGIN
  const maxRadius = Math.max(marginDistance, 0.12)
  const minRadius = maxRadius * rng.range(0.05, 0.14)
  const amplitude = maxRadius * rng.range(0.08, 0.22)
  const frequency = rng.range(1.5, 3)
  const radialShift = rng.range(0.15, 0.4)
  const octaves = rng.int(1, 2)
  const penForSegment = makePenForSegment(penCount, rng.chance(0.4), amplitude)

  return {
    lineCount: rng.int(45, 90),
    columns: 240,
    style: {
      weight: edgeTaper,
      heightAt: (columnFraction, row) => {
        const angle = columnFraction * Math.PI * 2
        return (
          noise.fbm(
            Math.cos(angle) * frequency + row * radialShift,
            Math.sin(angle) * frequency,
            octaves
          ) * amplitude
        )
      },
      maxSlope: 0.02,
      baselineAt: (rowFraction) => minRadius + rowFraction * (maxRadius - minRadius),
      pointAt: (columnFraction, value) => polarPoint(centre, value, columnFraction * Math.PI * 2),
      clampRange: [minRadius, maxRadius],
      penForSegment,
    },
  }
}

function generateRadialStyle(rng: Rng, noise: Noise, penCount: number): Stroke[] {
  const built = buildRadial(rng, noise, penCount)
  return generateWithRetry(
    (lineCount) => renderProfile(lineCount, built.columns, built.style),
    built.lineCount,
    360
  )
}

interface DitheredParams {
  lineCount: number
  columns: number
  amplitude: number
  frequency: number
  rowFrequency: number
  octaves: number
  boundaryHeight: number
  ditherAmplitude: number
  ditherFrequency: number
}

function buildDitheredParams(rng: Rng): DitheredParams {
  return {
    lineCount: rng.int(80, 140),
    columns: 220,
    amplitude: rng.range(0.14, 0.3),
    frequency: rng.range(1.5, 3),
    rowFrequency: rng.range(0.05, 0.14),
    octaves: rng.int(1, 2),
    boundaryHeight: rng.range(-0.06, 0.06),
    ditherAmplitude: rng.range(0.02, 0.06),
    ditherFrequency: rng.range(3, 7),
  }
}

function ditheredHeightAt(
  noise: Noise,
  columnFraction: number,
  row: number,
  params: DitheredParams
): number {
  return (
    noise.fbm(columnFraction * params.frequency, row * params.rowFrequency, params.octaves) *
    params.amplitude
  )
}

function ditheredPenAt(
  noise: Noise,
  columnFraction: number,
  row: number,
  height: number,
  params: DitheredParams,
  penCount: number
): number {
  if (penCount <= 1) return 0
  const dither =
    (noise.fbm(columnFraction * params.ditherFrequency + 41, row * 0.31 + 17, 2) - 0.5) *
    2 *
    params.ditherAmplitude
  return height + dither > params.boundaryHeight ? 1 % penCount : 0
}

function ditheredRuns(
  noise: Noise,
  penCount: number,
  params: DitheredParams,
  row: number,
  heights: readonly number[],
  values: readonly number[],
  segment: Segment
): Stroke[] {
  const strokes: Stroke[] = []
  let runStart = segment.start
  let runPen = ditheredPenAt(
    noise,
    segment.start / (params.columns - 1),
    row,
    heights[segment.start],
    params,
    penCount
  )

  const flush = (end: number): void => {
    if (end - runStart < 1) return
    const points: Point[] = []
    for (let column = runStart; column <= end; column += 1) {
      points.push(horizontalPointAt(column / (params.columns - 1), values[column]))
    }
    strokes.push({ pen: runPen, points })
  }

  for (let column = segment.start + 1; column <= segment.end; column += 1) {
    const columnFraction = column / (params.columns - 1)
    const pen = ditheredPenAt(noise, columnFraction, row, heights[column], params, penCount)
    if (pen === runPen) continue
    flush(column - 1)
    runStart = column
    runPen = pen
  }
  flush(segment.end)
  return strokes
}

function renderDithered(noise: Noise, penCount: number, params: DitheredParams): Stroke[] {
  const { lineCount, columns } = params
  const horizon = new Float64Array(columns).fill(Infinity)
  const strokes: Stroke[] = []

  for (let row = lineCount - 1; row >= 0; row -= 1) {
    const rowFraction = row / (lineCount - 1)
    const baseline = horizontalBaselineAt(rowFraction)
    const taper = edgeTaper(rowFraction)
    const heights = new Array<number>(columns)
    const values = new Array<number>(columns)

    for (let column = 0; column < columns; column += 1) {
      const columnFraction = column / (columns - 1)
      heights[column] = ditheredHeightAt(noise, columnFraction, row, params) * taper
    }

    capSlope(heights, 0.02)

    for (let column = 0; column < columns; column += 1) {
      values[column] = clamp(baseline - heights[column], SAFE_MARGIN, 1 - SAFE_MARGIN)
    }

    const segments = visibleSegments(values, horizon)
    for (const segment of segments) {
      if (segment.end - segment.start < 1) continue
      strokes.push(...ditheredRuns(noise, penCount, params, row, heights, values, segment))
    }
  }

  return strokes
}

function generateDitheredStyle(rng: Rng, noise: Noise, penCount: number): Stroke[] {
  const params = buildDitheredParams(rng)
  return generateWithRetry(
    (lineCount) => renderDithered(noise, penCount, { ...params, lineCount }),
    params.lineCount,
    280
  )
}

function generateVerticalStyle(rng: Rng, noise: Noise, penCount: number): Stroke[] {
  const innerStyle = rng.pick(VERTICAL_CANDIDATES)
  const strokes = generateLinearStyle(innerStyle, rng, noise, penCount)
  return strokes.map((stroke) => ({ ...stroke, points: stroke.points.map(swapAxes) }))
}

export const strata: Family = {
  name: "strata",
  weight: 1,
  generate: ({ rng, noise, penCount }) => {
    const style = rng.pick(STYLES)
    if (style === "vertical") return generateVerticalStyle(rng, noise, penCount)
    if (style === "radial") return generateRadialStyle(rng, noise, penCount)
    if (style === "dithered") return generateDitheredStyle(rng, noise, penCount)
    return generateLinearStyle(style, rng, noise, penCount)
  },
}
