"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { minuteId, minuteIndexAt } from "@/lib/gen/minute"

export function YourMinuteForm() {
  const router = useRouter()
  const [value, setValue] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!value) return

    const local = new Date(value)
    if (Number.isNaN(local.getTime())) return

    const minute = minuteIndexAt(local)
    if (minute < 0) return

    router.push(`/m/${minuteId(minute)}`)
  }

  return (
    <form className="your-minute" onSubmit={handleSubmit}>
      <label htmlFor="your-minute-input" className="your-minute-label">
        your minute
      </label>
      <div className="your-minute-row">
        <input
          id="your-minute-input"
          type="datetime-local"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="your-minute-input"
          aria-label="choose a moment"
        />
        <button type="submit" className="your-minute-go">
          go
        </button>
      </div>
      <p className="your-minute-hint">every minute since 1970 has a drawing. find yours.</p>
    </form>
  )
}
