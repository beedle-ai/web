import type { Family, FamilyContext, Noise, Point, Rng, Stroke } from "../types"
import { arcPoints, clamp, drawableRect } from "./shared-b"
import type { Rect } from "./shared-b"

type Orientation = "forward" | "backward"
type TileKind = "arcs" | "straight" | "diagonal" | "blank"
type PenRule = "orientation" | "region" | "offset"

interface Tile {
  kind: TileKind
  orientation: Orientation
}

interface Grid {
  originX: number
  originY: number
  columns: number
  rows: number
  cellSize: number
}

const ARC_SPACING = 0.006

function tileCorners(originX: number, originY: number, size: number) {
  return {
    topLeft: { x: originX, y: originY },
    topRight: { x: originX + size, y: originY },
    bottomLeft: { x: originX, y: originY + size },
    bottomRight: { x: originX + size, y: originY + size },
  }
}

type PenForLane = (lane: number) => number

const DEFAULT_RIBBON_SPACING_FRACTION = 0.085

function arcTileStrokes(
  originX: number,
  originY: number,
  size: number,
  orientation: Orientation,
  offsetCount: number,
  penForLane: PenForLane,
  ribbonSpacingFraction: number = DEFAULT_RIBBON_SPACING_FRACTION
): Stroke[] {
  const corners = tileCorners(originX, originY, size)
  const cornerA = orientation === "forward" ? corners.topLeft : corners.topRight
  const cornerB = orientation === "forward" ? corners.bottomRight : corners.bottomLeft
  const startA = orientation === "forward" ? 0 : Math.PI / 2
  const endA = startA + Math.PI / 2
  const startB = startA + Math.PI
  const endB = endA + Math.PI

  const baseRadius = size / 2
  const ribbonSpacing = size * ribbonSpacingFraction
  const strokes: Stroke[] = []
  for (let index = 0; index < offsetCount; index += 1) {
    const radius = baseRadius + (index - (offsetCount - 1) / 2) * ribbonSpacing
    const pen = penForLane(index)
    strokes.push({ pen, points: arcPoints(cornerA, radius, startA, endA, ARC_SPACING) })
    strokes.push({ pen, points: arcPoints(cornerB, radius, startB, endB, ARC_SPACING) })
  }
  return strokes
}

function straightTileStrokes(
  originX: number,
  originY: number,
  size: number,
  orientation: Orientation,
  laneCount: number,
  penForLane: PenForLane
): Stroke[] {
  const vertical = orientation === "forward"
  const strokes: Stroke[] = []
  for (let index = 0; index < laneCount; index += 1) {
    const offset = size * ((index + 1) / (laneCount + 1) - 0.5) * 0.6
    const points: Point[] = vertical
      ? [
          { x: originX + size / 2 + offset, y: originY },
          { x: originX + size / 2 + offset, y: originY + size },
        ]
      : [
          { x: originX, y: originY + size / 2 + offset },
          { x: originX + size, y: originY + size / 2 + offset },
        ]
    strokes.push({ pen: penForLane(index), points })
  }
  return strokes
}

function diagonalTileStrokes(
  originX: number,
  originY: number,
  size: number,
  laneCount: number,
  penForLane: PenForLane
): Stroke[] {
  const corners = tileCorners(originX, originY, size)
  const strokes: Stroke[] = []
  const step = (size * 0.28) / laneCount
  for (let index = 0; index < laneCount; index += 1) {
    const shift = (index - (laneCount - 1) / 2) * step
    const pen = penForLane(index)
    strokes.push({
      pen,
      points: [
        { x: corners.topLeft.x + shift, y: corners.topLeft.y },
        { x: corners.bottomRight.x + shift, y: corners.bottomRight.y },
      ],
    })
    strokes.push({
      pen,
      points: [
        { x: corners.topRight.x - shift, y: corners.topRight.y },
        { x: corners.bottomLeft.x - shift, y: corners.bottomLeft.y },
      ],
    })
  }
  return strokes
}

function chooseOffsetCount(rng: Rng, columns: number, rows: number, targetStrokes: number): number {
  const raw = Math.round(targetStrokes / (columns * rows * 2))
  return Math.min(6, Math.max(2, raw + rng.int(-1, 1)))
}

function buildGrid(rect: Rect, columns: number, rows: number): Grid {
  const cellSize = Math.min(rect.width / columns, rect.height / rows)
  const originX = rect.x + (rect.width - cellSize * columns) / 2
  const originY = rect.y + (rect.height - cellSize * rows) / 2
  return { originX, originY, columns, rows, cellSize }
}

function chooseOccupiedRect(rng: Rng): Rect {
  const rect = drawableRect()
  if (!rng.chance(0.28)) return rect

  const fraction = rng.range(0.55, 0.82)
  const width = rect.width * fraction
  const height = rect.height * fraction
  const anchor = rng.pick(["centre", "top-left", "bottom-right", "left", "right"] as const)
  const slackX = rect.width - width
  const slackY = rect.height - height

  if (anchor === "top-left") return { x: rect.x, y: rect.y, width, height }
  if (anchor === "bottom-right") return { x: rect.x + slackX, y: rect.y + slackY, width, height }
  if (anchor === "left") return { x: rect.x, y: rect.y + slackY / 2, width, height }
  if (anchor === "right") return { x: rect.x + slackX, y: rect.y + slackY / 2, width, height }
  return { x: rect.x + slackX / 2, y: rect.y + slackY / 2, width, height }
}

interface RegionField {
  scale: number
  ditherAmount: number
}

function buildRegionField(rng: Rng): RegionField {
  return { scale: rng.range(1.4, 3.2), ditherAmount: rng.range(0.05, 0.16) }
}

function organicRegionPenAt(
  noise: Noise,
  rng: Rng,
  field: RegionField,
  normalisedX: number,
  normalisedY: number,
  penCount: number
): number {
  if (penCount <= 1) return 0
  const sample = noise.fbm(normalisedX * field.scale, normalisedY * field.scale, 3)
  const dithered = sample + rng.range(-field.ditherAmount, field.ditherAmount)
  const normalised = clamp((dithered + 1) / 2, 0, 0.9999)
  return Math.floor(normalised * penCount)
}

function buildPenForLane(
  rule: PenRule,
  tile: Tile,
  penCount: number,
  regionPen: number
): PenForLane {
  if (penCount <= 1) return () => 0
  if (rule === "orientation") {
    const pen = tile.orientation === "forward" ? 0 : 1 % penCount
    return () => pen
  }
  if (rule === "region") return () => regionPen
  return (lane) => lane % penCount
}

function classicTile(rng: Rng, blankProbability: number): Tile {
  if (rng.chance(blankProbability)) return { kind: "blank", orientation: "forward" }
  return { kind: "arcs", orientation: rng.chance(0.5) ? "forward" : "backward" }
}

function mixedTile(rng: Rng, blankProbability: number): Tile {
  if (rng.chance(blankProbability)) return { kind: "blank", orientation: "forward" }
  const orientation: Orientation = rng.chance(0.5) ? "forward" : "backward"
  const roll = rng.next()
  if (roll < 0.62) return { kind: "arcs", orientation }
  if (roll < 0.82) return { kind: "straight", orientation }
  return { kind: "diagonal", orientation }
}

function regionTile(
  noise: Noise,
  column: number,
  row: number,
  columns: number,
  rows: number,
  rng: Rng,
  blankProbability: number
): Tile {
  if (rng.chance(blankProbability)) return { kind: "blank", orientation: "forward" }
  const sample = noise.fbm(column / columns, row / rows, 3)
  return { kind: "arcs", orientation: sample > 0 ? "forward" : "backward" }
}

function suppressAdjacentBlanks(
  tile: Tile,
  column: number,
  row: number,
  blankGrid: boolean[][],
  rng: Rng
): Tile {
  if (tile.kind !== "blank") return tile
  const leftBlank = column > 0 && blankGrid[row][column - 1]
  const topBlank = row > 0 && blankGrid[row - 1][column]
  if (!leftBlank && !topBlank) return tile
  return { kind: "arcs", orientation: rng.chance(0.5) ? "forward" : "backward" }
}

function renderTile(
  tile: Tile,
  originX: number,
  originY: number,
  cellSize: number,
  offsetCount: number,
  penForLane: PenForLane
): Stroke[] {
  if (tile.kind === "arcs")
    return arcTileStrokes(originX, originY, cellSize, tile.orientation, offsetCount, penForLane)
  if (tile.kind === "straight")
    return straightTileStrokes(
      originX,
      originY,
      cellSize,
      tile.orientation,
      Math.max(2, offsetCount - 1),
      penForLane
    )
  if (tile.kind === "diagonal")
    return diagonalTileStrokes(originX, originY, cellSize, Math.max(1, offsetCount - 2), penForLane)
  return []
}

function generateStandard(rng: Rng, noise: Noise, penCount: number, substyle: number): Stroke[] {
  const columns = rng.int(6, 22)
  const rows = clamp(rng.int(6, 22), Math.round(columns * 0.65), Math.round(columns * 1.55))
  const targetStrokes = rng.range(900, 2400)
  const offsetCount = chooseOffsetCount(rng, columns, rows, targetStrokes)
  const blankProbability = rng.range(0.005, 0.03)
  const penRule: PenRule = substyle === 2 ? "region" : rng.pick(["orientation", "offset"] as const)
  const regionField = penRule === "region" ? buildRegionField(rng) : null
  const occupiedRect = chooseOccupiedRect(rng)
  const grid = buildGrid(occupiedRect, columns, rows)
  const blankGrid: boolean[][] = Array.from({ length: grid.rows }, () =>
    new Array(grid.columns).fill(false)
  )

  const strokes: Stroke[] = []
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const candidate =
        substyle === 2
          ? regionTile(noise, column, row, grid.columns, grid.rows, rng, blankProbability)
          : substyle === 1
            ? mixedTile(rng, blankProbability)
            : classicTile(rng, blankProbability)
      const tile = suppressAdjacentBlanks(candidate, column, row, blankGrid, rng)
      blankGrid[row][column] = tile.kind === "blank"
      if (tile.kind === "blank") continue

      const originX = grid.originX + column * grid.cellSize
      const originY = grid.originY + row * grid.cellSize
      const regionPen = regionField
        ? organicRegionPenAt(
            noise,
            rng,
            regionField,
            column / grid.columns,
            row / grid.rows,
            penCount
          )
        : 0
      const penForLane = buildPenForLane(penRule, tile, penCount, regionPen)
      strokes.push(...renderTile(tile, originX, originY, grid.cellSize, offsetCount, penForLane))
    }
  }
  return strokes
}

function generateMultiScale(rng: Rng, noise: Noise, penCount: number): Stroke[] {
  const rect = drawableRect()
  const splitVertically = rng.chance(0.5)
  const columnsCoarse = rng.int(6, 12)
  const rowsCoarse = rng.int(6, 12)
  const blankProbability = rng.range(0.005, 0.03)

  const halves = splitVertically
    ? [
        {
          rect: { x: rect.x, y: rect.y, width: rect.width / 2, height: rect.height },
          columns: columnsCoarse,
          rows: rowsCoarse,
        },
        {
          rect: {
            x: rect.x + rect.width / 2,
            y: rect.y,
            width: rect.width / 2,
            height: rect.height,
          },
          columns: columnsCoarse * 2,
          rows: rowsCoarse * 2,
        },
      ]
    : [
        {
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height / 2 },
          columns: columnsCoarse,
          rows: rowsCoarse,
        },
        {
          rect: {
            x: rect.x,
            y: rect.y + rect.height / 2,
            width: rect.width,
            height: rect.height / 2,
          },
          columns: columnsCoarse * 2,
          rows: rowsCoarse * 2,
        },
      ]

  const penMode = penCount <= 1 ? "offset" : rng.pick(["offset", "noise"] as const)
  const regionField = penCount > 1 && penMode === "noise" ? buildRegionField(rng) : null

  const strokes: Stroke[] = []
  halves.forEach((half) => {
    const cellSize = Math.min(half.rect.width / half.columns, half.rect.height / half.rows)
    const originX = half.rect.x + (half.rect.width - cellSize * half.columns) / 2
    const originY = half.rect.y + (half.rect.height - cellSize * half.rows) / 2
    const offsetCount = chooseOffsetCount(rng, half.columns, half.rows, 900)
    const blankGrid: boolean[][] = Array.from({ length: half.rows }, () =>
      new Array(half.columns).fill(false)
    )

    for (let row = 0; row < half.rows; row += 1) {
      for (let column = 0; column < half.columns; column += 1) {
        const candidate: Tile = rng.chance(blankProbability)
          ? { kind: "blank", orientation: "forward" }
          : { kind: "arcs", orientation: rng.chance(0.5) ? "forward" : "backward" }
        const tile = suppressAdjacentBlanks(candidate, column, row, blankGrid, rng)
        blankGrid[row][column] = tile.kind === "blank"
        if (tile.kind === "blank") continue

        const originX0 = originX + column * cellSize
        const originY0 = originY + row * cellSize
        let penForLane: PenForLane
        if (penMode === "offset") {
          penForLane = (lane) => lane % penCount
        } else {
          const normalisedX = (originX0 + cellSize / 2 - rect.x) / rect.width
          const normalisedY = (originY0 + cellSize / 2 - rect.y) / rect.height
          const regionPen = regionField
            ? organicRegionPenAt(noise, rng, regionField, normalisedX, normalisedY, penCount)
            : 0
          penForLane = () => regionPen
        }
        strokes.push(
          ...arcTileStrokes(originX0, originY0, cellSize, tile.orientation, offsetCount, penForLane)
        )
      }
    }
  })
  return strokes
}

const WIDE_BAND_TOTAL_SPAN_FRACTION = 0.16

function generateWideBands(rng: Rng): Stroke[] {
  const columns = rng.int(5, 8)
  const rows = clamp(rng.int(5, 8), Math.round(columns * 0.7), Math.round(columns * 1.4))
  const offsetCount = rng.int(6, 10)
  const ribbonSpacingFraction = WIDE_BAND_TOTAL_SPAN_FRACTION / offsetCount
  const grid = buildGrid(drawableRect(), columns, rows)
  const penForLane: PenForLane = () => 0

  const strokes: Stroke[] = []
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const orientation: Orientation = rng.chance(0.5) ? "forward" : "backward"
      const originX = grid.originX + column * grid.cellSize
      const originY = grid.originY + row * grid.cellSize
      strokes.push(
        ...arcTileStrokes(
          originX,
          originY,
          grid.cellSize,
          orientation,
          offsetCount,
          penForLane,
          ribbonSpacingFraction
        )
      )
    }
  }
  return strokes
}

export const weave: Family = {
  name: "weave",
  weight: 1,
  generate: ({ rng, noise, penCount }: FamilyContext): Stroke[] => {
    const substyle = rng.int(0, 4)
    if (substyle === 3) return generateMultiScale(rng, noise, penCount)
    if (substyle === 4) return generateWideBands(rng)
    return generateStandard(rng, noise, penCount, substyle)
  },
}
