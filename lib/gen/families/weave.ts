import type { Family, FamilyContext, Noise, Point, Rng, Stroke } from "../types"
import { DEFAULT_STROKE_WIDTH } from "../types"
import { CONTENT_MARGIN, arcPoints, clamp, drawableRect, rectCentre } from "./shared-b"
import type { Rect } from "./shared-b"
import { domainWarp, rotatePoint } from "./shared-c"

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

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function withinRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

function triangleArcStroke(
  vertex: Point,
  midA: Point,
  midB: Point,
  radius: number,
  pen: number
): Stroke {
  const angleA = Math.atan2(midA.y - vertex.y, midA.x - vertex.x)
  const angleToB = Math.atan2(midB.y - vertex.y, midB.x - vertex.x)
  let delta = angleToB - angleA
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  return { pen, points: arcPoints(vertex, radius, angleA, angleA + delta, ARC_SPACING) }
}

function buildTriangleRows(rect: Rect, side: number): Point[][] {
  const rowHeight = (side * Math.sqrt(3)) / 2
  const rows = Math.floor(rect.height / rowHeight) + 2
  const columns = Math.floor(rect.width / side) + 2
  const grid: Point[][] = []
  for (let row = 0; row <= rows; row += 1) {
    const offset = row % 2 === 1 ? side / 2 : 0
    const rowPoints: Point[] = []
    for (let column = 0; column <= columns; column += 1) {
      rowPoints.push({ x: rect.x + column * side + offset, y: rect.y + row * rowHeight })
    }
    grid.push(rowPoints)
  }
  return grid
}

function pushTriangleArcs(
  strokes: Stroke[],
  vertices: readonly [Point, Point, Point],
  rect: Rect,
  side: number,
  lanes: number,
  laneSpacing: number,
  rng: Rng,
  penCount: number
): void {
  if (!vertices.every((vertex) => withinRect(vertex, rect))) return
  const vertexIndex = rng.int(0, 2)
  const vertex = vertices[vertexIndex]
  const others = vertices.filter((_, index) => index !== vertexIndex)
  const midA = midpoint(vertex, others[0])
  const midB = midpoint(vertex, others[1])
  for (let lane = 0; lane < lanes; lane += 1) {
    const radius = side / 2 + (lane - (lanes - 1) / 2) * laneSpacing
    const pen = penCount > 1 ? lane % penCount : 0
    strokes.push(triangleArcStroke(vertex, midA, midB, radius, pen))
  }
}

function generateHexTruchet(rng: Rng, penCount: number): Stroke[] {
  const rect = drawableRect()
  const side = rng.range(0.045, 0.105)
  const lanes = rng.int(1, 3)
  const laneSpacing = side * 0.12
  const rows = buildTriangleRows(rect, side)
  const strokes: Stroke[] = []

  for (let row = 0; row < rows.length - 1; row += 1) {
    const top = rows[row]
    const bottom = rows[row + 1]
    const count = Math.min(top.length, bottom.length) - 1
    for (let column = 0; column < count; column += 1) {
      pushTriangleArcs(
        strokes,
        [top[column], top[column + 1], bottom[column]],
        rect,
        side,
        lanes,
        laneSpacing,
        rng,
        penCount
      )
      pushTriangleArcs(
        strokes,
        [top[column + 1], bottom[column + 1], bottom[column]],
        rect,
        side,
        lanes,
        laneSpacing,
        rng,
        penCount
      )
    }
  }
  return strokes
}

function clampToSheet(point: Point): Point {
  return {
    x: clamp(point.x, CONTENT_MARGIN, 1 - CONTENT_MARGIN),
    y: clamp(point.y, CONTENT_MARGIN, 1 - CONTENT_MARGIN),
  }
}

function warpStrokes(
  strokes: readonly Stroke[],
  noise: Noise,
  frequency: number,
  strength: number
): Stroke[] {
  return strokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((point) =>
      clampToSheet(domainWarp(point, noise, frequency, strength))
    ),
  }))
}

function generateWarpedGrid(rng: Rng, noise: Noise, penCount: number): Stroke[] {
  const substyle = rng.int(0, 1)
  const base = generateStandard(rng, noise, penCount, substyle)
  const frequency = rng.range(1.5, 3.5)
  const strength = rng.range(0.018, 0.045)
  return warpStrokes(base, noise, frequency, strength)
}

function generateVariableLanes(rng: Rng, noise: Noise, penCount: number): Stroke[] {
  const columns = rng.int(8, 20)
  const rows = clamp(rng.int(8, 20), Math.round(columns * 0.7), Math.round(columns * 1.4))
  const grid = buildGrid(drawableRect(), columns, rows)
  const minLanes = rng.int(1, 3)
  const maxLanes = rng.int(Math.max(minLanes + 3, 6), 10)
  const axis = rng.pick(["column", "row"] as const)
  const reversed = rng.chance(0.5)
  const blankProbability = rng.range(0.005, 0.02)
  const blankGrid: boolean[][] = Array.from({ length: grid.rows }, () =>
    new Array(grid.columns).fill(false)
  )
  const strokes: Stroke[] = []

  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const candidate = classicTile(rng, blankProbability)
      const tile = suppressAdjacentBlanks(candidate, column, row, blankGrid, rng)
      blankGrid[row][column] = tile.kind === "blank"
      if (tile.kind === "blank") continue

      const fraction = axis === "column" ? column / (grid.columns - 1) : row / (grid.rows - 1)
      const eased = reversed ? 1 - fraction : fraction
      const laneCount = Math.round(minLanes + eased * (maxLanes - minLanes))
      const originX = grid.originX + column * grid.cellSize
      const originY = grid.originY + row * grid.cellSize
      const penForLane: PenForLane = (lane) => (penCount > 1 ? lane % penCount : 0)
      strokes.push(
        ...arcTileStrokes(originX, originY, grid.cellSize, tile.orientation, laneCount, penForLane)
      )
    }
  }
  return strokes
}

type Corner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight"

interface GraphEdge {
  row: number
  column: number
  corner: Corner
}

interface AdjacencyEntry {
  neighbour: string
  edge: GraphEdge
}

const CORNER_ANGLES: Record<Corner, readonly [number, number]> = {
  topLeft: [0, Math.PI / 2],
  bottomRight: [Math.PI, (3 * Math.PI) / 2],
  topRight: [Math.PI / 2, Math.PI],
  bottomLeft: [(3 * Math.PI) / 2, Math.PI * 2],
}

function edgeId(edge: GraphEdge): string {
  return `${edge.row}:${edge.column}:${edge.corner}`
}

function tileGraphEdges(
  row: number,
  column: number,
  orientation: Orientation
): [
  { node: string; neighbour: string; edge: GraphEdge },
  { node: string; neighbour: string; edge: GraphEdge },
] {
  const topNode = `H:${row}:${column}`
  const bottomNode = `H:${row + 1}:${column}`
  const leftNode = `V:${row}:${column}`
  const rightNode = `V:${row}:${column + 1}`
  if (orientation === "forward") {
    return [
      { node: topNode, neighbour: leftNode, edge: { row, column, corner: "topLeft" } },
      { node: bottomNode, neighbour: rightNode, edge: { row, column, corner: "bottomRight" } },
    ]
  }
  return [
    { node: topNode, neighbour: rightNode, edge: { row, column, corner: "topRight" } },
    { node: bottomNode, neighbour: leftNode, edge: { row, column, corner: "bottomLeft" } },
  ]
}

function buildTruchetAdjacency(
  rows: number,
  columns: number,
  orientationAt: (row: number, column: number) => Orientation
): Map<string, AdjacencyEntry[]> {
  const adjacency = new Map<string, AdjacencyEntry[]>()
  const addEntry = (node: string, neighbour: string, edge: GraphEdge): void => {
    const list = adjacency.get(node)
    if (list) list.push({ neighbour, edge })
    else adjacency.set(node, [{ neighbour, edge }])
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const [first, second] = tileGraphEdges(row, column, orientationAt(row, column))
      addEntry(first.node, first.neighbour, first.edge)
      addEntry(first.neighbour, first.node, first.edge)
      addEntry(second.node, second.neighbour, second.edge)
      addEntry(second.neighbour, second.node, second.edge)
    }
  }
  return adjacency
}

function walkFromNode(
  adjacency: Map<string, AdjacencyEntry[]>,
  visited: Set<string>,
  start: string
): GraphEdge[] {
  const path: GraphEdge[] = []
  let current = start
  for (let guard = 0; guard < 200_000; guard += 1) {
    const options = adjacency.get(current) ?? []
    const next = options.find((option) => !visited.has(edgeId(option.edge)))
    if (!next) break
    visited.add(edgeId(next.edge))
    path.push(next.edge)
    current = next.neighbour
  }
  return path
}

function traceLongestTruchetPath(adjacency: Map<string, AdjacencyEntry[]>): GraphEdge[] {
  const visited = new Set<string>()
  let longest: GraphEdge[] = []

  const endpoints = [...adjacency.entries()]
    .filter(([, list]) => list.length === 1)
    .map(([node]) => node)
  for (const node of endpoints) {
    const path = walkFromNode(adjacency, visited, node)
    if (path.length > longest.length) longest = path
  }
  for (const node of adjacency.keys()) {
    const path = walkFromNode(adjacency, visited, node)
    if (path.length > longest.length) longest = path
  }
  return longest
}

function cornerCentre(originX: number, originY: number, size: number, corner: Corner): Point {
  if (corner === "topLeft") return { x: originX, y: originY }
  if (corner === "topRight") return { x: originX + size, y: originY }
  if (corner === "bottomLeft") return { x: originX, y: originY + size }
  return { x: originX + size, y: originY + size }
}

function cornerArcStroke(
  originX: number,
  originY: number,
  size: number,
  corner: Corner,
  pen: number,
  width: number
): Stroke {
  const [start, end] = CORNER_ANGLES[corner]
  const centre = cornerCentre(originX, originY, size, corner)
  return { pen, points: arcPoints(centre, size / 2, start, end, ARC_SPACING), width }
}

function generateSinglePath(rng: Rng, penCount: number): Stroke[] {
  let columns = rng.int(16, 24)
  let rows = clamp(columns + rng.int(-4, 4), 12, 34)
  let path: GraphEdge[] = []
  let grid = buildGrid(drawableRect(), columns, rows)

  for (let attempt = 0; attempt < 6 && path.length < 100; attempt += 1) {
    grid = buildGrid(drawableRect(), columns, rows)
    const adjacency = buildTruchetAdjacency(grid.rows, grid.columns, () =>
      rng.chance(0.5) ? "forward" : "backward"
    )
    path = traceLongestTruchetPath(adjacency)
    columns = Math.min(40, Math.round(columns * 1.25))
    rows = Math.min(40, Math.round(rows * 1.25))
  }

  const pen = penCount > 1 ? rng.int(0, penCount - 1) : 0
  const width = DEFAULT_STROKE_WIDTH * 4
  return path.map((edge) => {
    const originX = grid.originX + edge.column * grid.cellSize
    const originY = grid.originY + edge.row * grid.cellSize
    return cornerArcStroke(originX, originY, grid.cellSize, edge.corner, pen, width)
  })
}

function generateDiamondGrid(rng: Rng, penCount: number): Stroke[] {
  const rect = drawableRect()
  const centre = rectCentre(rect)
  const shrink = 1 / Math.SQRT2
  const shrunkRect: Rect = {
    x: centre.x - (rect.width * shrink) / 2,
    y: centre.y - (rect.height * shrink) / 2,
    width: rect.width * shrink,
    height: rect.height * shrink,
  }
  const columns = rng.int(6, 14)
  const rows = clamp(rng.int(6, 14), Math.round(columns * 0.7), Math.round(columns * 1.4))
  const grid = buildGrid(shrunkRect, columns, rows)
  const offsetCount = chooseOffsetCount(rng, columns, rows, rng.range(900, 1800))
  const blankProbability = rng.range(0.005, 0.02)
  const blankGrid: boolean[][] = Array.from({ length: grid.rows }, () =>
    new Array(grid.columns).fill(false)
  )
  const strokes: Stroke[] = []

  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const candidate = classicTile(rng, blankProbability)
      const tile = suppressAdjacentBlanks(candidate, column, row, blankGrid, rng)
      blankGrid[row][column] = tile.kind === "blank"
      if (tile.kind === "blank") continue

      const originX = grid.originX + column * grid.cellSize
      const originY = grid.originY + row * grid.cellSize
      const penForLane: PenForLane = (lane) => (penCount > 1 ? lane % penCount : 0)
      strokes.push(
        ...arcTileStrokes(
          originX,
          originY,
          grid.cellSize,
          tile.orientation,
          offsetCount,
          penForLane
        )
      )
    }
  }

  return strokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((point) => rotatePoint(centre, point, Math.PI / 4)),
  }))
}

function buildWovenLine(
  isHorizontal: boolean,
  position: number,
  lineIndex: number,
  crossings: readonly number[],
  rect: Rect,
  gap: number,
  bumpChance: number,
  bumpRadius: number,
  isOverAt: (lineIndex: number, crossingIndex: number) => boolean,
  rng: Rng,
  pen: number
): Stroke[] {
  const strokes: Stroke[] = []
  const start = isHorizontal ? rect.x : rect.y
  const end = isHorizontal ? rect.x + rect.width : rect.y + rect.height
  let segmentStart = start

  const pointAt = (coordinate: number, bumpOffset = 0): Point =>
    isHorizontal
      ? { x: coordinate, y: position + bumpOffset }
      : { x: position + bumpOffset, y: coordinate }

  const pushStraight = (from: number, to: number): void => {
    if (to - from < gap) return
    strokes.push({ pen, points: [pointAt(from), pointAt(to)] })
  }

  const pushBump = (crossing: number): void => {
    const steps = 8
    const points: Point[] = []
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps
      const offset = Math.sin(Math.PI * t) * bumpRadius
      const coordinate = crossing - bumpRadius + t * bumpRadius * 2
      points.push(pointAt(coordinate, -offset))
    }
    strokes.push({ pen, points })
  }

  for (let index = 0; index < crossings.length; index += 1) {
    const crossing = crossings[index]
    if (isOverAt(lineIndex, index)) {
      if (rng.chance(bumpChance) && crossing - bumpRadius > segmentStart) {
        pushStraight(segmentStart, crossing - bumpRadius)
        pushBump(crossing)
        segmentStart = crossing + bumpRadius
      }
      continue
    }
    pushStraight(segmentStart, crossing - gap / 2)
    segmentStart = crossing + gap / 2
  }
  pushStraight(segmentStart, end)
  return strokes
}

function generateOverUnderWeave(rng: Rng, penCount: number): Stroke[] {
  const rect = drawableRect()
  const laneCount = rng.int(10, 22)
  const gap = rng.range(0.014, 0.03)
  const bumpChance = rng.range(0.7, 0.95)
  const bumpRadius = (Math.min(rect.width, rect.height) / laneCount) * 0.3
  const xs = Array.from(
    { length: laneCount },
    (_, index) => rect.x + ((index + 0.5) / laneCount) * rect.width
  )
  const ys = Array.from(
    { length: laneCount },
    (_, index) => rect.y + ((index + 0.5) / laneCount) * rect.height
  )
  const horizontalOverVertical = (row: number, column: number): boolean => (row + column) % 2 === 0
  const penForLine = (index: number): number => (penCount > 1 ? index % penCount : 0)
  const strokes: Stroke[] = []

  for (let row = 0; row < laneCount; row += 1) {
    strokes.push(
      ...buildWovenLine(
        true,
        ys[row],
        row,
        xs,
        rect,
        gap,
        bumpChance,
        bumpRadius,
        horizontalOverVertical,
        rng,
        penForLine(row)
      )
    )
  }
  for (let column = 0; column < laneCount; column += 1) {
    strokes.push(
      ...buildWovenLine(
        false,
        xs[column],
        column,
        ys,
        rect,
        gap,
        bumpChance,
        bumpRadius,
        (lineIndex, crossingIndex) => !horizontalOverVertical(crossingIndex, lineIndex),
        rng,
        penForLine(column)
      )
    )
  }
  return strokes
}

function generateOpArtCircles(rng: Rng, penCount: number): Stroke[] {
  const columns = rng.int(5, 11)
  const rows = clamp(rng.int(5, 11), Math.round(columns * 0.7), Math.round(columns * 1.4))
  const grid = buildGrid(drawableRect(), columns, rows)
  const offsetCount = rng.int(7, 14)
  const checkerboard = rng.chance(0.7)
  const strokes: Stroke[] = []

  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const orientation: Orientation = checkerboard
        ? (row + column) % 2 === 0
          ? "forward"
          : "backward"
        : "forward"
      const originX = grid.originX + column * grid.cellSize
      const originY = grid.originY + row * grid.cellSize
      const penForLane: PenForLane = (lane) => (penCount > 1 ? lane % penCount : 0)
      strokes.push(
        ...arcTileStrokes(originX, originY, grid.cellSize, orientation, offsetCount, penForLane)
      )
    }
  }
  return strokes
}

type WeaveStyle =
  | "classic"
  | "mixed"
  | "region"
  | "multiScale"
  | "wideBands"
  | "hexTruchet"
  | "warped"
  | "variableLanes"
  | "singlePath"
  | "diamond"
  | "overUnder"
  | "opArt"

const WEAVE_STYLES: readonly WeaveStyle[] = [
  "classic",
  "mixed",
  "region",
  "multiScale",
  "wideBands",
  "hexTruchet",
  "warped",
  "variableLanes",
  "singlePath",
  "diamond",
  "overUnder",
  "opArt",
]

export const weave: Family = {
  name: "weave",
  weight: 1,
  generate: ({ rng, noise, penCount }: FamilyContext): Stroke[] => {
    const style = rng.pick(WEAVE_STYLES)
    if (style === "classic") return generateStandard(rng, noise, penCount, 0)
    if (style === "mixed") return generateStandard(rng, noise, penCount, 1)
    if (style === "region") return generateStandard(rng, noise, penCount, 2)
    if (style === "multiScale") return generateMultiScale(rng, noise, penCount)
    if (style === "wideBands") return generateWideBands(rng)
    if (style === "hexTruchet") return generateHexTruchet(rng, penCount)
    if (style === "warped") return generateWarpedGrid(rng, noise, penCount)
    if (style === "variableLanes") return generateVariableLanes(rng, noise, penCount)
    if (style === "singlePath") return generateSinglePath(rng, penCount)
    if (style === "diamond") return generateDiamondGrid(rng, penCount)
    if (style === "overUnder") return generateOverUnderWeave(rng, penCount)
    return generateOpArtCircles(rng, penCount)
  },
}
