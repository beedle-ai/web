"use client"

import { useCallback, useEffect, useState } from "react"
import { plotterSound } from "./plotter-sound"

const STORAGE_KEY = "beedle.sound"

function readPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on"
  } catch {
    return false
  }
}

function writePreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off")
  } catch {
    return
  }
}

export function useSoundPreference(): [boolean, () => void] {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!readPreference()) return
    setEnabled(true)
    const arm = () => {
      void plotterSound.enable()
    }
    window.addEventListener("pointerdown", arm, { once: true })
    window.addEventListener("keydown", arm, { once: true })
    return () => {
      window.removeEventListener("pointerdown", arm)
      window.removeEventListener("keydown", arm)
    }
  }, [])

  useEffect(() => {
    const silenceWhenHidden = () => {
      if (document.hidden) plotterSound.update(null, performance.now())
    }
    document.addEventListener("visibilitychange", silenceWhenHidden)
    return () => document.removeEventListener("visibilitychange", silenceWhenHidden)
  }, [])

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current
      writePreference(next)
      if (next) void plotterSound.enable()
      else void plotterSound.disable()
      return next
    })
  }, [])

  return [enabled, toggle]
}
