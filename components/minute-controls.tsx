"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { minuteId, minuteIndexAt } from "@/lib/gen/minute"

interface MinuteControlsProps {
  minute: number | null
  progress: number
}

function pad(value: number): string {
  return value.toString().padStart(2, "0")
}

function useLocalClock(): string {
  const [time, setTime] = useState("")

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return time
}

function useLiveMinute(): number | null {
  const [liveMinute, setLiveMinute] = useState<number | null>(null)

  useEffect(() => {
    const update = () => setLiveMinute(minuteIndexAt(new Date()))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return liveMinute
}

export function MinuteControls({ minute, progress }: MinuteControlsProps) {
  const router = useRouter()
  const localTime = useLocalClock()
  const liveMinute = useLiveMinute()

  const isLive = liveMinute !== null && minute === liveMinute
  const nextDisabled = liveMinute === null || minute === null || minute + 1 > liveMinute
  const prevDisabled = minute === null || minute <= 0

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return

      if (minute === null) return
      if (event.key === "ArrowLeft" && !prevDisabled) router.push(`/m/${minuteId(minute - 1)}`)
      if (event.key === "ArrowRight" && !nextDisabled) router.push(`/m/${minuteId(minute + 1)}`)
      if (event.key === "n") router.push("/")
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [minute, nextDisabled, prevDisabled, router])

  return (
    <footer className="controls">
      <div className="controls-row">
        {prevDisabled || minute === null ? (
          <span aria-hidden className="controls-disabled">
            ◀
          </span>
        ) : (
          <Link href={`/m/${minuteId(minute - 1)}`} aria-label="previous minute">
            ◀
          </Link>
        )}
        {isLive ? (
          <span className="controls-now">now</span>
        ) : (
          <Link href="/" className="controls-now">
            now
          </Link>
        )}
        {nextDisabled || minute === null ? (
          <span aria-hidden className="controls-disabled">
            ▶
          </span>
        ) : (
          <Link href={`/m/${minuteId(minute + 1)}`} aria-label="next minute">
            ▶
          </Link>
        )}
        <span className="local-time">{localTime} local</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ transform: `scaleX(${progress})` }} />
      </div>
    </footer>
  )
}
