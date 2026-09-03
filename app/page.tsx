"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Hud } from "@/components/hud"
import { MinuteControls } from "@/components/minute-controls"
import { MinuteStage } from "@/components/minute-stage"
import { useMinuteClock } from "@/lib/hooks/use-minute-clock"
import { generatePiece } from "@/lib/gen/piece"
import type { Piece } from "@/lib/gen/types"

const CROSSFADE_MS = 600

interface OutgoingPiece {
  piece: Piece
  minute: number
}

export default function LivePage() {
  const clock = useMinuteClock()
  const minute = clock?.minute ?? null
  const progress = clock?.progress ?? 0
  const piece = useMemo(() => (minute === null ? null : generatePiece(minute)), [minute])
  const previousMinuteRef = useRef<number | null>(null)
  const [outgoing, setOutgoing] = useState<OutgoingPiece | null>(null)

  useEffect(() => {
    if (minute === null || previousMinuteRef.current === minute) return
    if (previousMinuteRef.current === null) {
      previousMinuteRef.current = minute
      return
    }
    const outgoingMinute = previousMinuteRef.current
    previousMinuteRef.current = minute
    setOutgoing({ piece: generatePiece(outgoingMinute), minute: outgoingMinute })

    const timeout = setTimeout(() => setOutgoing(null), CROSSFADE_MS)
    return () => clearTimeout(timeout)
  }, [minute])

  return (
    <div className="page">
      <Hud />
      <MinuteStage piece={piece} minute={minute} progress={progress} outgoing={outgoing} />
      <MinuteControls minute={minute} progress={progress} />
    </div>
  )
}
