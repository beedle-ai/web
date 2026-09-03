import type { Family, Noise, Rng, Stroke } from "../types"
import { SAFE_MARGIN, clamp, evenThresholds, penForValue, smoothstep } from "./shared"

type StrataStyle = "rolling" | "mountain" | "pulsar" | "hill"

interface HeightParams {
  frequency: number
  rowFrequency: number
  octaves: number
  sharp: boolean
  amplitude: number
  hillCentre: number
  hillHalfWidth: number
  weight: (rowFraction: number) => number
}

interface Segment {
  start: number
  end: number
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

function chooseStyle(rng: Rng): StrataStyle {
  const roll = rng.next()
  if (roll < 0.15) return "rolling"
  if (roll < 0.5) return "mountain"
  if (roll < 0.75) return "pulsar"
  return "hill"
}

function heightAt(noise: Noise, x: number, rowKey: number, params: HeightParams): number {
  if (params.hillHalfWidth > 0) {
    const bump = hillBump(x, params.hillCentre, params.hillHalfWidth)
    const texture = noise.fbm(x * params.frequency, rowKey * params.rowFrequency, params.octaves)
    return params.amplitude * bump + params.amplitude * 0.12 * texture
  }
  const sample = noise.fbm(x * params.frequency, rowKey * params.rowFrequency, params.octaves)
  const magnitude = params.sharp ? Math.abs(sample) : sample
  return magnitude * params.amplitude
}

function visibleSegments(ys: readonly number[], horizon: Float64Array): Segment[] {
  const segments: Segment[] = []
  let start = -1
  for (let column = 0; column < ys.length; column += 1) {
    const visible = ys[column] < horizon[column]
    if (visible) {
      if (start === -1) start = column
      horizon[column] = ys[column]
      continue
    }
    if (start !== -1) {
      segments.push({ start, end: column - 1 })
      start = -1
    }
  }
  if (start !== -1) segments.push({ start, end: ys.length - 1 })
  return segments
}

function averageHeight(heights: readonly number[], segment: Segment): number {
  let total = 0
  for (let column = segment.start; column <= segment.end; column += 1) total += heights[column]
  return total / (segment.end - segment.start + 1)
}

function choosePen(
  penCount: number,
  useHeightFade: boolean,
  rowFraction: number,
  segment: Segment,
  heights: readonly number[],
  amplitude: number
): number {
  if (penCount <= 1) return 0
  if (useHeightFade) {
    const peak = averageHeight(heights, segment)
    return penForValue(peak, evenThresholds(0, amplitude * 0.7, penCount))
  }
  return penForValue(rowFraction, evenThresholds(0, 1, penCount))
}

function renderRows(
  lineCount: number,
  columns: number,
  params: HeightParams,
  penCount: number,
  useHeightFade: boolean,
  noise: Noise
): Stroke[] {
  const horizon = new Float64Array(columns).fill(Infinity)
  const strokes: Stroke[] = []

  for (let row = lineCount - 1; row >= 0; row -= 1) {
    const rowFraction = row / (lineCount - 1)
    const baseline = SAFE_MARGIN + rowFraction * (1 - 2 * SAFE_MARGIN)
    const heights: number[] = new Array(columns)
    const ys: number[] = new Array(columns)

    for (let column = 0; column < columns; column += 1) {
      const x = SAFE_MARGIN + (column / (columns - 1)) * (1 - 2 * SAFE_MARGIN)
      const height = heightAt(noise, x, row, params) * params.weight(rowFraction)
      heights[column] = height
      ys[column] = clamp(baseline - height, SAFE_MARGIN, 1 - SAFE_MARGIN)
    }

    const segments = visibleSegments(ys, horizon)
    for (const segment of segments) {
      if (segment.end - segment.start < 1) continue
      const points = []
      for (let column = segment.start; column <= segment.end; column += 1) {
        const x = SAFE_MARGIN + (column / (columns - 1)) * (1 - 2 * SAFE_MARGIN)
        points.push({ x, y: ys[column] })
      }
      const pen = choosePen(
        penCount,
        useHeightFade,
        rowFraction,
        segment,
        heights,
        params.amplitude
      )
      strokes.push({ pen, points })
    }
  }

  return strokes
}

export const strata: Family = {
  name: "strata",
  weight: 1,
  generate: ({ rng, noise, penCount }) => {
    const style = chooseStyle(rng)
    const sharp = style === "mountain" || style === "pulsar"
    const isHill = style === "hill"
    const columns = 220
    const amplitude = style === "rolling" ? rng.range(0.02, 0.05) : rng.range(0.16, 0.34)
    const bandCentre = rng.range(0.42, 0.58)
    const bandWidth = rng.range(0.06, 0.11)
    const bandFloor = 0.02
    const useHeightFade = rng.chance(0.4)

    const weight = (rowFraction: number): number => {
      const taper = edgeTaper(rowFraction)
      if (style !== "pulsar") return taper
      return taper * Math.max(bandFloor, bandWeight(rowFraction, bandCentre, bandWidth))
    }

    const params: HeightParams = {
      frequency: rng.range(1.4, 3.4),
      rowFrequency: rng.range(0.05, 0.18),
      octaves: rng.int(2, 4),
      sharp,
      amplitude,
      hillCentre: isHill ? rng.range(0.3, 0.7) : 0,
      hillHalfWidth: isHill ? rng.range(0.22, 0.4) : 0,
      weight,
    }

    let lineCount = style === "rolling" ? rng.int(95, 150) : rng.int(65, 120)
    let strokes = renderRows(lineCount, columns, params, penCount, useHeightFade, noise)

    while (strokes.length < 100 && lineCount < 420) {
      lineCount = Math.round(lineCount * 1.5)
      strokes = renderRows(lineCount, columns, params, penCount, useHeightFade, noise)
    }

    return strokes
  },
}
