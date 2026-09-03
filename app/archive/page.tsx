import Link from "next/link"
import type { Metadata } from "next"
import { Hud } from "@/components/hud"
import { DatePicker } from "./date-picker"
import { YourMinuteForm } from "./your-minute-form"
import { dayStartMinute, minuteId, minuteIndexAt } from "@/lib/gen/minute"
import { createRng, hashSeed } from "@/lib/gen/random"
import { chooseInkCount, chooseInks } from "@/lib/gen/inks"
import type { Ink } from "@/lib/gen/types"

export const metadata: Metadata = {
  title: "beedle.ai · archive",
}

interface ArchivePageProps {
  searchParams: Promise<{ date?: string }>
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 86_400_000
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const MINUTES = Array.from({ length: 60 }, (_, minute) => minute)

function parseDateParam(value: string | undefined): Date {
  const match = value ? DATE_PATTERN.exec(value) : null
  if (match) {
    const [, year, month, day] = match.map(Number)
    const timestamp = Date.UTC(year, month - 1, day)
    if (!Number.isNaN(timestamp)) return new Date(timestamp)
  }
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function formatDateParam(date: Date): string {
  const year = date.getUTCFullYear().toString().padStart(4, "0")
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0")
  const day = date.getUTCDate().toString().padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

function swatchGradient(inks: Ink[], variant: "light" | "dark"): string {
  const colours = inks.map((ink) => ink[variant])
  const step = 100 / colours.length
  const stops = colours
    .map(
      (colour, index) =>
        `${colour} ${(index * step).toFixed(2)}%, ${colour} ${((index + 1) * step).toFixed(2)}%`
    )
    .join(", ")
  return `linear-gradient(to bottom, ${stops})`
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const { date: dateParam } = await searchParams
  const date = parseDateParam(dateParam)
  const dateLabel = formatDateParam(date)
  const startMinute = dayStartMinute(date)
  const nowMinute = minuteIndexAt(new Date())

  return (
    <div className="page archive-page">
      <Hud />
      <main className="archive-main">
        <YourMinuteForm />
        <div className="archive-nav">
          <Link
            href={`/archive?date=${formatDateParam(addDays(date, -1))}`}
            aria-label="previous day"
          >
            ◀
          </Link>
          <DatePicker date={dateLabel} />
          <Link href={`/archive?date=${formatDateParam(addDays(date, 1))}`} aria-label="next day">
            ▶
          </Link>
        </div>
        <h1 className="archive-date">{dateLabel}</h1>
        <div className="archive-grid-scroll">
          <div className="archive-grid">
            {HOURS.map((hour) => (
              <div key={hour} className="archive-row">
                <Link
                  href={`/hour/${minuteId(startMinute + hour * 60).slice(0, -2)}`}
                  className="archive-hour"
                >
                  {hour.toString().padStart(2, "0")}
                </Link>
                {MINUTES.map((minuteOfHour) => {
                  const minute = startMinute + hour * 60 + minuteOfHour
                  const id = minuteId(minute)
                  const isFuture = minute > nowMinute

                  if (isFuture) {
                    return (
                      <Link
                        key={minute}
                        href={`/m/${id}`}
                        className="archive-swatch archive-swatch-future"
                        data-id={id}
                        aria-label={id}
                      />
                    )
                  }

                  const rng = createRng(hashSeed(minute))
                  const inks = chooseInks(rng, chooseInkCount(rng))

                  return (
                    <Link
                      key={minute}
                      href={`/m/${id}`}
                      className="archive-swatch"
                      data-id={id}
                      aria-label={id}
                      style={
                        {
                          "--bg-light": swatchGradient(inks, "light"),
                          "--bg-dark": swatchGradient(inks, "dark"),
                        } as React.CSSProperties
                      }
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
