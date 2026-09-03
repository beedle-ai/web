"use client"

import { useEffect, useState } from "react"
import { minuteIndexAt, minuteProgress } from "@/lib/gen/minute"

export interface MinuteClock {
  minute: number
  progress: number
}

function readClock(): MinuteClock {
  const now = new Date()
  const minute = minuteIndexAt(now)
  return { minute, progress: minuteProgress(minute, now) }
}

export function useMinuteClock(): MinuteClock | null {
  const [clock, setClock] = useState<MinuteClock | null>(null)

  useEffect(() => {
    let frame: number | null = null
    let interval: ReturnType<typeof setInterval> | null = null

    const tick = () => setClock(readClock())

    const stopVisibleLoop = () => {
      if (frame === null) return
      cancelAnimationFrame(frame)
      frame = null
    }

    const stopHiddenLoop = () => {
      if (interval === null) return
      clearInterval(interval)
      interval = null
    }

    const runVisibleLoop = () => {
      tick()
      frame = requestAnimationFrame(runVisibleLoop)
    }

    const runHiddenLoop = () => {
      interval = setInterval(tick, 1000)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopVisibleLoop()
        runHiddenLoop()
        return
      }
      stopHiddenLoop()
      runVisibleLoop()
    }

    if (document.hidden) runHiddenLoop()
    else runVisibleLoop()

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      stopVisibleLoop()
      stopHiddenLoop()
    }
  }, [])

  return clock
}
