"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
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

const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify(): void {
  listeners.forEach((listener) => listener())
}

const readOnServer = () => false

export function useSoundPreference(): [boolean, () => void] {
  const enabled = useSyncExternalStore(subscribe, readPreference, readOnServer)

  useEffect(() => {
    if (!enabled || plotterSound.enabled) return
    const arm = () => {
      void plotterSound.enable()
    }
    window.addEventListener("pointerdown", arm, { once: true })
    window.addEventListener("keydown", arm, { once: true })
    return () => {
      window.removeEventListener("pointerdown", arm)
      window.removeEventListener("keydown", arm)
    }
  }, [enabled])

  useEffect(() => {
    const silenceWhenHidden = () => {
      if (document.hidden) plotterSound.update(null, performance.now())
    }
    document.addEventListener("visibilitychange", silenceWhenHidden)
    return () => document.removeEventListener("visibilitychange", silenceWhenHidden)
  }, [])

  const toggle = useCallback(() => {
    const next = !readPreference()
    writePreference(next)
    if (next) void plotterSound.enable()
    else void plotterSound.disable()
    notify()
  }, [])

  return [enabled, toggle]
}
