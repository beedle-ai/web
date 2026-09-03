"use client"

import { useEffect, useState } from "react"
import { MinuteStage } from "@/components/minute-stage"
import type { Piece } from "@/lib/gen/types"

const REVEAL_MS = 1200

interface RevealStageProps {
  piece: Piece | null
  minute: number
}

export function RevealStage({ piece, minute }: RevealStageProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!piece) {
      setProgress(0)
      return
    }

    setProgress(0)
    const start = performance.now()
    let frame: number

    const step = (now: number) => {
      const elapsed = now - start
      const next = Math.min(1, elapsed / REVEAL_MS)
      setProgress(next)
      if (next < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [piece, minute])

  return <MinuteStage piece={piece} minute={minute} progress={progress} />
}
