"use client"

import { memo } from "react"
import { useEnvironmentContext } from "@/contexts/environment-context"
import { TIME_GRADIENTS, WEATHER_OVERLAYS, ANIMATION_DURATIONS } from "@/lib/constants/environment"

const ACCENT_GRADIENTS = {
  dawn: `linear-gradient(180deg,
    rgba(254, 215, 170, 0.05) 0%,
    transparent 30%,
    transparent 70%,
    rgba(251, 207, 232, 0.03) 100%)`,
  evening: `linear-gradient(180deg,
    rgba(251, 191, 36, 0.05) 0%,
    transparent 40%,
    transparent 60%,
    rgba(239, 68, 68, 0.02) 100%)`,
}

function EnvironmentLightingComponent() {
  const { environment } = useEnvironmentContext()
  const showAccent = environment.timeOfDay === "dawn" || environment.timeOfDay === "evening"
  const accentGradient = ACCENT_GRADIENTS[environment.timeOfDay as keyof typeof ACCENT_GRADIENTS]

  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none transition-opacity"
        style={{
          transitionDuration: `${ANIMATION_DURATIONS.LIGHT_TRANSITION}ms`,
          background: TIME_GRADIENTS[environment.timeOfDay],
          mixBlendMode: "soft-light",
        }}
      />

      <div
        className="fixed inset-0 pointer-events-none transition-opacity"
        style={{
          transitionDuration: `${ANIMATION_DURATIONS.WEATHER_TRANSITION}ms`,
          background: WEATHER_OVERLAYS[environment.weather] || "transparent",
          mixBlendMode: "multiply",
          opacity: 0.5,
        }}
      />

      {showAccent && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: accentGradient,
            mixBlendMode: "screen",
            opacity: 0.8,
          }}
        />
      )}
    </>
  )
}

export const EnvironmentLighting = memo(EnvironmentLightingComponent)
