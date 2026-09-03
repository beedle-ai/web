"use client"

import Image from "next/image"
import Link from "next/link"
import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { PAPER } from "@/lib/render/paper"

export type WallSheetVariant = "wall" | "hour"

interface WallSheetProps {
  id: string
  inkColour?: string
  caption: string
  variant?: WallSheetVariant
  future?: boolean
}

function hourIdFromMinuteId(id: string): string {
  return id.slice(0, -2)
}

const subscribeToNothing = () => () => {}
const isClient = () => true
const isServer = () => false

export function WallSheet({
  id,
  inkColour,
  caption,
  variant = "wall",
  future = false,
}: WallSheetProps) {
  const { resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribeToNothing, isClient, isServer)
  const theme = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : null

  const href = variant === "wall" ? `/hour/${hourIdFromMinuteId(id)}` : `/m/${id}`
  const cellClassName = variant === "hour" ? "wall-cell wall-cell-compact" : "wall-cell"

  return (
    <Link href={href} className={cellClassName}>
      {future ? (
        <div className="wall-sheet wall-sheet-future" />
      ) : (
        <div
          className="wall-sheet"
          style={{
            backgroundColor: theme ? PAPER[theme] : undefined,
            borderColor: `${inkColour}40`,
          }}
        >
          {theme ? (
            <Image
              src={`/m/${id}/svg?theme=${theme}&paper=0`}
              alt={caption}
              width={1000}
              height={1000}
              unoptimized
              loading="lazy"
            />
          ) : null}
        </div>
      )}
      <p className="wall-annotation">{caption}</p>
    </Link>
  )
}
