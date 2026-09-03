"use client"

import { useSoundPreference } from "@/lib/audio/sound-preference"

export function SoundToggle() {
  const [enabled, toggle] = useSoundPreference()

  return (
    <button type="button" onClick={toggle} aria-pressed={enabled} className="sound-toggle">
      sound {enabled ? "on" : "off"}
    </button>
  )
}
