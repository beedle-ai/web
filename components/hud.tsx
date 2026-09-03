"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"

const subscribeToNothing = () => () => {}
const isClient = () => true
const isServer = () => false

export function Hud() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribeToNothing, isClient, isServer)

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
