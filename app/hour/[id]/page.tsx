import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Hud } from "@/components/hud"
import { WallSheet } from "@/components/wall-sheet"
import { generatePiece } from "@/lib/gen/piece"
import { minuteId, minuteIndexAt, minuteStart, MINUTE_MS } from "@/lib/gen/minute"

export const dynamic = "force-dynamic"

interface HourPageProps {
  params: Promise<{ id: string }>
}

const HOUR_ID_PATTERN = /^(\d{4})(\d{2})(\d{2})-(\d{2})$/
const HOUR_MINUTES = 60
const STAGGER_STEP_MS = 6
const STAGGER_CAP_MS = 180

function pad(value: number, width = 2): string {
  return value.toString().padStart(width, "0")
}

function hourId(hourStartMinute: number): string {
  const date = minuteStart(hourStartMinute)
  return `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}`
}

function parseHourId(id: string): number | null {
  const match = HOUR_ID_PATTERN.exec(id)
  if (!match) return null
  const [, year, month, day, hour] = match.map(Number)
  const timestamp = Date.UTC(year, month - 1, day, hour)
  if (Number.isNaN(timestamp) || timestamp < 0) return null
  const hourStartMinute = timestamp / MINUTE_MS
  return hourId(hourStartMinute) === id ? hourStartMinute : null
}

function formatHourLabel(hourStartMinute: number): string {
  const date = minuteStart(hourStartMinute)
  return `${pad(date.getUTCHours())}:00`
}

function formatDateLabel(hourStartMinute: number): string {
  const date = minuteStart(hourStartMinute)
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

function formatMinuteLabel(minute: number): string {
  const date = minuteStart(minute)
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

export async function generateMetadata({ params }: HourPageProps): Promise<Metadata> {
  const { id } = await params
  const hourStartMinute = parseHourId(id)
  if (hourStartMinute === null) return {}
  return { title: `beedle.ai · ${formatHourLabel(hourStartMinute)} utc` }
}

export default async function HourPage({ params }: HourPageProps) {
  const { id } = await params
  const hourStartMinute = parseHourId(id)
  if (hourStartMinute === null) notFound()

  const nowMinute = minuteIndexAt(new Date())
  const prevHourStart = hourStartMinute - HOUR_MINUTES
  const nextHourStart = hourStartMinute + HOUR_MINUTES
  const prevDisabled = prevHourStart < 0

  const minutes = Array.from({ length: HOUR_MINUTES }, (_, index) => hourStartMinute + index)

  return (
    <div className="page hour-page">
      <Hud />
      <main className="hour-main">
        <div className="hour-nav">
          {prevDisabled ? (
            <span aria-hidden className="controls-disabled">
              ◀
            </span>
          ) : (
            <Link href={`/hour/${hourId(prevHourStart)}`} aria-label="previous hour">
              ◀
            </Link>
          )}
          <Link href="/today" className="hour-wall-link">
            wall
          </Link>
          <Link href={`/hour/${hourId(nextHourStart)}`} aria-label="next hour">
            ▶
          </Link>
        </div>
        <h1 className="hour-heading">{formatHourLabel(hourStartMinute)}</h1>
        <p className="hour-subtitle">{formatDateLabel(hourStartMinute)} · sixty minutes</p>
        <div className="hour-grid">
          {minutes.map((minute, index) => {
            const isFuture = minute > nowMinute
            const caption = formatMinuteLabel(minute)

            const style = {
              animationDelay: `${Math.min(index * STAGGER_STEP_MS, STAGGER_CAP_MS)}ms`,
            }

            if (isFuture) {
              return (
                <div key={minute} className="hour-sheet-in" style={style}>
                  <WallSheet id={minuteId(minute)} caption={caption} variant="hour" future />
                </div>
              )
            }

            const piece = generatePiece(minute)
            return (
              <div key={minute} className="hour-sheet-in" style={style}>
                <WallSheet
                  id={minuteId(minute)}
                  inkColour={piece.inks[0].light}
                  caption={caption}
                  variant="hour"
                />
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
