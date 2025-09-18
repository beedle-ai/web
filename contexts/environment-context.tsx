"use client"

import React, { createContext, useContext, useEffect } from "react"
import { useEnvironment } from "@/lib/hooks/use-environment"
import { useEnvironmentOverride } from "@/lib/hooks/use-environment-override"
import type { EnvironmentState } from "@/lib/types/environment"

interface EnvironmentContextValue {
  environment: EnvironmentState
  isLoading: boolean
  locationPermission: boolean
}

const EnvironmentContext = createContext<EnvironmentContextValue | undefined>(undefined)

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const { environment: baseEnvironment, isLoading, locationPermission } = useEnvironment()
  const environment = useEnvironmentOverride(baseEnvironment)

  // Update CSS variables based on environment
  useEffect(() => {
    const root = document.documentElement

    // Set data attributes for CSS
    root.setAttribute("data-time", environment.timeOfDay)
    root.setAttribute("data-weather", environment.weather)
    root.setAttribute("data-season", environment.season)

    // Set CSS custom properties for numeric values
    root.style.setProperty("--env-temperature", `${environment.temperature}`)
    root.style.setProperty("--env-humidity", `${environment.humidity}`)
    root.style.setProperty("--env-wind-speed", `${environment.windSpeed}`)
  }, [environment])

  return (
    <EnvironmentContext.Provider value={{ environment, isLoading, locationPermission }}>
      {children}
    </EnvironmentContext.Provider>
  )
}

export function useEnvironmentContext() {
  const context = useContext(EnvironmentContext)
  if (!context) {
    throw new Error("useEnvironmentContext must be used within EnvironmentProvider")
  }
  return context
}
