import type { Family, FamilyContext, Noise, Rng, Stroke } from "../types"
import { DEFAULT_STROKE_WIDTH } from "../types"
import {
  concentricInsets,
  drawableRect,
  hatchLines,
  rectCentre,
  rectOutlineStroke,
} from "./shared-b"
import type { Rect } from "./shared-b"

type SplitAxis = "x" | "y"
type PenRule = "depth" | "angle" | "noise"
type FillKind = "empty" | "hatch" | "crossHatch" | "concentric"
type HatchAngle = 0 | 45 | 90 | 135

interface SplitConfig {
  ratios: readonly number[]
  maxDepth: number
  minSize: number
  stopProbability: number
  stopProbabilityGrowth: number
  gutter: number
  fixedAxisAlternation: boolean
}

interface FillConfig {
  emptyProbability: number
  crossHatchProbability: number
  concentricProbability: number
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
  strokes: Stroke[]
}

const MAX_LEAVES = 220
const MAX_SUBDIVIDE_ATTEMPTS = 5
const MIN_FILLED_CELLS = 6
const MIN_FILLED_AREA_FRACTION = 0.3

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
  const [first, second] = splitRect(rect, axis, ratio, config.gutter)
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
  return rng.pick(["depth", "angle", "noise"] as const)
}

function penForCell(
  rule: PenRule,
  cell: LeafCell,
  angle: number,
  noise: Noise,
  penCount: number
): number {
  if (penCount <= 1) return 0
  if (rule === "depth") return cell.depth % penCount
  if (rule === "angle") return Math.floor(angle / 45) % penCount
  const centre = rectCentre(cell.rect)
  const sample = noise.fbm(centre.x * 3, centre.y * 3, 3)
  const band = Math.floor(((sample + 1) / 2) * penCount)
  return Math.min(penCount - 1, Math.max(0, band))
}

function chooseFill(rng: Rng, fillConfig: FillConfig): FillKind {
  if (rng.chance(fillConfig.emptyProbability)) return "empty"
  if (rng.chance(fillConfig.concentricProbability)) return "concentric"
  if (rng.chance(fillConfig.crossHatchProbability)) return "crossHatch"
  return "hatch"
}

function buildFillStrokes(
  cell: LeafCell,
  kind: FillKind,
  angle: number,
  spacing: number,
  pen: number,
  altPen: number
): Stroke[] {
  if (kind === "empty") return []
  if (kind === "concentric") return concentricInsets(cell.rect, spacing, pen)
  if (kind === "crossHatch") {
    const primary = hatchLines(cell.rect, angle, spacing, pen)
    const secondary = hatchLines(cell.rect, angle + 90, spacing, altPen)
    return primary.concat(secondary)
  }
  return hatchLines(cell.rect, angle, spacing, pen)
}

function renderCell(
  cell: LeafCell,
  rng: Rng,
  fillConfig: FillConfig,
  penRule: PenRule,
  noise: Noise,
  penCount: number,
  outlineWidth: number
): CellRender {
  const angle = rng.pick([0, 45, 90, 135] as const)
  const pen = penForCell(penRule, cell, angle, noise, penCount)
  const altPen = penCount >= 2 ? (pen + 1) % penCount : pen
  const spacing = rng.range(fillConfig.spacingMin, fillConfig.spacingMax)
  const kind = chooseFill(rng, fillConfig)
  const strokes = buildFillStrokes(cell, kind, angle, spacing, pen, altPen)

  if (rng.chance(fillConfig.outlineProbability))
    strokes.push(rectOutlineStroke(cell.rect, pen, outlineWidth))

  return { cell, pen, kind, strokes }
}

function renderCells(
  leaves: LeafCell[],
  rng: Rng,
  noise: Noise,
  fillConfig: FillConfig,
  penRule: PenRule,
  penCount: number,
  outlineWidth: number
): CellRender[] {
  return leaves.map((cell) =>
    renderCell(cell, rng, fillConfig, penRule, noise, penCount, outlineWidth)
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

function fillEmptyCells(renders: CellRender[]): void {
  for (const render of renders) {
    if (render.kind !== "empty") continue
    const angle = ((render.cell.depth % 4) * 45) as HatchAngle
    const spacing = hatchSpacingFor(render.cell.rect)
    render.strokes.push(...hatchLines(render.cell.rect, angle, spacing, render.pen))
    render.kind = "hatch"
  }
}

function shrinkSplitConfig(config: SplitConfig): SplitConfig {
  return { ...config, minSize: config.minSize * 0.7, stopProbability: config.stopProbability * 0.6 }
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
  outlineWidth: number
): RegionRender {
  const regionArea = region.width * region.height
  let config = split
  let renders: CellRender[] = []
  let penRule: PenRule = "depth"

  for (let attempt = 0; attempt < MAX_SUBDIVIDE_ATTEMPTS; attempt += 1) {
    const leaves: LeafCell[] = []
    subdivide(region, depthOffset, config, rng, leaves)
    penRule = pickPenRule(rng, penCount)
    renders = renderCells(leaves, rng, noise, fill, penRule, penCount, outlineWidth)
    if (!isSparse(renders, regionArea)) return { renders, penRule }
    config = shrinkSplitConfig(config)
  }

  if (isSparse(renders, regionArea)) fillEmptyCells(renders)
  return { renders, penRule }
}

function cellRenderStrokes(renders: readonly CellRender[]): Stroke[] {
  return renders.flatMap((render) => render.strokes)
}

function mondrianConfig(): { split: SplitConfig; fill: FillConfig } {
  return {
    split: {
      ratios: [0.382, 0.5, 0.618],
      maxDepth: 5,
      minSize: 0.13,
      stopProbability: 0.08,
      stopProbabilityGrowth: 0.12,
      gutter: 0.014,
      fixedAxisAlternation: false,
    },
    fill: {
      emptyProbability: 0.4,
      crossHatchProbability: 0.08,
      concentricProbability: 0.06,
      spacingMin: 0.01,
      spacingMax: 0.014,
      outlineProbability: 0.85,
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
      fixedAxisAlternation: false,
    },
    fill: {
      emptyProbability: 0.2,
      crossHatchProbability: 0.25,
      concentricProbability: 0.08,
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
      fixedAxisAlternation: true,
    },
    fill: {
      emptyProbability: 0.25,
      crossHatchProbability: 0.1,
      concentricProbability: 0.32,
      spacingMin: 0.007,
      spacingMax: 0.011,
      outlineProbability: 0.3,
    },
  }
}

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
    stopProbability: 0.05,
    stopProbabilityGrowth: 0.06,
    gutter: 0.006,
    fixedAxisAlternation: false,
  }
  const fillConfig: FillConfig = {
    emptyProbability: 0.22,
    crossHatchProbability: 0.2,
    concentricProbability: 0.1,
    spacingMin: 0.005,
    spacingMax: 0.008,
    outlineProbability: 0.35,
  }

  const { renders, penRule } = renderRegionWithRetries(
    rng,
    noise,
    penCount,
    remainderRect,
    1,
    remainderConfig,
    fillConfig,
    DEFAULT_STROKE_WIDTH * 0.75
  )
  const strokes = cellRenderStrokes(renders)

  const dominantPen = penForCell(penRule, { rect: dominantRect, depth: 0 }, 0, noise, penCount)
  const dominantSpacing = rng.range(0.012, 0.02)
  strokes.push(...concentricInsets(dominantRect, dominantSpacing, dominantPen))
  strokes.push(rectOutlineStroke(dominantRect, dominantPen, DEFAULT_STROKE_WIDTH * 1.4))

  return strokes
}

function generateFromConfig(
  rng: Rng,
  noise: Noise,
  penCount: number,
  split: SplitConfig,
  fill: FillConfig,
  outlineWidth: number
): Stroke[] {
  const region = drawableRect()
  const { renders } = renderRegionWithRetries(
    rng,
    noise,
    penCount,
    region,
    0,
    split,
    fill,
    outlineWidth
  )
  return cellRenderStrokes(renders)
}

export const partition: Family = {
  name: "partition",
  weight: 1,
  generate: ({ rng, noise, penCount }: FamilyContext): Stroke[] => {
    const substyle = rng.int(0, 3)
    if (substyle === 0) {
      const { split, fill } = mondrianConfig()
      return generateFromConfig(rng, noise, penCount, split, fill, DEFAULT_STROKE_WIDTH * 1.5)
    }
    if (substyle === 1) {
      const { split, fill } = editorialConfig()
      return generateFromConfig(rng, noise, penCount, split, fill, DEFAULT_STROKE_WIDTH * 0.75)
    }
    if (substyle === 2) return generateDominant(rng, noise, penCount)

    const { split, fill } = spiralConfig()
    return generateFromConfig(rng, noise, penCount, split, fill, DEFAULT_STROKE_WIDTH)
  },
}
