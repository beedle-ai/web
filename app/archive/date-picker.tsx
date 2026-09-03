"use client"

import { useRouter } from "next/navigation"

interface DatePickerProps {
  date: string
}

export function DatePicker({ date }: DatePickerProps) {
  const router = useRouter()

  return (
    <input
      type="date"
      defaultValue={date}
      onChange={(event) => router.push(`/archive?date=${event.target.value}`)}
      className="archive-date-input"
      aria-label="choose date"
    />
  )
}
