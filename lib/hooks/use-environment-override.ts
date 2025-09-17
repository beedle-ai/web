"use client"

import { useState, useEffect } from "react"
import type { EnvironmentState } from "@/lib/types/environment"

export function useEnvironmentOverride(baseEnvironment: EnvironmentState): EnvironmentState {
  const [environment, setEnvironment] = useState(baseEnvironment)

  useEffect(() => {
    const handleOverride = (event: CustomEvent) => {
      const overrides = event.detail

      if (overrides.enabled) {
        setEnvironment({
          ...baseEnvironment,
          ...(overrides.timeOfDay && { timeOfDay: overrides.timeOfDay }),
          ...(overrides.weather && { weather: overrides.weather }),
          ...(overrides.temperature !== undefined && { temperature: overrides.temperature }),
          ...(overrides.humidity !== undefined && { humidity: overrides.humidity }),
          ...(overrides.windSpeed !== undefined && { windSpeed: overrides.windSpeed }),
        })
      } else {
        setEnvironment(baseEnvironment)
      }
    }

    window.addEventListener("environment-override", handleOverride as EventListener)

    return () => {
      window.removeEventListener("environment-override", handleOverride as EventListener)
    }
  }, [baseEnvironment])

  useEffect(() => {
    setEnvironment(baseEnvironment)
  }, [baseEnvironment])

  return environment
}
