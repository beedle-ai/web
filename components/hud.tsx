"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

export function Hud() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const toggleTheme = () => setTheme(resolvedTheme === "light" ? "dark" : "light")

  return (
    <header className="hud">
      <div className="hud-mark">
        <Link href="/">beedle.ai</Link>
        <p>
          a new drawing every minute
          <br />
          the same drawing for everyone
        </p>
      </div>
      <div className="hud-nav">
        <Link href="/today">today</Link>
        <Link href="/archive">archive</Link>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="toggle theme"
          suppressHydrationWarning
        >
          {mounted ? "◐" : ""}
        </button>
      </div>
    </header>
  )
}
