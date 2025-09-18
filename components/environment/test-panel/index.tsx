"use client"

import { useState, useEffect } from "react"
import { Settings, X, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { PresetButtons } from "./preset-buttons"
import { Controls } from "./controls"
import type { ENVIRONMENT_PRESETS } from "@/lib/constants/environment"
import type { TimeOfDay, WeatherCondition } from "@/lib/types/environment"

interface TestOverrides {
  enabled: boolean
  timeOfDay?: TimeOfDay
  weather?: WeatherCondition
  temperature?: number
  humidity?: number
  windSpeed?: number
}

export function EnvironmentTestPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [overrides, setOverrides] = useState<TestOverrides>({ enabled: false })

  useEffect(() => {
    if (!overrides.enabled) return

    const root = document.documentElement
    if (overrides.timeOfDay) root.setAttribute("data-time", overrides.timeOfDay)
    if (overrides.weather) root.setAttribute("data-weather", overrides.weather)
    if (overrides.temperature !== undefined) {
      root.style.setProperty("--env-temperature", `${overrides.temperature}`)
    }
    if (overrides.humidity !== undefined) {
      root.style.setProperty("--env-humidity", `${overrides.humidity}`)
    }
    if (overrides.windSpeed !== undefined) {
      root.style.setProperty("--env-wind-speed", `${overrides.windSpeed}`)
    }

    window.dispatchEvent(new CustomEvent("environment-override", { detail: overrides }))
  }, [overrides])

  const applyPreset = (preset: (typeof ENVIRONMENT_PRESETS)[number]) => {
    setOverrides({
      enabled: true,
      timeOfDay: preset.time,
      weather: preset.weather,
      temperature: preset.temp,
      humidity: preset.humidity,
      windSpeed: preset.windSpeed,
    })
  }

  const resetToLive = () => {
    setOverrides({ enabled: false })
    const root = document.documentElement
    root.removeAttribute("data-time")
    root.removeAttribute("data-weather")
    root.style.removeProperty("--env-temperature")
    root.style.removeProperty("--env-humidity")
    root.style.removeProperty("--env-wind-speed")
    window.location.reload()
  }

  return (
    <>
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

      {isOpen && (
        <div className="fixed top-20 left-6 z-50 w-80 max-h-[80vh] overflow-y-auto rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
          <PanelHeader onClose={() => setIsOpen(false)} />

          <div className="p-4 space-y-4">
            <TestModeToggle
              enabled={overrides.enabled}
              onToggle={(enabled) => setOverrides({ ...overrides, enabled })}
            />

            {overrides.enabled ? (
              <>
                <PresetButtons onApplyPreset={applyPreset} />
                <Controls
                  timeOfDay={overrides.timeOfDay}
                  weather={overrides.weather}
                  temperature={overrides.temperature}
                  windSpeed={overrides.windSpeed}
                  humidity={overrides.humidity}
                  onTimeChange={(time) => setOverrides({ ...overrides, timeOfDay: time })}
                  onWeatherChange={(weather) => setOverrides({ ...overrides, weather })}
                  onTemperatureChange={(temp) => setOverrides({ ...overrides, temperature: temp })}
                  onWindSpeedChange={(speed) => setOverrides({ ...overrides, windSpeed: speed })}
                  onHumidityChange={(humidity) => setOverrides({ ...overrides, humidity })}
                />
                <ResetButton onClick={resetToLive} />
              </>
            ) : (
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

function PanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Environment Test Panel</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function TestModeToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: (enabled: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">Test Mode</span>
      <button
        onClick={() => onToggle(!enabled)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          enabled ? "bg-gray-600 dark:bg-gray-400" : "bg-gray-300 dark:bg-gray-600"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            enabled ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  )
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/50 dark:bg-black/30 hover:bg-white/70 dark:hover:bg-black/50 rounded-lg backdrop-blur-sm transition-all border border-gray-200/50 dark:border-gray-700/50 text-sm"
    >
      <RefreshCw className="w-3 h-3" />
      Reset to Live Data
    </button>
  )
}
