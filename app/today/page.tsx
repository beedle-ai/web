import type { Metadata } from "next"
import { Hud } from "@/components/hud"
import { WallSheet } from "@/components/wall-sheet"
import { generatePiece } from "@/lib/gen/piece"
import { minuteId, minuteIndexAt, minuteStart } from "@/lib/gen/minute"
import type { Piece } from "@/lib/gen/types"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "beedle.ai · today",
}

const HOUR_MINUTES = 60
const WALL_HOURS = 24

function currentHourStartMinute(now: Date): number {
  return Math.floor(minuteIndexAt(now) / HOUR_MINUTES) * HOUR_MINUTES
}

function formatDateUtc(date: Date): string {
  const year = date.getUTCFullYear().toString().padStart(4, "0")
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0")
  const day = date.getUTCDate().toString().padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatHourUtc(minute: number): string {
  const hours = minuteStart(minute).getUTCHours().toString().padStart(2, "0")
  return `${hours}:00 utc`
}

function captionFor(minute: number, piece: Piece): string {
  return `${formatHourUtc(minute)} · ${piece.family} · ${piece.inks.map((ink) => ink.name).join(", ")}`
}

export default function TodayPage() {
  const now = new Date()
  const latestMinute = currentHourStartMinute(now)
  const minutes = Array.from(
    { length: WALL_HOURS },
    (_, index) => latestMinute - index * HOUR_MINUTES
  )
  const entries = minutes.map((minute) => ({ minute, piece: generatePiece(minute) }))

  return (
    <div className="page wall-page">
      <Hud />
      <main className="wall-main">
        <h1 className="wall-date">{formatDateUtc(now)}</h1>
        <p className="wall-subtitle">the last twenty-four hours</p>
        <div className="wall-grid">
          {entries.map(({ minute, piece }) => (
            <WallSheet
              key={minute}
              id={minuteId(minute)}
              inkColour={piece.inks[0].light}
              caption={captionFor(minute, piece)}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
