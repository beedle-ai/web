import type { Piece, Stroke } from "@/lib/gen/types"
import { DEFAULT_STROKE_WIDTH } from "@/lib/gen/types"
import { strokeLength } from "@/lib/gen/geometry"
import { inkColour, PAPER } from "./paper"
import type { ThemeMode } from "./paper"
import { pointAtStrokeFraction, progressCursor } from "./progress"

export interface PenTip {
  x: number
  y: number
  pen: number
}

type Canvas2dContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
type BackingCanvas = HTMLCanvasElement | OffscreenCanvas

interface PrecomputedStroke {
  stroke: Stroke
  length: number
}

const MAX_DEVICE_PIXEL_RATIO = 2
const MIN_STROKE_WIDTH_PX = 0.6

function createBackingCanvas(width: number, height: number): BackingCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  return canvas
}

function getContext2d(canvas: BackingCanvas): Canvas2dContext {
  const context = (canvas as HTMLCanvasElement).getContext("2d")
  if (!context) throw new Error("2d canvas context is unavailable")
  return context as Canvas2dContext
}

function buildCumulative(strokes: readonly PrecomputedStroke[]): Float64Array<ArrayBufferLike> {
  const cumulative = new Float64Array(strokes.length)
  let running = 0
  for (let index = 0; index < strokes.length; index += 1) {
    running += strokes[index].length
    cumulative[index] = running
  }
  return cumulative
}

export class SheetPainter {
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private committed: BackingCanvas
  private committedContext: Canvas2dContext

  private piece: Piece | null = null
  private theme: ThemeMode = "light"
  private cssSize = 0

  private strokes: PrecomputedStroke[] = []
  private cumulative: Float64Array<ArrayBufferLike> = new Float64Array(0)
  private totalLength = 0
  private committedStrokeCount = 0
  private progress = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.context = getContext2d(canvas) as CanvasRenderingContext2D
    this.committed = createBackingCanvas(1, 1)
    this.committedContext = getContext2d(this.committed)
  }

  setPiece(piece: Piece | null): void {
    this.piece = piece
    this.strokes = piece
      ? piece.strokes.map((stroke) => ({ stroke, length: strokeLength(stroke) }))
      : []
    this.cumulative = buildCumulative(this.strokes)
    this.totalLength = piece?.totalLength ?? 0
    this.progress = 0
    this.repaint()
  }

  setTheme(theme: ThemeMode): void {
    if (theme === this.theme) return
    this.theme = theme
    this.repaint()
  }

  resize(cssSize: number, devicePixelRatio: number): void {
    const ratio = Math.min(MAX_DEVICE_PIXEL_RATIO, Math.max(1, devicePixelRatio))
    const pixelSize = Math.max(1, Math.round(cssSize * ratio))

    this.cssSize = cssSize

    this.canvas.width = pixelSize
    this.canvas.height = pixelSize
    this.canvas.style.width = `${cssSize}px`
    this.canvas.style.height = `${cssSize}px`
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0)

    this.committed = createBackingCanvas(pixelSize, pixelSize)
    this.committedContext = getContext2d(this.committed)
    this.committedContext.setTransform(ratio, 0, 0, ratio, 0, 0)

    this.repaint()
  }

  paint(progress: number): PenTip | null {
    if (!this.piece || this.strokes.length === 0) return null

    const clamped = Math.min(1, Math.max(0, progress))
    if (clamped < this.progress) this.resetCommitted()

    return this.render(clamped)
  }

  dispose(): void {
    this.piece = null
    this.strokes = []
    this.cumulative = new Float64Array(0)
    this.totalLength = 0
    this.committedStrokeCount = 0
    this.progress = 0
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  private repaint(): void {
    const progress = this.piece ? this.progress : 0
    this.resetCommitted()
    if (this.piece) this.render(progress)
    else this.blitCommitted()
  }

  private resetCommitted(): void {
    this.committedStrokeCount = 0
    this.progress = 0
    this.paintPaperBackground()
  }

  private render(progress: number): PenTip | null {
    this.progress = progress

    const cursor = progressCursor(this.cumulative, this.totalLength, progress)
    this.commitStrokesUpTo(cursor.completeStrokeCount)
    this.blitCommitted()
    if (cursor.strokeIndex < 0) return null

    if (progress >= 1) return null
    return this.paintPartialStroke(cursor.strokeIndex, cursor.strokeFraction)
  }

  private paintPaperBackground(): void {
    this.committedContext.fillStyle = PAPER[this.theme]
    this.committedContext.fillRect(0, 0, this.cssSize, this.cssSize)
  }

  private commitStrokesUpTo(count: number): void {
    if (count <= this.committedStrokeCount) return
    for (let index = this.committedStrokeCount; index < count; index += 1) {
      this.paintFullStroke(this.committedContext, this.strokes[index].stroke)
    }
    this.committedStrokeCount = count
  }

  private blitCommitted(): void {
    this.context.save()
    this.context.setTransform(1, 0, 0, 1, 0, 0)
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.context.drawImage(this.committed, 0, 0)
    this.context.restore()
  }

  private applyStrokeStyle(context: Canvas2dContext, stroke: Stroke): void {
    const ink = this.piece?.inks[stroke.pen]
    if (!ink) return
    context.strokeStyle = inkColour(ink, this.theme)
    context.lineWidth = Math.max(
      MIN_STROKE_WIDTH_PX,
      (stroke.width ?? DEFAULT_STROKE_WIDTH) * this.cssSize
    )
    context.lineCap = "round"
    context.lineJoin = "round"
  }

  private paintFullStroke(context: Canvas2dContext, stroke: Stroke): void {
    this.applyStrokeStyle(context, stroke)
    context.beginPath()
    stroke.points.forEach((point, index) => {
      const x = point.x * this.cssSize
      const y = point.y * this.cssSize
      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    })
    context.stroke()
  }

  private paintPartialStroke(strokeIndex: number, fraction: number): PenTip {
    const entry = this.strokes[strokeIndex]
    const { stroke, length } = entry
    const tip = pointAtStrokeFraction(stroke.points, length, fraction)

    this.applyStrokeStyle(this.context, stroke)
    this.context.beginPath()

    const targetDistance = fraction * length
    let travelled = 0

    for (let index = 0; index < stroke.points.length; index += 1) {
      const point = stroke.points[index]
      const x = point.x * this.cssSize
      const y = point.y * this.cssSize

      if (index === 0) {
        this.context.moveTo(x, y)
        continue
      }

      const previous = stroke.points[index - 1]
      const segmentLength = Math.hypot(point.x - previous.x, point.y - previous.y)

      if (travelled + segmentLength >= targetDistance) {
        this.context.lineTo(tip.x * this.cssSize, tip.y * this.cssSize)
        break
      }

      this.context.lineTo(x, y)
      travelled += segmentLength
    }

    this.context.stroke()

    return { x: tip.x * this.cssSize, y: tip.y * this.cssSize, pen: stroke.pen }
  }
}
