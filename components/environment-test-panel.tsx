"use client"

import { useState, useEffect, useCallback, useMemo, memo } from "react"
import { Settings, X, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"
import type { TimeOfDay, WeatherCondition } from "@/lib/types/environment"
import {
  ENVIRONMENT_PRESETS,
  WEATHER_DEFAULTS,
  TEMPERATURE_LIMITS,
  HUMIDITY_LIMITS,
  WIND_SPEED_LIMITS,
} from "@/lib/constants/test-presets"
import { ACCESSIBILITY } from "@/lib/constants/ui"

interface TestOverrides {
  enabled: boolean
  timeOfDay?: TimeOfDay
  weather?: WeatherCondition
  temperature?: number
  humidity?: number
  windSpeed?: number
}

const TIME_OPTIONS: readonly TimeOfDay[] = [
  "dawn",
  "morning",
  "afternoon",
  "evening",
  "night",
] as const
const WEATHER_OPTIONS: readonly WeatherCondition[] = [
  "clear",
  "clouds",
  "rain",
  "snow",
  "fog",
  "storm",
] as const

function EnvironmentTestPanelComponent() {
  const [isOpen, setIsOpen] = useState(false)
  const [overrides, setOverrides] = useState<TestOverrides>({ enabled: false })
  const [isDevelopment, setIsDevelopment] = useState(false)

  useEffect(() => {
    // Only show in development mode
    setIsDevelopment(process.env.NODE_ENV === "development")
  }, [])

  useEffect(() => {
    if (overrides.enabled) {
      const root = document.documentElement

      // Override CSS variables
      if (overrides.timeOfDay) {
        root.setAttribute("data-time", overrides.timeOfDay)
      }
      if (overrides.weather) {
        root.setAttribute("data-weather", overrides.weather)
      }
      if (overrides.temperature !== undefined) {
        root.style.setProperty("--env-temperature", `${overrides.temperature}`)
      }
      if (overrides.humidity !== undefined) {
        root.style.setProperty("--env-humidity", `${overrides.humidity}`)
      }
      if (overrides.windSpeed !== undefined) {
        root.style.setProperty("--env-wind-speed", `${overrides.windSpeed}`)
      }

      // Dispatch custom event for components to update
      window.dispatchEvent(
        new CustomEvent("environment-override", {
          detail: overrides,
        })
      )
    }
  }, [overrides])

  const quickPresets = useMemo(() => ENVIRONMENT_PRESETS, [])

  const applyPreset = useCallback((preset: (typeof ENVIRONMENT_PRESETS)[0]) => {
    setOverrides({
      enabled: true,
      timeOfDay: preset.time,
      weather: preset.weather,
      temperature: preset.temperature,
      humidity: preset.humidity || WEATHER_DEFAULTS.humidity[preset.weather],
      windSpeed: preset.windSpeed || WEATHER_DEFAULTS.windSpeed[preset.weather],
    })
  }, [])

  const resetToLive = useCallback(() => {
    setOverrides({ enabled: false })
    // Remove all overrides
    const root = document.documentElement
    root.removeAttribute("data-time")
    root.removeAttribute("data-weather")
    root.style.removeProperty("--env-temperature")
    root.style.removeProperty("--env-humidity")
    root.style.removeProperty("--env-wind-speed")

    // Force reload environment data
    window.location.reload()
  }, [])

  if (!isDevelopment) return null

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed top-4 right-4 sm:top-6 sm:left-6 z-50 p-3 sm:p-2.5 rounded-xl",
          "bg-white/5 hover:bg-white/10 dark:bg-black/20 dark:hover:bg-black/30",
          "backdrop-blur-md border border-white/10 dark:border-white/5",
          "shadow-lg transition-all duration-200",
          "min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0",
          overrides.enabled && "ring-1 ring-gray-400/30 border-gray-400/20"
        )}
        title="Environment Test Panel"
      >
        <Settings
          className={cn(
            "w-5 h-5 sm:w-4 sm:h-4 transition-colors",
            overrides.enabled
              ? "text-gray-600 dark:text-gray-300"
              : "text-gray-400 dark:text-gray-500"
          )}
        />
      </button>

      {/* Test Panel */}
      {isOpen && (
        <div className="fixed inset-x-4 top-[4.5rem] sm:inset-x-auto sm:left-6 sm:top-20 z-50 w-auto sm:w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] sm:max-h-[80vh] overflow-y-auto rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
          <div className="p-4 sm:p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base sm:text-sm">Environment Test Panel</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 sm:p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-4 space-y-5 sm:space-y-4">
            {/* Override Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Test Mode</span>
              <button
                onClick={() => setOverrides((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  overrides.enabled
                    ? "bg-gray-600 dark:bg-gray-400"
                    : "bg-gray-300 dark:bg-gray-600"
                )}
                role={ACCESSIBILITY.ROLES.SWITCH}
                aria-checked={overrides.enabled}
                aria-label="Toggle test mode"
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    overrides.enabled ? "translate-x-6" : "translate-x-1"
                  )}
                  aria-hidden="true"
                />
              </button>
            </div>

            {overrides.enabled && (
              <>
                {/* Quick Presets */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Quick Presets
                  </label>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {quickPresets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        className="px-4 py-3 sm:px-3 sm:py-1.5 text-sm sm:text-xs bg-white/50 dark:bg-black/30 hover:bg-white/70 dark:hover:bg-black/50 rounded-lg backdrop-blur-sm transition-all border border-gray-200/50 dark:border-gray-700/50 min-h-[44px] sm:min-h-0 flex items-center justify-center"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual Controls */}
                <div className="space-y-4 sm:space-y-3">
                  {/* Time of Day */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Time of Day
                    </label>
                    <select
                      value={overrides.timeOfDay || ""}
                      onChange={(e) =>
                        setOverrides({
                          ...overrides,
                          timeOfDay: e.target.value as TimeOfDay,
                        })
                      }
                      className="mt-1 w-full px-3 py-2.5 sm:px-2 sm:py-1 text-base sm:text-sm bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/30 min-h-[44px] sm:min-h-0"
                      aria-label="Select time of day"
                    >
                      <option value="">Select...</option>
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time.charAt(0).toUpperCase() + time.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Weather Condition */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Weather
                    </label>
                    <select
                      value={overrides.weather || ""}
                      onChange={(e) =>
                        setOverrides({
                          ...overrides,
                          weather: e.target.value as WeatherCondition,
                        })
                      }
                      className="mt-1 w-full px-3 py-2.5 sm:px-2 sm:py-1 text-base sm:text-sm bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/30 min-h-[44px] sm:min-h-0"
                      aria-label="Select weather condition"
                    >
                      <option value="">Select...</option>
                      {WEATHER_OPTIONS.map((weather) => (
                        <option key={weather} value={weather}>
                          {weather.charAt(0).toUpperCase() + weather.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Temperature */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Temperature (°C): {overrides.temperature || TEMPERATURE_LIMITS.DEFAULT}
                    </label>
                    <Slider
                      min={TEMPERATURE_LIMITS.MIN}
                      max={TEMPERATURE_LIMITS.MAX}
                      step={1}
                      value={[overrides.temperature || TEMPERATURE_LIMITS.DEFAULT]}
                      aria-label="Temperature"
                      aria-valuemin={TEMPERATURE_LIMITS.MIN}
                      aria-valuemax={TEMPERATURE_LIMITS.MAX}
                      aria-valuenow={overrides.temperature || TEMPERATURE_LIMITS.DEFAULT}
                      onValueChange={(value) =>
                        setOverrides({
                          ...overrides,
                          temperature: value[0],
                        })
                      }
                      className="mt-3 sm:mt-2 touch-none"
                    />
                  </div>

                  {/* Wind Speed */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Wind Speed (km/h): {overrides.windSpeed || WIND_SPEED_LIMITS.DEFAULT}
                    </label>
                    <Slider
                      min={WIND_SPEED_LIMITS.MIN}
                      max={WIND_SPEED_LIMITS.MAX}
                      step={1}
                      value={[overrides.windSpeed || WIND_SPEED_LIMITS.DEFAULT]}
                      aria-label="Wind Speed"
                      aria-valuemin={WIND_SPEED_LIMITS.MIN}
                      aria-valuemax={WIND_SPEED_LIMITS.MAX}
                      aria-valuenow={overrides.windSpeed || WIND_SPEED_LIMITS.DEFAULT}
                      onValueChange={(value) =>
                        setOverrides({
                          ...overrides,
                          windSpeed: value[0],
                        })
                      }
                      className="mt-3 sm:mt-2 touch-none"
                    />
                  </div>

                  {/* Humidity */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Humidity (%): {overrides.humidity || HUMIDITY_LIMITS.DEFAULT}
                    </label>
                    <Slider
                      min={HUMIDITY_LIMITS.MIN}
                      max={HUMIDITY_LIMITS.MAX}
                      step={1}
                      value={[overrides.humidity || HUMIDITY_LIMITS.DEFAULT]}
                      aria-label="Humidity"
                      aria-valuemin={HUMIDITY_LIMITS.MIN}
                      aria-valuemax={HUMIDITY_LIMITS.MAX}
                      aria-valuenow={overrides.humidity || HUMIDITY_LIMITS.DEFAULT}
                      onValueChange={(value) =>
                        setOverrides({
                          ...overrides,
                          humidity: value[0],
                        })
                      }
                      className="mt-3 sm:mt-2 touch-none"
                    />
                  </div>
                </div>

                {/* Reset Button */}
                <button
                  onClick={resetToLive}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 sm:px-3 sm:py-2 bg-white/50 dark:bg-black/30 hover:bg-white/70 dark:hover:bg-black/50 rounded-lg backdrop-blur-sm transition-all border border-gray-200/50 dark:border-gray-700/50 text-base sm:text-sm min-h-[44px] sm:min-h-0"
                  aria-label="Reset to live environment data"
                >
                  <RefreshCw className="w-3 h-3" aria-hidden="true" />
                  Reset to Live Data
                </button>
              </>
            )}

            {!overrides.enabled && (
              <p className="text-sm sm:text-xs text-gray-500 dark:text-gray-400">
                Enable test mode to override environment settings and preview different weather/time
                combinations.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export const EnvironmentTestPanel = memo(EnvironmentTestPanelComponent)
