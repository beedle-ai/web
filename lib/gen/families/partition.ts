import { circlePoints } from "../geometry"
import type { Family, FamilyContext, Noise, Point, Rng, Stroke } from "../types"
import { DEFAULT_STROKE_WIDTH } from "../types"
import {
  clipLineToRect,
  clipPolylineToRect,
  concentricInsets,
  drawableRect,
  hatchLines,
  rectCentre,
  rectOutlineStroke,
} from "./shared-b"
import type { Rect } from "./shared-b"

type SplitAxis = "x" | "y"
type PenRule = "depth" | "angle" | "noise" | "motif"
type FillKind =
  | "empty"
  | "hatch"
  | "crossHatch"
  | "warpedHatch"
  | "sineWave"
  | "chevron"
  | "concentricRect"
  | "concentricCircle"
  | "spiral"
  | "radialBurst"
  | "dotGrid"

type FillWeights = ReadonlyArray<readonly [FillKind, number]>

interface SplitConfig {
  ratios: readonly number[]
  maxDepth: number
  minSize: number
  stopProbability: number
  stopProbabilityGrowth: number
  gutter: number
  gutterFalloff: number
  fixedAxisAlternation: boolean
}

interface FillConfig {
  weights: FillWeights
  spacingMin: number
  spacingMax: number
  outlineProbability: number
}

interface LeafCell {
  rect: Rect
  depth: number
}

interface CellRender {
  cell: LeafCell
  pen: number
  kind: FillKind
  angle: number
  spacing: number
  fillStrokes: Stroke[]
  outlineStroke: Stroke | null
}

type ForceEmptyPredicate = (cell: LeafCell, split: SplitConfig) => boolean

const MAX_LEAVES = 220
const MAX_SUBDIVIDE_ATTEMPTS = 5
const MIN_FILLED_CELLS = 6
const MIN_FILLED_AREA_FRACTION = 0.3

const MOTIF_PEN_ORDER: readonly FillKind[] = [
  "hatch",
  "warpedHatch",
  "crossHatch",
  "sineWave",
  "chevron",
  "concentricRect",
  "concentricCircle",
  "spiral",
  "radialBurst",
  "dotGrid",
  "empty",
]

const neverForceEmpty: ForceEmptyPredicate = () => false

function pickWeighted<T extends string>(rng: Rng, entries: ReadonlyArray<readonly [T, number]>): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = rng.next() * total
  for (const [value, weight] of entries) {
    if (roll < weight) return value
    roll -= weight
  }
  return entries[entries.length - 1][0]
}

function pickRatio(rng: Rng, ratios: readonly number[]): number {
  const base = rng.pick(ratios)
  return Math.min(0.75, Math.max(0.25, base + rng.range(-0.03, 0.03)))
}

function chooseAxis(rect: Rect, depth: number, config: SplitConfig, rng: Rng): SplitAxis {
  if (config.fixedAxisAlternation) return depth % 2 === 0 ? "x" : "y"
  if (rect.width > rect.height * 1.15) return "x"
  if (rect.height > rect.width * 1.15) return "y"
  return rng.chance(0.5) ? "x" : "y"
}

function gutterForDepth(config: SplitConfig, depth: number): number {
  if (config.gutterFalloff === 1) return config.gutter
  const shrunk = config.gutter * config.gutterFalloff ** depth
  return Math.max(config.gutter * 0.35, shrunk)
}

function splitRect(rect: Rect, axis: SplitAxis, ratio: number, gutter: number): [Rect, Rect] {
  if (axis === "x") {
    const splitAt = rect.width * ratio
    return [
      { x: rect.x, y: rect.y, width: splitAt - gutter / 2, height: rect.height },
      {
        x: rect.x + splitAt + gutter / 2,
        y: rect.y,
        width: rect.width - splitAt - gutter / 2,
        height: rect.height,
      },
    ]
  }
  const splitAt = rect.height * ratio
  return [
    { x: rect.x, y: rect.y, width: rect.width, height: splitAt - gutter / 2 },
    {
      x: rect.x,
      y: rect.y + splitAt + gutter / 2,
      width: rect.width,
      height: rect.height - splitAt - gutter / 2,
    },
  ]
}

function subdivide(
  rect: Rect,
  depth: number,
  config: SplitConfig,
  rng: Rng,
  leaves: LeafCell[]
): void {
  const tooSmall = rect.width < config.minSize * 2 || rect.height < config.minSize * 2
  const stopChance = Math.min(0.92, config.stopProbability + depth * config.stopProbabilityGrowth)
  const mustStop = depth >= config.maxDepth || tooSmall || leaves.length >= MAX_LEAVES
  const mayStopHere = depth > 0 && (mustStop || rng.chance(stopChance))

  if (mustStop || mayStopHere) {
    leaves.push({ rect, depth })
    return
  }

  const axis = chooseAxis(rect, depth, config, rng)
  const ratio = pickRatio(rng, config.ratios)
  const gutter = gutterForDepth(config, depth)
  const [first, second] = splitRect(rect, axis, ratio, gutter)
  if (
    first.width < config.minSize ||
    first.height < config.minSize ||
    second.width < config.minSize ||
    second.height < config.minSize
  ) {
    leaves.push({ rect, depth })
    return
  }

  subdivide(first, depth + 1, config, rng, leaves)
  subdivide(second, depth + 1, config, rng, leaves)
}

function pickPenRule(rng: Rng, penCount: number): PenRule {
  if (penCount <= 1) return "depth"
  return rng.pick(["depth", "angle", "noise", "motif"] as const)
}

function penForCell(
  rule: PenRule,
  cell: LeafCell,
  angle: number,
  kind: FillKind,
  noise: Noise,
  penCount: number
): number {
  if (penCount <= 1) return 0
  if (rule === "depth") return cell.depth % penCount
  if (rule === "angle") return Math.floor(angle / 45) % penCount
  if (rule === "motif") return MOTIF_PEN_ORDER.indexOf(kind) % penCount
  const centre = rectCentre(cell.rect)
  const sample = noise.fbm(centre.x * 3, centre.y * 3, 3)
  const band = Math.floor(((sample + 1) / 2) * penCount)
  return Math.min(penCount - 1, Math.max(0, band))
}

type WaveFn = (along: number, lineIndex: number) => number

function wavyHatchLines(
  rect: Rect,
  angleDegrees: number,
  spacing: number,
  pen: number,
  waveFn: WaveFn,
  sampleStep: number
): Stroke[] {
  const angle = (angleDegrees * Math.PI) / 180
  const direction = { x: Math.cos(angle), y: Math.sin(angle) }
  const normal = { x: -direction.y, y: direction.x }
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x + rect.width, y: rect.y + rect.height },
  ]
  const normalProjections = corners.map((corner) => corner.x * normal.x + corner.y * normal.y)
  const alongProjections = corners.map((corner) => corner.x * direction.x + corner.y * direction.y)
  const minNormal = Math.min(...normalProjections)
  const maxNormal = Math.max(...normalProjections)
  const minAlong = Math.min(...alongProjections) - spacing
  const maxAlong = Math.max(...alongProjections) + spacing

  const strokes: Stroke[] = []
  let lineIndex = 0
  for (let offset = minNormal + spacing / 2; offset <= maxNormal; offset += spacing) {
    const points: Point[] = []
    for (let along = minAlong; along <= maxAlong; along += sampleStep) {
      const displaced = offset + waveFn(along, lineIndex)
      points.push({
        x: normal.x * displaced + direction.x * along,
        y: normal.y * displaced + direction.y * along,
      })
    }
    for (const piece of clipPolylineToRect(points, rect)) strokes.push({ pen, points: piece })
    lineIndex += 1
  }
  return strokes
}

const MAX_HATCH_LINES = 180
const MAX_CHEVRON_LINES = 220
const MAX_RINGS = 36
const MAX_DOTS = 280

function lineSpacingFloor(extent: number, spacing: number, maxLines: number): number {
  return Math.max(spacing, extent / maxLines)
}

function areaSpacingFloor(area: number, spacing: number, maxCount: number): number {
  return Math.max(spacing, Math.sqrt(area / maxCount))
}

function warpedHatchLines(
  rect: Rect,
  angleDegrees: number,
  spacing: number,
  pen: number,
  noise: Noise,
  rng: Rng
): Stroke[] {
  const boundedSpacing = lineSpacingFloor(
    Math.max(rect.width, rect.height),
    spacing,
    MAX_HATCH_LINES
  )
  const flow = rng.chance(0.18)
  const amplitude = flow ? boundedSpacing * rng.range(1.6, 3) : boundedSpacing * rng.range(0.2, 0.8)
  const frequency = rng.range(2.5, 6)
  const sampleStep = Math.max(boundedSpacing * 0.55, 0.006)
  const waveFn: WaveFn = (along, lineIndex) =>
    noise.fbm(along * frequency, lineIndex * frequency * 1.7, 2) * amplitude
  return wavyHatchLines(rect, angleDegrees, boundedSpacing, pen, waveFn, sampleStep)
}

function sineWaveFill(
  rect: Rect,
  angleDegrees: number,
  spacing: number,
  pen: number,
  rng: Rng
): Stroke[] {
  const boundedSpacing = lineSpacingFloor(
    Math.max(rect.width, rect.height),
    spacing,
    MAX_HATCH_LINES
  )
  const amplitude = boundedSpacing * rng.range(1.2, 2.4)
  const frequency = rng.range(3, 7)
  const phase = rng.range(0, Math.PI * 2)
  const sampleStep = Math.max(boundedSpacing * 0.4, 0.005)
  const waveFn: WaveFn = (along) => Math.sin(along * frequency * Math.PI * 2 + phase) * amplitude
  return wavyHatchLines(rect, angleDegrees, boundedSpacing, pen, waveFn, sampleStep)
}

function chevronFill(rect: Rect, spacing: number, pen: number): Stroke[] {
  const boundedSpacing = areaSpacingFloor(
    rect.width * rect.height * 2.4,
    spacing,
    MAX_CHEVRON_LINES
  )
  const stripWidth = boundedSpacing * 2.4
  const strokes: Stroke[] = []
  let x = rect.x
  let flip = false
  while (x < rect.x + rect.width) {
    const width = Math.min(stripWidth, rect.x + rect.width - x)
    const strip: Rect = { x, y: rect.y, width, height: rect.height }
    strokes.push(...hatchLines(strip, flip ? 45 : -45, boundedSpacing, pen))
    x += stripWidth
    flip = !flip
  }
  return strokes
}

function boundedHatchLines(
  rect: Rect,
  angleDegrees: number,
  spacing: number,
  pen: number
): Stroke[] {
  const boundedSpacing = lineSpacingFloor(
    Math.max(rect.width, rect.height),
    spacing,
    MAX_HATCH_LINES
  )
  return hatchLines(rect, angleDegrees, boundedSpacing, pen)
}

function boundedConcentricInsets(rect: Rect, spacing: number, pen: number): Stroke[] {
  const boundedSpacing = lineSpacingFloor(Math.min(rect.width, rect.height) / 2, spacing, MAX_RINGS)
  return concentricInsets(rect, boundedSpacing, pen)
}

function fitRadius(rect: Rect, padFraction: number): number {
  const pad = Math.min(rect.width, rect.height) * padFraction
  return Math.max(0, Math.min(rect.width, rect.height) / 2 - pad)
}

function concentricCircleMotif(rect: Rect, spacing: number, pen: number): Stroke[] {
  const centre = rectCentre(rect)
  const maxRadius = fitRadius(rect, 0.08)
  const boundedSpacing = lineSpacingFloor(maxRadius, spacing, MAX_RINGS)
  const strokes: Stroke[] = []
  for (let radius = maxRadius; radius > boundedSpacing * 0.5; radius -= boundedSpacing)
    strokes.push({ pen, points: circlePoints(centre, radius, 64) })
  return strokes
}

function spiralMotif(rect: Rect, pen: number, turns: number): Stroke[] {
  const centre = rectCentre(rect)
  const maxRadius = fitRadius(rect, 0.06)
  if (maxRadius <= 0) return []
  const steps = Math.max(60, Math.round(turns * 56))
  const points: Point[] = []
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps
    const angle = t * turns * Math.PI * 2
    const radius = t * maxRadius
    points.push({ x: centre.x + Math.cos(angle) * radius, y: centre.y + Math.sin(angle) * radius })
  }
  return [{ pen, points }]
}

function radialBurstMotif(rect: Rect, pen: number, rayCount: number, rng: Rng): Stroke[] {
  const centre = rectCentre(rect)
  const jitter = rng.range(-0.3, 0.3)
  const strokes: Stroke[] = []
  for (let index = 0; index < rayCount; index += 1) {
    const angle = ((index + jitter) / rayCount) * Math.PI * 2
    const direction = { x: Math.cos(angle), y: Math.sin(angle) }
    const clipped = clipLineToRect(centre, direction, rect)
    if (!clipped) continue
    strokes.push({ pen, points: [centre, clipped[1]] })
  }
  return strokes
}

function dotGridMotif(rect: Rect, spacing: number, pen: number): Stroke[] {
  const boundedSpacing = areaSpacingFloor(rect.width * rect.height, spacing, MAX_DOTS)
  const dotRadius = boundedSpacing * 0.16
  const columns = Math.max(1, Math.floor(rect.width / boundedSpacing))
  const rows = Math.max(1, Math.floor(rect.height / boundedSpacing))
  const insetX = (rect.width - (columns - 1) * boundedSpacing) / 2
  const insetY = (rect.height - (rows - 1) * boundedSpacing) / 2
  const strokes: Stroke[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const centre = {
        x: rect.x + insetX + column * boundedSpacing,
        y: rect.y + insetY + row * boundedSpacing,
      }
      strokes.push({ pen, points: circlePoints(centre, dotRadius, 10) })
    }
  }
  return strokes
}

interface FillBuildParams {
  cell: LeafCell
  kind: FillKind
  angle: number
  spacing: number
  pen: number
  altPen: number
  rng: Rng
  noise: Noise
}

function buildFillStrokes(params: FillBuildParams): Stroke[] {
  const { cell, kind, angle, spacing, pen, altPen, rng, noise } = params
  const rect = cell.rect
  if (kind === "empty") return []
  if (kind === "concentricRect") return boundedConcentricInsets(rect, spacing, pen)
  if (kind === "concentricCircle") return concentricCircleMotif(rect, spacing, pen)
  if (kind === "spiral") return spiralMotif(rect, pen, rng.range(2.5, 4.5))
  if (kind === "radialBurst") return radialBurstMotif(rect, pen, rng.int(10, 20), rng)
  if (kind === "dotGrid") return dotGridMotif(rect, spacing, pen)
  if (kind === "chevron") return chevronFill(rect, spacing, pen)
  if (kind === "sineWave") return sineWaveFill(rect, angle, spacing, pen, rng)
  if (kind === "crossHatch") {
    const primary = warpedHatchLines(rect, angle, spacing, pen, noise, rng)
    const secondary = boundedHatchLines(rect, angle + 90, spacing, altPen)
    return primary.concat(secondary)
  }
  if (kind === "warpedHatch") return warpedHatchLines(rect, angle, spacing, pen, noise, rng)
  return boundedHatchLines(rect, angle, spacing, pen)
}

function renderCell(
  cell: LeafCell,
  rng: Rng,
  fillConfig: FillConfig,
  penRule: PenRule,
  noise: Noise,
  penCount: number,
  outlineWidth: number,
  forceEmpty: ForceEmptyPredicate,
  split: SplitConfig
): CellRender {
  const angle = rng.pick([0, 45, 90, 135] as const)
  const spacing = rng.range(fillConfig.spacingMin, fillConfig.spacingMax)
  const kind = forceEmpty(cell, split) ? "empty" : pickWeighted(rng, fillConfig.weights)
  const pen = penForCell(penRule, cell, angle, kind, noise, penCount)
  const altPen = penCount >= 2 ? (pen + 1) % penCount : pen
  const fillStrokes = buildFillStrokes({ cell, kind, angle, spacing, pen, altPen, rng, noise })
  const outlineStroke =
    kind !== "empty" && rng.chance(fillConfig.outlineProbability)
      ? rectOutlineStroke(cell.rect, pen, outlineWidth)
      : null

  return { cell, pen, kind, angle, spacing, fillStrokes, outlineStroke }
}

function renderCells(
  leaves: LeafCell[],
  rng: Rng,
  noise: Noise,
  fillConfig: FillConfig,
  penRule: PenRule,
  penCount: number,
  outlineWidth: number,
  forceEmpty: ForceEmptyPredicate,
  split: SplitConfig
): CellRender[] {
  return leaves.map((cell) =>
    renderCell(cell, rng, fillConfig, penRule, noise, penCount, outlineWidth, forceEmpty, split)
  )
}

function filledCellCount(renders: readonly CellRender[]): number {
  return renders.filter((render) => render.kind !== "empty").length
}

function filledArea(renders: readonly CellRender[]): number {
  return renders
    .filter((render) => render.kind !== "empty")
    .reduce((sum, render) => sum + render.cell.rect.width * render.cell.rect.height, 0)
}

function isSparse(renders: readonly CellRender[], regionArea: number): boolean {
  if (filledCellCount(renders) < MIN_FILLED_CELLS) return true
  return filledArea(renders) / regionArea < MIN_FILLED_AREA_FRACTION
}

function hatchSpacingFor(rect: Rect): number {
  return Math.min(0.01, Math.max(0.004, Math.min(rect.width, rect.height) / 25))
}

function fillEmptyCells(renders: CellRender[], noise: Noise, rng: Rng): void {
  for (const render of renders) {
    if (render.kind !== "empty") continue
    const rect = render.cell.rect
    const spacing = hatchSpacingFor(rect)
    if (rng.chance(0.55)) {
      render.fillStrokes = warpedHatchLines(rect, render.angle, spacing, render.pen, noise, rng)
      render.kind = "warpedHatch"
    } else {
      render.fillStrokes = concentricCircleMotif(rect, spacing, render.pen)
      render.kind = "concentricCircle"
    }
    render.spacing = spacing
  }
}

function shrinkSplitConfig(config: SplitConfig): SplitConfig {
  return {
    ...config,
    minSize: config.minSize * 0.7,
    stopProbability: config.stopProbability * 0.6,
  }
}

const HATCHED_KINDS: readonly FillKind[] = [
  "hatch",
  "warpedHatch",
  "crossHatch",
  "sineWave",
  "chevron",
  "concentricRect",
]

function isHatchedKind(kind: FillKind): boolean {
  return HATCHED_KINDS.includes(kind)
}

function cellArea(render: CellRender): number {
  return render.cell.rect.width * render.cell.rect.height
}

function intensifyHatchedCells(
  renders: CellRender[],
  rng: Rng,
  noise: Noise,
  penCount: number,
  floor: number
): void {
  const hatched = renders
    .filter((render) => isHatchedKind(render.kind))
    .sort((a, b) => cellArea(b) - cellArea(a))

  for (const render of hatched) {
    if (totalStrokeCount(renders) >= floor) return
    render.spacing = Math.max(render.spacing / 2, 0.0015)
    const altPen = penCount >= 2 ? (render.pen + 1) % penCount : render.pen
    render.fillStrokes = buildFillStrokes({
      cell: render.cell,
      kind: render.kind,
      angle: render.angle,
      spacing: render.spacing,
      pen: render.pen,
      altPen,
      rng,
      noise,
    })
  }
}

function boostRendersToFloor(
  renders: CellRender[],
  region: Rect,
  depthOffset: number,
  split: SplitConfig,
  fill: FillConfig,
  penRule: PenRule,
  rng: Rng,
  noise: Noise,
  penCount: number,
  outlineWidth: number,
  forceEmpty: ForceEmptyPredicate,
  floor: number
): CellRender[] {
  let current = renders
  if (totalStrokeCount(current) >= floor) return current

  intensifyHatchedCells(current, rng, noise, penCount, floor)
  if (totalStrokeCount(current) >= floor) return current

  fillEmptyCells(current, noise, rng)
  if (totalStrokeCount(current) >= floor) return current

  let denserSplit = split
  for (let attempt = 0; attempt < 4 && totalStrokeCount(current) < floor; attempt += 1) {
    denserSplit = shrinkSplitConfig(denserSplit)
    if (denserSplit.minSize < 0.008) break
    const leaves: LeafCell[] = []
    subdivide(region, depthOffset, denserSplit, rng, leaves)
    current = renderCells(
      leaves,
      rng,
      noise,
      fill,
      penRule,
      penCount,
      outlineWidth,
      forceEmpty,
      denserSplit
    )
    intensifyHatchedCells(current, rng, noise, penCount, floor)
    fillEmptyCells(current, noise, rng)
  }

  return current
}

interface RegionRender {
  renders: CellRender[]
  penRule: PenRule
}

function renderRegionWithRetries(
  rng: Rng,
  noise: Noise,
  penCount: number,
  region: Rect,
  depthOffset: number,
  split: SplitConfig,
  fill: FillConfig,
  outlineWidth: number,
  forceEmpty: ForceEmptyPredicate = neverForceEmpty
): RegionRender {
  const regionArea = region.width * region.height
  let config = split
  let renders: CellRender[] = []
  let penRule: PenRule = "depth"

  for (let attempt = 0; attempt < MAX_SUBDIVIDE_ATTEMPTS; attempt += 1) {
    const leaves: LeafCell[] = []
    subdivide(region, depthOffset, config, rng, leaves)
    penRule = pickPenRule(rng, penCount)
    renders = renderCells(
      leaves,
      rng,
      noise,
      fill,
      penRule,
      penCount,
      outlineWidth,
      forceEmpty,
      config
    )
    if (!isSparse(renders, regionArea)) return { renders, penRule }
    config = shrinkSplitConfig(config)
  }

  if (isSparse(renders, regionArea)) fillEmptyCells(renders, noise, rng)
  return { renders, penRule }
}

function combinedStrokes(render: CellRender): Stroke[] {
  return render.outlineStroke ? [...render.fillStrokes, render.outlineStroke] : render.fillStrokes
}

function totalStrokeCount(renders: readonly CellRender[]): number {
  return renders.reduce((sum, render) => sum + combinedStrokes(render).length, 0)
}

function cellRenderStrokes(renders: readonly CellRender[]): Stroke[] {
  return renders.flatMap(combinedStrokes)
}

const aliveFillWeights: FillWeights = [
  ["empty", 0.22],
  ["warpedHatch", 0.32],
  ["hatch", 0.08],
  ["crossHatch", 0.08],
  ["sineWave", 0.08],
  ["chevron", 0.06],
  ["concentricRect", 0.04],
  ["concentricCircle", 0.05],
  ["spiral", 0.03],
  ["radialBurst", 0.02],
  ["dotGrid", 0.02],
]

const editorialFillWeights: FillWeights = [
  ["empty", 0.12],
  ["warpedHatch", 0.34],
  ["hatch", 0.1],
  ["crossHatch", 0.22],
  ["sineWave", 0.08],
  ["chevron", 0.06],
  ["concentricRect", 0.03],
  ["concentricCircle", 0.02],
  ["dotGrid", 0.03],
]

const spiralFillWeights: FillWeights = [
  ["warpedHatch", 0.34],
  ["hatch", 0.07],
  ["concentricCircle", 0.22],
  ["spiral", 0.17],
  ["sineWave", 0.1],
  ["dotGrid", 0.05],
  ["chevron", 0.05],
]

const wideGutterFillWeights: FillWeights = [
  ["empty", 0.3],
  ["warpedHatch", 0.28],
  ["hatch", 0.07],
  ["crossHatch", 0.07],
  ["concentricRect", 0.08],
  ["concentricCircle", 0.06],
  ["sineWave", 0.06],
  ["dotGrid", 0.04],
  ["chevron", 0.04],
]

const dominantNeighbourWeights: FillWeights = [
  ["empty", 0.42],
  ["warpedHatch", 0.32],
  ["hatch", 0.1],
  ["sineWave", 0.06],
  ["dotGrid", 0.05],
  ["concentricRect", 0.05],
]

function structuredConfig(): { split: SplitConfig; fill: FillConfig } {
  return {
    split: {
      ratios: [0.382, 0.5, 0.618],
      maxDepth: 5,
      minSize: 0.13,
      stopProbability: 0.08,
      stopProbabilityGrowth: 0.12,
      gutter: 0.014,
      gutterFalloff: 1,
      fixedAxisAlternation: false,
    },
    fill: {
      weights: aliveFillWeights,
      spacingMin: 0.007,
      spacingMax: 0.012,
      outlineProbability: 0.7,
    },
  }
}

function editorialConfig(): { split: SplitConfig; fill: FillConfig } {
  return {
    split: {
      ratios: [0.382, 0.5, 0.618],
      maxDepth: 7,
      minSize: 0.055,
      stopProbability: 0.04,
      stopProbabilityGrowth: 0.08,
      gutter: 0.008,
      gutterFalloff: 1,
      fixedAxisAlternation: false,
    },
    fill: {
      weights: editorialFillWeights,
      spacingMin: 0.005,
      spacingMax: 0.008,
      outlineProbability: 0.12,
    },
  }
}

function spiralConfig(): { split: SplitConfig; fill: FillConfig } {
  return {
    split: {
      ratios: [0.618],
      maxDepth: 6,
      minSize: 0.045,
      stopProbability: 0.05,
      stopProbabilityGrowth: 0.1,
      gutter: 0.01,
      gutterFalloff: 1,
      fixedAxisAlternation: true,
    },
    fill: {
      weights: spiralFillWeights,
      spacingMin: 0.006,
      spacingMax: 0.01,
      outlineProbability: 0.25,
    },
  }
}

function wideGutterConfig(): { split: SplitConfig; fill: FillConfig } {
  return {
    split: {
      ratios: [0.382, 0.5, 0.618],
      maxDepth: 5,
      minSize: 0.09,
      stopProbability: 0.08,
      stopProbabilityGrowth: 0.1,
      gutter: 0.05,
      gutterFalloff: 0.55,
      fixedAxisAlternation: false,
    },
    fill: {
      weights: wideGutterFillWeights,
      spacingMin: 0.007,
      spacingMax: 0.012,
      outlineProbability: 0.55,
    },
  }
}

const smallestCellForceEmpty: ForceEmptyPredicate = (cell, split) =>
  cell.rect.width * cell.rect.height <= split.minSize * split.minSize * 2.5

const MIN_STROKE_FLOOR = 160

type DominantKind = "concentricCircle" | "spiral" | "radialBurst"

function generateDominant(rng: Rng, noise: Noise, penCount: number): Stroke[] {
  const rect = drawableRect()
  const dominantAxis: SplitAxis = rng.chance(0.5) ? "x" : "y"
  const dominantRatio = rng.range(0.68, 0.82)
  const dominantFirst = rng.chance(0.5)
  const gutter = 0.012
  const [a, b] = splitRect(
    rect,
    dominantAxis,
    dominantFirst ? dominantRatio : 1 - dominantRatio,
    gutter
  )
  const dominantRect = dominantFirst ? a : b
  const remainderRect = dominantFirst ? b : a

  const remainderConfig: SplitConfig = {
    ratios: [0.382, 0.5, 0.618],
    maxDepth: 7,
    minSize: 0.03,
    stopProbability: 0.12,
    stopProbabilityGrowth: 0.08,
    gutter: 0.006,
    gutterFalloff: 1,
    fixedAxisAlternation: false,
  }
  const fillConfig: FillConfig = {
    weights: dominantNeighbourWeights,
    spacingMin: 0.006,
    spacingMax: 0.01,
    outlineProbability: 0.25,
  }
  const remainderOutlineWidth = DEFAULT_STROKE_WIDTH * 0.75

  const { renders, penRule } = renderRegionWithRetries(
    rng,
    noise,
    penCount,
    remainderRect,
    1,
    remainderConfig,
    fillConfig,
    remainderOutlineWidth
  )

  const dominantKind: DominantKind = rng.pick([
    "concentricCircle",
    "spiral",
    "radialBurst",
  ] as const)
  const dominantPen = penForCell(
    penRule,
    { rect: dominantRect, depth: 0 },
    0,
    dominantKind,
    noise,
    penCount
  )

  let dominantSpacing = rng.range(0.012, 0.02)
  let dominantTurns = rng.range(5, 8)
  let dominantRayCount = rng.int(18, 32)

  const buildDominantStrokes = (): Stroke[] => {
    if (dominantKind === "concentricCircle")
      return concentricCircleMotif(dominantRect, dominantSpacing, dominantPen)
    if (dominantKind === "spiral") return spiralMotif(dominantRect, dominantPen, dominantTurns)
    return radialBurstMotif(dominantRect, dominantPen, dominantRayCount, rng)
  }

  let dominantStrokes = buildDominantStrokes()
  const dominantOutline = rectOutlineStroke(dominantRect, dominantPen, DEFAULT_STROKE_WIDTH * 1.1)

  const neededFromRemainder = Math.max(0, MIN_STROKE_FLOOR - (dominantStrokes.length + 1))
  const boostedRenders = boostRendersToFloor(
    renders,
    remainderRect,
    1,
    remainderConfig,
    fillConfig,
    penRule,
    rng,
    noise,
    penCount,
    remainderOutlineWidth,
    neverForceEmpty,
    neededFromRemainder
  )

  const total = totalStrokeCount(boostedRenders) + dominantStrokes.length + 1
  if (total < MIN_STROKE_FLOOR) {
    if (dominantKind === "concentricCircle")
      dominantSpacing = Math.max(dominantSpacing / 2.4, 0.004)
    else if (dominantKind === "spiral") dominantTurns *= 1.8
    else dominantRayCount = Math.min(60, dominantRayCount * 2)
    dominantStrokes = buildDominantStrokes()
  }

  return [...cellRenderStrokes(boostedRenders), ...dominantStrokes, dominantOutline]
}

function generateFromConfig(
  rng: Rng,
  noise: Noise,
  penCount: number,
  split: SplitConfig,
  fill: FillConfig,
  outlineWidth: number,
  forceEmpty: ForceEmptyPredicate = neverForceEmpty
): Stroke[] {
  const region = drawableRect()
  const { renders, penRule } = renderRegionWithRetries(
    rng,
    noise,
    penCount,
    region,
    0,
    split,
    fill,
    outlineWidth,
    forceEmpty
  )
  const boosted = boostRendersToFloor(
    renders,
    region,
    0,
    split,
    fill,
    penRule,
    rng,
    noise,
    penCount,
    outlineWidth,
    forceEmpty,
    MIN_STROKE_FLOOR
  )
  return cellRenderStrokes(boosted)
}

function generateSubstyle(substyle: number, rng: Rng, noise: Noise, penCount: number): Stroke[] {
  if (substyle === 0) {
    const { split, fill } = structuredConfig()
    return generateFromConfig(rng, noise, penCount, split, fill, DEFAULT_STROKE_WIDTH)
  }
  if (substyle === 1) {
    const { split, fill } = editorialConfig()
    return generateFromConfig(rng, noise, penCount, split, fill, DEFAULT_STROKE_WIDTH * 0.6)
  }
  if (substyle === 2) return generateDominant(rng, noise, penCount)
  if (substyle === 3) {
    const { split, fill } = spiralConfig()
    return generateFromConfig(
      rng,
      noise,
      penCount,
      split,
      fill,
      DEFAULT_STROKE_WIDTH * 0.85,
      smallestCellForceEmpty
    )
  }

  const { split, fill } = wideGutterConfig()
  return generateFromConfig(rng, noise, penCount, split, fill, DEFAULT_STROKE_WIDTH)
}

export const partition: Family = {
  name: "partition",
  weight: 0.7,
  generate: ({ rng, noise, penCount }: FamilyContext): Stroke[] => {
    const substyle = rng.int(0, 4)
    return generateSubstyle(substyle, rng, noise, penCount)
  },
}
