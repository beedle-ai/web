import type { Family, FamilyContext, Point, Rng, Stroke } from "../types"
import { chunkPolyline, clamp, resamplePolyline } from "./shared"

const FIT_MARGIN = 0.1
const STEPS_PER_REVOLUTION = 80
const MIN_ASPECT_RATIO = 0.55
const MAX_FIT_ATTEMPTS = 12

const RATIO_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [1, 3],
  [3, 5],
]

interface Term {
  amplitude: number
  frequency: number
  phase: number
  damping: number
}

interface RotaryTerm {
  amplitude: number
  frequency: number
  phase: number
  damping: number
}

interface Harmonic {
  x: Term[]
  y: Term[]
  rotary?: RotaryTerm
  duration: number
  revolutions: number
  baseX: number
  baseY: number
}

const STYLES = ["classic", "lateralRotary", "twin", "family"] as const

function detuneFactor(rng: Rng): number {
  const magnitude = rng.range(0.004, 0.02)
  return rng.chance(0.5) ? 1 + magnitude : 1 - magnitude
}

function pickBaseFrequencies(rng: Rng): [number, number] {
  const [a, b] = rng.pick(RATIO_PAIRS)
  return rng.chance(0.5) ? [a, b] : [b, a]
}

function buildAxisTerms(rng: Rng, base: number): Term[] {
  const terms: Term[] = [
    {
      amplitude: 1,
      frequency: base * detuneFactor(rng),
      phase: rng.range(0, Math.PI * 2),
      damping: rng.range(0.0015, 0.005),
    },
  ]
  if (rng.chance(0.4)) {
    terms.push({
      amplitude: rng.range(0.12, 0.28),
      frequency: base * rng.pick([2, 3]) * detuneFactor(rng),
      phase: rng.range(0, Math.PI * 2),
      damping: rng.range(0.0015, 0.005),
    })
  }
  return terms
}

function revolutionsToDuration(revolutions: number, dominantFrequency: number): number {
  return (revolutions * Math.PI * 2) / dominantFrequency
}

function buildHarmonic(rng: Rng, withRotary: boolean): Harmonic {
  const [baseX, baseY] = pickBaseFrequencies(rng)
  const revolutions = rng.range(15, 40)
  const duration = revolutionsToDuration(revolutions, Math.max(baseX, baseY))
  const harmonic: Harmonic = {
    x: buildAxisTerms(rng, baseX),
    y: buildAxisTerms(rng, baseY),
    duration,
    revolutions,
    baseX,
    baseY,
  }
  if (!withRotary) return harmonic
  return {
    ...harmonic,
    rotary: {
      amplitude: rng.range(0.15, 0.35),
      frequency: Math.min(baseX, baseY) * 0.5 * detuneFactor(rng),
      phase: rng.range(0, Math.PI * 2),
      damping: rng.range(0.0015, 0.006),
    },
  }
}

function relateHarmonic(rng: Rng, base: Harmonic): Harmonic {
  const scale = rng.range(0.85, 1.2)
  const baseX = base.baseX * scale
  const baseY = base.baseY * scale
  const revolutions = rng.range(15, 40)
  const duration = revolutionsToDuration(revolutions, Math.max(baseX, baseY))
  return {
    x: buildAxisTerms(rng, baseX),
    y: buildAxisTerms(rng, baseY),
    duration,
    revolutions,
    baseX,
    baseY,
    rotary: base.rotary && { ...base.rotary, phase: rng.range(0, Math.PI * 2) },
  }
}

function varyPhase(base: Harmonic, shift: number): Harmonic {
  const nudge = (terms: readonly Term[]): Term[] =>
    terms.map((term) => ({ ...term, phase: term.phase + shift }))
  return {
    x: nudge(base.x),
    y: nudge(base.y),
    duration: base.duration,
    revolutions: base.revolutions,
    rotary: base.rotary,
    baseX: base.baseX,
    baseY: base.baseY,
  }
}

function evaluate(harmonic: Harmonic, t: number): Point {
  let x = 0
  let y = 0
  for (const term of harmonic.x) {
    x += term.amplitude * Math.exp(-term.damping * t) * Math.sin(term.frequency * t + term.phase)
  }
  for (const term of harmonic.y) {
    y += term.amplitude * Math.exp(-term.damping * t) * Math.sin(term.frequency * t + term.phase)
  }
  const rotary = harmonic.rotary
  if (rotary) {
    const envelope = rotary.amplitude * Math.exp(-rotary.damping * t)
    x += envelope * Math.cos(rotary.frequency * t + rotary.phase)
    y += envelope * Math.sin(rotary.frequency * t + rotary.phase)
  }
  return { x, y }
}

function trace(harmonic: Harmonic): Point[] {
  const steps = Math.max(150, Math.round(harmonic.revolutions * STEPS_PER_REVOLUTION))
  const points: Point[] = new Array(steps + 1)
  for (let index = 0; index <= steps; index += 1) {
    points[index] = evaluate(harmonic, (index / steps) * harmonic.duration)
  }
  return points
}

interface BoundingBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

function boundingBoxOf(lines: readonly Point[][]): BoundingBox {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const line of lines) {
    for (const point of line) {
      if (point.x < minX) minX = point.x
      if (point.x > maxX) maxX = point.x
      if (point.y < minY) minY = point.y
      if (point.y > maxY) maxY = point.y
    }
  }
  return { minX, maxX, minY, maxY }
}

function isWellFormed(lines: readonly Point[][]): boolean {
  const { minX, maxX, minY, maxY } = boundingBoxOf(lines)
  const spanX = maxX - minX
  const spanY = maxY - minY
  if (spanX <= 0 || spanY <= 0) return false
  const aspect = Math.min(spanX, spanY) / Math.max(spanX, spanY)
  return aspect >= MIN_ASPECT_RATIO
}

function fitToSheet(lines: readonly Point[][]): Point[][] {
  const { minX, maxX, minY, maxY } = boundingBoxOf(lines)
  const span = Math.max(maxX - minX, maxY - minY) || 1
  const scale = (1 - 2 * FIT_MARGIN) / span
  const centreX = (minX + maxX) / 2
  const centreY = (minY + maxY) / 2
  return lines.map((line) =>
    line.map((point) => ({
      x: 0.5 + (point.x - centreX) * scale,
      y: 0.5 + (point.y - centreY) * scale,
    }))
  )
}

interface Composition {
  lines: Point[][]
  pens: number[]
}

function classicComposition(rng: Rng, penCount: number): Composition {
  const harmonic = buildHarmonic(rng, false)
  return { lines: [trace(harmonic)], pens: [rng.int(0, penCount - 1)] }
}

function lateralRotaryComposition(rng: Rng, penCount: number): Composition {
  const harmonic = buildHarmonic(rng, true)
  return { lines: [trace(harmonic)], pens: [rng.int(0, penCount - 1)] }
}

function twinComposition(rng: Rng, penCount: number): Composition {
  const primary = buildHarmonic(rng, rng.chance(0.4))
  const secondary = relateHarmonic(rng, primary)
  const primaryPen = rng.int(0, penCount - 1)
  const secondaryPen = penCount > 1 ? (primaryPen + 1) % penCount : primaryPen
  return { lines: [trace(primary), trace(secondary)], pens: [primaryPen, secondaryPen] }
}

function familyComposition(rng: Rng, penCount: number): Composition {
  const traceCount = rng.int(8, 16)
  const base = buildHarmonic(rng, rng.chance(0.3))
  const phaseStep = rng.range(0.05, 0.15)
  const pen = rng.int(0, penCount - 1)
  const lines = Array.from({ length: traceCount }, (_, index) =>
    trace(varyPhase(base, index * phaseStep))
  )
  return { lines, pens: lines.map(() => pen) }
}

function buildComposition(style: (typeof STYLES)[number], rng: Rng, penCount: number): Composition {
  if (style === "classic") return classicComposition(rng, penCount)
  if (style === "lateralRotary") return lateralRotaryComposition(rng, penCount)
  if (style === "twin") return twinComposition(rng, penCount)
  return familyComposition(rng, penCount)
}

function buildValidComposition(
  style: (typeof STYLES)[number],
  rng: Rng,
  penCount: number
): Composition {
  let composition = buildComposition(style, rng, penCount)
  for (
    let attempt = 1;
    attempt < MAX_FIT_ATTEMPTS && !isWellFormed(composition.lines);
    attempt += 1
  ) {
    composition = buildComposition(style, rng, penCount)
  }
  return composition
}

function assembleStrokes(lines: readonly Point[][], pens: readonly number[], rng: Rng): Stroke[] {
  const spacing = rng.range(0.003, 0.006)
  const resampledLines = lines.map((line) => resamplePolyline(line, spacing))
  const totalPoints = resampledLines.reduce((sum, line) => sum + line.length, 0)

  const build = (chunkSize: number): Stroke[] => {
    const strokes: Stroke[] = []
    resampledLines.forEach((line, index) => {
      for (const chunk of chunkPolyline(line, chunkSize)) {
        strokes.push({ pen: pens[index], points: chunk })
      }
    })
    return strokes
  }

  const desiredStrokeCount = rng.int(300, 900)
  const chunkSize = clamp(Math.round(totalPoints / desiredStrokeCount), 4, 400)
  const strokes = build(chunkSize)
  if (strokes.length >= 120) return strokes
  const finer = build(2)
  return finer.length >= strokes.length ? finer : strokes
}

function generate({ rng, penCount }: FamilyContext): Stroke[] {
  const style = rng.pick(STYLES)
  const { lines, pens } = buildValidComposition(style, rng, penCount)
  const fitted = fitToSheet(lines)
  return assembleStrokes(fitted, pens, rng)
}

export const harmonograph: Family = {
  name: "harmonograph",
  weight: 1,
  generate,
}
