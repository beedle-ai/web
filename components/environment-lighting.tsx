"use client"

import { memo } from "react"
import { useEnvironmentContext } from "@/contexts/environment-context"

function EnvironmentLightingComponent() {
  const { environment } = useEnvironmentContext()

  // Get the gradient overlay based on time of day
  const getLightingGradient = () => {
    switch (environment.timeOfDay) {
      case "dawn":
        // Warm sunrise colors - orange/pink
        return `radial-gradient(ellipse at top right,
          rgba(251, 146, 60, 0.15) 0%,
          rgba(254, 215, 170, 0.08) 30%,
          rgba(251, 207, 232, 0.05) 60%,
          transparent 100%)`

      case "morning":
        // Soft golden morning light
        return `radial-gradient(ellipse at top,
          rgba(254, 243, 199, 0.08) 0%,
          rgba(253, 230, 138, 0.05) 40%,
          transparent 100%)`

      case "afternoon":
        // Neutral bright daylight - very subtle
        return `radial-gradient(ellipse at top,
          rgba(255, 255, 255, 0.02) 0%,
          transparent 50%)`

      case "evening":
        // Golden hour - warm amber/orange
        return `radial-gradient(ellipse at top left,
          rgba(251, 191, 36, 0.12) 0%,
          rgba(245, 158, 11, 0.08) 30%,
          rgba(239, 68, 68, 0.03) 60%,
          transparent 100%)`

      case "night":
        // Cool moonlight - blue/purple
        return `radial-gradient(ellipse at top,
          rgba(99, 102, 241, 0.08) 0%,
          rgba(139, 92, 246, 0.05) 40%,
          rgba(79, 70, 229, 0.03) 70%,
          transparent 100%)`

      default:
        return "transparent"
    }
  }

  // Additional atmospheric overlay for weather conditions
  const getWeatherOverlay = () => {
    switch (environment.weather) {
      case "storm":
        // Dark, dramatic overlay
        return `linear-gradient(180deg,
          rgba(75, 85, 99, 0.1) 0%,
          rgba(107, 33, 168, 0.05) 50%,
          rgba(75, 85, 99, 0.1) 100%)`

      case "rain":
        // Cool, gray-blue overlay
        return `linear-gradient(180deg,
          rgba(100, 116, 139, 0.08) 0%,
          transparent 100%)`

      case "snow":
        // Bright, slightly blue-white overlay
        return `radial-gradient(ellipse at center,
          rgba(224, 242, 254, 0.1) 0%,
          rgba(186, 230, 253, 0.05) 50%,
          transparent 100%)`

      default:
        return "transparent"
    }
  }

  return (
    <>
      {/* Time-based lighting overlay */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-[3000ms]"
        style={{
          background: getLightingGradient(),
          mixBlendMode: "soft-light",
        }}
      />

      {/* Weather-based atmospheric overlay */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-[2000ms]"
        style={{
          background: getWeatherOverlay(),
          mixBlendMode: "multiply",
          opacity: 0.5,
        }}
      />

      {/* Extra color accent for dawn/dusk */}
      {(environment.timeOfDay === "dawn" || environment.timeOfDay === "evening") && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              environment.timeOfDay === "dawn"
                ? `linear-gradient(180deg,
                  rgba(254, 215, 170, 0.05) 0%,
                  transparent 30%,
                  transparent 70%,
                  rgba(251, 207, 232, 0.03) 100%)`
                : `linear-gradient(180deg,
                  rgba(251, 191, 36, 0.05) 0%,
                  transparent 40%,
                  transparent 60%,
                  rgba(239, 68, 68, 0.02) 100%)`,
            mixBlendMode: "screen",
            opacity: 0.8,
          }}
        />
      )}
    </>
  )
}

export const EnvironmentLighting = memo(EnvironmentLightingComponent)
