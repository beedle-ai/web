"use client"

import { useState, useEffect } from "react"
import { Settings, X, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"
import type { TimeOfDay, WeatherCondition } from "@/lib/types/environment"

interface TestOverrides {
  enabled: boolean
  timeOfDay?: TimeOfDay
  weather?: WeatherCondition
  temperature?: number
  humidity?: number
  windSpeed?: number
}

const TIME_OPTIONS: TimeOfDay[] = ["dawn", "morning", "afternoon", "evening", "night"]
const WEATHER_OPTIONS: WeatherCondition[] = ["clear", "clouds", "rain", "snow", "fog", "storm"]

export function EnvironmentTestPanel() {
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

  if (!isDevelopment) return null

  const quickPresets = [
    {
      name: "Clear Dawn",
      time: "dawn" as TimeOfDay,
      weather: "clear" as WeatherCondition,
      temp: 15,
    },
    {
      name: "Rainy Afternoon",
      time: "afternoon" as TimeOfDay,
      weather: "rain" as WeatherCondition,
      temp: 18,
    },
    {
      name: "Snowy Night",
      time: "night" as TimeOfDay,
      weather: "snow" as WeatherCondition,
      temp: -2,
    },
    {
      name: "Foggy Morning",
      time: "morning" as TimeOfDay,
      weather: "fog" as WeatherCondition,
      temp: 12,
    },
    {
      name: "Stormy Evening",
      time: "evening" as TimeOfDay,
      weather: "storm" as WeatherCondition,
      temp: 22,
    },
  ]

  const applyPreset = (preset: (typeof quickPresets)[0]) => {
    setOverrides({
      enabled: true,
      timeOfDay: preset.time,
      weather: preset.weather,
      temperature: preset.temp,
      humidity: preset.weather === "rain" || preset.weather === "storm" ? 85 : 50,
      windSpeed: preset.weather === "storm" ? 40 : preset.weather === "snow" ? 15 : 10,
    })
  }

  const resetToLive = () => {
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
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed top-6 left-6 z-50 p-2.5 rounded-xl",
          "bg-white/5 hover:bg-white/10 dark:bg-black/20 dark:hover:bg-black/30",
          "backdrop-blur-md border border-white/10 dark:border-white/5",
          "shadow-lg transition-all duration-200",
          overrides.enabled && "ring-1 ring-gray-400/30 border-gray-400/20"
        )}
        title="Environment Test Panel"
      >
        <Settings
          className={cn(
            "w-4 h-4 transition-colors",
            overrides.enabled
              ? "text-gray-600 dark:text-gray-300"
              : "text-gray-400 dark:text-gray-500"
          )}
        />
      </button>

      {/* Test Panel */}
      {isOpen && (
        <div className="fixed top-20 left-6 z-50 w-80 max-h-[80vh] overflow-y-auto rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Environment Test Panel</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
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
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    overrides.enabled ? "translate-x-6" : "translate-x-1"
                  )}
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
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {quickPresets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        className="px-3 py-1.5 text-xs bg-white/50 dark:bg-black/30 hover:bg-white/70 dark:hover:bg-black/50 rounded-lg backdrop-blur-sm transition-all border border-gray-200/50 dark:border-gray-700/50"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual Controls */}
                <div className="space-y-3">
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
                      className="mt-1 w-full px-2 py-1 text-sm bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/30"
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
                      className="mt-1 w-full px-2 py-1 text-sm bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/30"
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
                      Temperature (°C): {overrides.temperature || 20}
                    </label>
                    <Slider
                      min={-10}
                      max={40}
                      step={1}
                      value={[overrides.temperature || 20]}
                      onValueChange={(value) =>
                        setOverrides({
                          ...overrides,
                          temperature: value[0],
                        })
                      }
                      className="mt-2"
                    />
                  </div>

                  {/* Wind Speed */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Wind Speed (km/h): {overrides.windSpeed || 10}
                    </label>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[overrides.windSpeed || 10]}
                      onValueChange={(value) =>
                        setOverrides({
                          ...overrides,
                          windSpeed: value[0],
                        })
                      }
                      className="mt-2"
                    />
                  </div>

                  {/* Humidity */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Humidity (%): {overrides.humidity || 50}
                    </label>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[overrides.humidity || 50]}
                      onValueChange={(value) =>
                        setOverrides({
                          ...overrides,
                          humidity: value[0],
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Reset Button */}
                <button
                  onClick={resetToLive}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/50 dark:bg-black/30 hover:bg-white/70 dark:hover:bg-black/50 rounded-lg backdrop-blur-sm transition-all border border-gray-200/50 dark:border-gray-700/50 text-sm"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset to Live Data
                </button>
              </>
            )}

            {!overrides.enabled && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
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
