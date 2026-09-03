export const MINUTE_MS = 60_000

const ID_PATTERN = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})$/

function pad(value: number, width = 2): string {
  return value.toString().padStart(width, "0")
}

export function minuteIndexAt(date: Date): number {
  return Math.floor(date.getTime() / MINUTE_MS)
}

export function minuteStart(minute: number): Date {
  return new Date(minute * MINUTE_MS)
}

export function minuteProgress(minute: number, now: Date): number {
  const elapsed = now.getTime() - minute * MINUTE_MS
  return Math.min(1, Math.max(0, elapsed / MINUTE_MS))
}

export function minuteId(minute: number): string {
  const date = minuteStart(minute)
  const year = pad(date.getUTCFullYear(), 4)
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  const hours = pad(date.getUTCHours())
  const minutes = pad(date.getUTCMinutes())
  return `${year}${month}${day}-${hours}${minutes}`
}

export function parseMinuteId(id: string): number | null {
  const match = ID_PATTERN.exec(id)
  if (!match) return null
  const [, year, month, day, hours, minutes] = match.map(Number)
  const timestamp = Date.UTC(year, month - 1, day, hours, minutes)
  if (Number.isNaN(timestamp) || timestamp < 0) return null
  const minute = timestamp / MINUTE_MS
  return minuteId(minute) === id ? minute : null
}

export function formatMinuteUtc(minute: number): string {
  const date = minuteStart(minute)
  const year = pad(date.getUTCFullYear(), 4)
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  const hours = pad(date.getUTCHours())
  const minutes = pad(date.getUTCMinutes())
  return `${year}-${month}-${day} ${hours}:${minutes} UTC`
}

export function formatEdition(minute: number): string {
  return minute.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
}

export function dayStartMinute(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return start / MINUTE_MS
}
