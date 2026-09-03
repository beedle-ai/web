"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"
import { inkColour } from "@/lib/render/paper"
import { INKS } from "@/lib/gen/inks"
import type { Piece } from "@/lib/gen/types"

interface InkDyeProps {
  piece: Piece | null
}

const FALLBACK_INK = INKS.find((ink) => ink.name === "graphite") ?? INKS[0]

function crosshairCursor(colour: string, filled: boolean): string {
  const centre = filled ? `<circle cx="6" cy="6" r="2" fill="${colour}" />` : ""
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">` +
    `<line x1="6" y1="0" x2="6" y2="12" stroke="${colour}" stroke-width="1" />` +
    `<line x1="0" y1="6" x2="12" y2="6" stroke="${colour}" stroke-width="1" />` +
    `${centre}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 6 6, crosshair`
}

export function InkDye({ piece }: InkDyeProps) {
  const { resolvedTheme } = useTheme()
  const theme = resolvedTheme === "light" ? "light" : "dark"

  useEffect(() => {
    const root = document.documentElement
    const inks = piece?.inks ?? []
    const primary = inkColour(inks[0] ?? FALLBACK_INK, theme)

    for (let index = 0; index < 3; index += 1) {
      const ink = inks[index]
      root.style.setProperty(`--ink-${index}`, ink ? inkColour(ink, theme) : primary)
    }

    root.style.setProperty("--cursor-default", crosshairCursor(primary, false))
    root.style.setProperty("--cursor-link", crosshairCursor(primary, true))
  }, [piece, theme])

  return null
}
