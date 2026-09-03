import { formatMinuteUtc } from "@/lib/gen/minute"

interface MinuteNumeralsProps {
  minute: number
  progress: number
}

function readout(minute: number): string {
  return formatMinuteUtc(minute).slice(11, 16)
}

export function MinuteNumerals({ minute, progress }: MinuteNumeralsProps) {
  const text = readout(minute)
  const fillStop = `${Math.min(100, Math.max(0, progress * 100)).toFixed(2)}%`

  return (
    <div className="numerals" aria-hidden>
      <span className="numerals-outline">{text}</span>
      <span className="numerals-fill" style={{ "--fill-stop": fillStop } as React.CSSProperties}>
        {text}
      </span>
    </div>
  )
}
