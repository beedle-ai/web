import type { Family, FamilyContext, Point, Rng, Stroke } from "../types"
import { SHEET_MARGIN } from "../types"

const GRID = 220
const ITERATIONS = 180_000
const PERCENTILE_SAMPLE_STRIDE = 9
const SETTLE = 200
const MAX_PARAMETER_ATTEMPTS = 24
const MIN_OCCUPANCY = 0.05
const MIN_EXTENT = 0.35

interface Parameters {
  kind: "clifford" | "dejong"
  a: number
  b: number
  c: number
  d: number
}

interface Field {
  values: Float32Array
  size: number
}

type Sampler = (x: number, y: number) => number

function step(parameters: Parameters, x: number, y: number): [number, number] {
  const { a, b, c, d } = parameters
  if (parameters.kind === "clifford") {
    return [Math.sin(a * y) + c * Math.cos(a * x), Math.sin(b * x) + d * Math.cos(b * y)]
  }
  return [Math.sin(a * y) - Math.cos(b * x), Math.sin(c * x) - Math.cos(d * y)]
}

function randomParameters(rng: Rng): Parameters {
  const kind = rng.chance(0.6) ? "clifford" : "dejong"
  const signed = (magnitude: number) => (rng.chance(0.5) ? magnitude : -magnitude)
  if (kind === "clifford") {
    return {
      kind,
      a: signed(rng.range(1.3, 2)),
      b: signed(rng.range(1.3, 2)),
      c: rng.range(-1.4, 1.4),
      d: rng.range(-1.4, 1.4),
    }
  }
  return {
    kind,
    a: signed(rng.range(1.4, 2.6)),
    b: signed(rng.range(1.4, 2.6)),
    c: signed(rng.range(1, 2.4)),
    d: signed(rng.range(1, 2.4)),
  }
}

function iterate(parameters: Parameters): Float64Array {
  const points = new Float64Array(ITERATIONS * 2)
  let x = 0.1
  let y = 0.1
  for (let index = 0; index < SETTLE; index += 1) [x, y] = step(parameters, x, y)
  for (let index = 0; index < ITERATIONS; index += 1) {
    ;[x, y] = step(parameters, x, y)
    points[index * 2] = x
    points[index * 2 + 1] = y
  }
  return points
}

function percentileBounds(points: Float64Array): [number, number, number, number] {
  const sampleCount = Math.floor(ITERATIONS / PERCENTILE_SAMPLE_STRIDE)
  const xs = new Float64Array(sampleCount)
  const ys = new Float64Array(sampleCount)
  for (let index = 0; index < sampleCount; index += 1) {
    xs[index] = points[index * PERCENTILE_SAMPLE_STRIDE * 2]
    ys[index] = points[index * PERCENTILE_SAMPLE_STRIDE * 2 + 1]
  }
  xs.sort()
  ys.sort()
  const low = Math.floor(sampleCount * 0.003)
  const high = sampleCount - 1 - low
  return [xs[low], xs[high], ys[low], ys[high]]
}

function rasterise(points: Float64Array): Field | null {
  const [minX, maxX, minY, maxY] = percentileBounds(points)
  const spanX = maxX - minX
  const spanY = maxY - minY
  if (spanX < MIN_EXTENT || spanY < MIN_EXTENT) return null

  const span = Math.max(spanX, spanY)
  const offsetX = minX - (span - spanX) / 2
  const offsetY = minY - (span - spanY) / 2
  const counts = new Float32Array(GRID * GRID)
  let occupied = 0

  for (let index = 0; index < ITERATIONS; index += 1) {
    const column = Math.floor(((points[index * 2] - offsetX) / span) * (GRID - 1))
    const row = Math.floor(((points[index * 2 + 1] - offsetY) / span) * (GRID - 1))
    if (column < 0 || column >= GRID || row < 0 || row >= GRID) continue
    const cell = row * GRID + column
    if (counts[cell] === 0) occupied += 1
    counts[cell] += 1
  }

  if (occupied / (GRID * GRID) < MIN_OCCUPANCY) return null
  return { values: normalise(blur(blur(blur(counts)))), size: GRID }
}

function blur(source: Float32Array): Float32Array {
  const target = new Float32Array(source.length)
  for (let row = 0; row < GRID; row += 1) {
    for (let column = 0; column < GRID; column += 1) {
      let total = 0
      let weight = 0
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const r = row + dy
          const c = column + dx
          if (r < 0 || r >= GRID || c < 0 || c >= GRID) continue
          const w = dx === 0 && dy === 0 ? 2 : 1
          total += source[r * GRID + c] * w
          weight += w
        }
      }
      target[row * GRID + column] = total / weight
    }
  }
  return target
}

function normalise(counts: Float32Array): Float32Array {
  let max = 0
  for (const value of counts) max = Math.max(max, value)
  const scale = 1 / Math.log1p(max)
  return counts.map((value) => Math.log1p(value) * scale)
}

function makeSampler(field: Field): Sampler {
  const last = field.size - 1
  return (x, y) => {
    const gx = Math.min(Math.max(x * last, 0), last)
    const gy = Math.min(Math.max(y * last, 0), last)
    const x0 = Math.floor(gx)
    const y0 = Math.floor(gy)
    const x1 = Math.min(x0 + 1, last)
    const y1 = Math.min(y0 + 1, last)
    const fx = gx - x0
    const fy = gy - y0
    const top =
      field.values[y0 * field.size + x0] * (1 - fx) + field.values[y0 * field.size + x1] * fx
    const bottom =
      field.values[y1 * field.size + x0] * (1 - fx) + field.values[y1 * field.size + x1] * fx
    return top * (1 - fy) + bottom * fy
  }
}

function toSheet(point: Point, inset: number): Point {
  const scale = 1 - 2 * inset
  return { x: inset + point.x * scale, y: inset + point.y * scale }
}

function interpolate(a: Point, va: number, b: Point, vb: number, level: number): Point {
  const t = vb === va ? 0.5 : (level - va) / (vb - va)
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

function contourSegments(field: Field, level: number): Array<[Point, Point]> {
  const segments: Array<[Point, Point]> = []
  const last = field.size - 1
  const at = (column: number, row: number) => field.values[row * field.size + column]
  const position = (column: number, row: number): Point => ({ x: column / last, y: row / last })

  for (let row = 0; row < last; row += 1) {
    for (let column = 0; column < last; column += 1) {
      const corners = [
        { point: position(column, row), value: at(column, row) },
        { point: position(column + 1, row), value: at(column + 1, row) },
        { point: position(column + 1, row + 1), value: at(column + 1, row + 1) },
        { point: position(column, row + 1), value: at(column, row + 1) },
      ]
      const crossings: Point[] = []
      for (let edge = 0; edge < 4; edge += 1) {
        const from = corners[edge]
        const to = corners[(edge + 1) % 4]
        if (from.value >= level === to.value >= level) continue
        crossings.push(interpolate(from.point, from.value, to.point, to.value, level))
      }
      if (crossings.length === 2) segments.push([crossings[0], crossings[1]])
      if (crossings.length === 4) {
        segments.push([crossings[0], crossings[1]])
        segments.push([crossings[2], crossings[3]])
      }
    }
  }
  return segments
}

function pointKey(point: Point): string {
  return `${Math.round(point.x * 20000)},${Math.round(point.y * 20000)}`
}

function linkSegments(segments: Array<[Point, Point]>): Point[][] {
  const adjacency = new Map<string, number[]>()
  segments.forEach(([a, b], index) => {
    for (const key of [pointKey(a), pointKey(b)]) {
      const list = adjacency.get(key)
      if (list) list.push(index)
      else adjacency.set(key, [index])
    }
  })

  const used = new Uint8Array(segments.length)
  const paths: Point[][] = []

  const extend = (path: Point[], from: Point): void => {
    let cursor = from
    for (;;) {
      const candidates = adjacency.get(pointKey(cursor)) ?? []
      const next = candidates.find((index) => !used[index])
      if (next === undefined) return
      used[next] = 1
      const [a, b] = segments[next]
      cursor = pointKey(a) === pointKey(cursor) ? b : a
      path.push(cursor)
    }
  }

  segments.forEach(([a, b], index) => {
    if (used[index]) return
    used[index] = 1
    const path = [a, b]
    extend(path, b)
    const head = path.slice(1).reverse()
    const tail: Point[] = []
    extend(tail, a)
    paths.push([...head, a, ...tail])
  })

  return paths.filter((path) => path.length >= 10)
}

function hatchRuns(
  sample: Sampler,
  angle: number,
  spacing: number,
  threshold: number,
  sampleStep: number
): Point[][] {
  const runs: Point[][] = []
  const direction = { x: Math.cos(angle), y: Math.sin(angle) }
  const normal = { x: -direction.y, y: direction.x }
  const reach = Math.SQRT2
  const centre = { x: 0.5, y: 0.5 }

  for (let offset = -reach / 2; offset <= reach / 2; offset += spacing) {
    let current: Point[] = []
    for (let along = -reach / 2; along <= reach / 2; along += sampleStep) {
      const point = {
        x: centre.x + normal.x * offset + direction.x * along,
        y: centre.y + normal.y * offset + direction.y * along,
      }
      const inside = point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1
      if (inside && sample(point.x, point.y) >= threshold) {
        current.push(point)
        continue
      }
      if (current.length > 1) runs.push(current)
      current = []
    }
    if (current.length > 1) runs.push(current)
  }
  return runs
}

function quantiles(field: Field): Float32Array {
  return field.values.filter((value) => value > 0.02).sort()
}

function levelsFor(field: Field, rng: Rng, count: number): number[] {
  const sorted = quantiles(field)
  const at = (fraction: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))]
  const low = at(rng.range(0.2, 0.4))
  const high = at(rng.range(0.9, 0.985))
  if (count === 1) return [low]
  return Array.from({ length: count }, (_, index) => low + ((high - low) * index) / (count - 1))
}

function penForLevel(index: number, count: number, penCount: number): number {
  if (penCount === 1) return 0
  return Math.min(penCount - 1, Math.floor((index / count) * penCount))
}

function contourStyle(field: Field, rng: Rng, penCount: number, inset: number): Stroke[] {
  const levels = levelsFor(field, rng, rng.int(4, 8))
  const strokes: Stroke[] = []
  levels.forEach((level, index) => {
    const pen = penForLevel(index, levels.length, penCount)
    for (const path of linkSegments(contourSegments(field, level))) {
      strokes.push({ pen, points: path.map((point) => toSheet(point, inset)) })
    }
  })
  return strokes
}

function hatchStyle(field: Field, rng: Rng, penCount: number, inset: number): Stroke[] {
  const sample = makeSampler(field)
  const levels = levelsFor(field, rng, rng.int(2, 4))
  const baseAngle = rng.pick([0, Math.PI / 4, Math.PI / 2, -Math.PI / 4])
  const rotatePerLevel = rng.chance(0.5)
  const strokes: Stroke[] = []

  levels.forEach((level, index) => {
    const spacing = 0.016 / (index + 1)
    const angle = rotatePerLevel ? baseAngle + (index * Math.PI) / 4 : baseAngle
    const pen = penForLevel(index, levels.length, penCount)
    for (const run of hatchRuns(sample, angle, spacing, level, 0.003)) {
      strokes.push({ pen, points: run.map((point) => toSheet(point, inset)) })
    }
  })
  return strokes
}

function mixedStyle(field: Field, rng: Rng, penCount: number, inset: number): Stroke[] {
  const sample = makeSampler(field)
  const outline = levelsFor(field, rng, 3)
  const strokes: Stroke[] = []
  for (const level of outline) {
    for (const path of linkSegments(contourSegments(field, level))) {
      strokes.push({ pen: 0, points: path.map((point) => toSheet(point, inset)) })
    }
  }
  const corePen = penCount > 1 ? 1 : 0
  const angle = rng.pick([0, Math.PI / 4, -Math.PI / 4])
  const core = levelsFor(field, rng, 1)[0] * rng.range(1.15, 1.4)
  for (const run of hatchRuns(sample, angle, 0.007, core, 0.003)) {
    strokes.push({ pen: corePen, points: run.map((point) => toSheet(point, inset)) })
  }
  return strokes
}

function findField(rng: Rng): Field {
  for (let attempt = 0; attempt < MAX_PARAMETER_ATTEMPTS; attempt += 1) {
    const field = rasterise(iterate(randomParameters(rng)))
    if (field) return field
  }
  const fallback = rasterise(iterate({ kind: "clifford", a: -1.4, b: 1.6, c: 1, d: 0.7 }))
  if (!fallback) throw new Error("attractor fallback parameters produced no field")
  return fallback
}

function ensureDensity(
  strokes: Stroke[],
  field: Field,
  rng: Rng,
  penCount: number,
  inset: number
): Stroke[] {
  if (strokes.length >= 120) return strokes
  return [...strokes, ...hatchStyle(field, rng, penCount, inset)]
}

function generate({ rng, penCount }: FamilyContext): Stroke[] {
  const field = findField(rng)
  const inset = SHEET_MARGIN + rng.range(0.02, 0.1)
  const roll = rng.next()
  const strokes =
    roll < 0.45
      ? contourStyle(field, rng, penCount, inset)
      : roll < 0.8
        ? hatchStyle(field, rng, penCount, inset)
        : mixedStyle(field, rng, penCount, inset)
  return ensureDensity(strokes, field, rng, penCount, inset)
}

export const attractor: Family = {
  name: "attractor",
  weight: 1,
  generate,
}
