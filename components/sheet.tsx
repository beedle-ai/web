"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { SheetPainter } from "@/lib/render/painter"
import type { PenTip } from "@/lib/render/painter"
import { inkColour } from "@/lib/render/paper"
import { plotterSound } from "@/lib/audio/plotter-sound"
import type { Piece } from "@/lib/gen/types"

interface SheetProps {
  piece: Piece | null
  progress: number
  showPen?: boolean
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  return reduced
}

export function Sheet({ piece, progress, showPen = true }: SheetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const painterRef = useRef<SheetPainter | null>(null)
  const progressRef = useRef(progress)
  const { resolvedTheme } = useTheme()
  const theme = resolvedTheme === "light" ? "light" : "dark"
  const [tip, setTip] = useState<PenTip | null>(null)
  const reducedMotion = useReducedMotion()

  progressRef.current = progress

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const painter = new SheetPainter(canvas)
    painterRef.current = painter

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      painter.resize(entry.contentRect.width, window.devicePixelRatio || 1)
      setTip(painter.paint(progressRef.current))
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      painter.dispose()
      painterRef.current = null
    }
  }, [])

  useEffect(() => {
    painterRef.current?.setTheme(theme)
    setTip(painterRef.current?.paint(progressRef.current) ?? null)
  }, [theme])

  useEffect(() => {
    painterRef.current?.setPiece(piece)
    setTip(painterRef.current?.paint(progressRef.current) ?? null)
  }, [piece])

  useEffect(() => {
    const next = painterRef.current?.paint(progress) ?? null
    setTip(next)
    if (!showPen) return
    const size = containerRef.current?.clientWidth || 1
    plotterSound.update(
      next ? { x: next.x / size, y: next.y / size, pen: next.pen } : null,
      performance.now()
    )
  }, [progress, showPen])

  const ink = piece && tip ? piece.inks[tip.pen] : undefined
  const ringColour = ink ? inkColour(ink, theme) : null

  return (
    <div ref={containerRef} className="sheet-canvas">
      <canvas ref={canvasRef} className="sheet-canvas-element" />
      {showPen && tip && ringColour && !reducedMotion ? (
        <div
          aria-hidden
          className="pen-ring"
          style={{
            transform: `translate(${tip.x}px, ${tip.y}px) translate(-50%, -50%)`,
            borderColor: ringColour,
          }}
        />
      ) : null}
    </div>
  )
}
