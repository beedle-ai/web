"use client"

import { useState, useMemo, memo, useCallback } from "react"
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
  MapPin,
  Thermometer,
  Droplets,
  X,
} from "lucide-react"
import { useEnvironmentContext } from "@/contexts/environment-context"
import { formatTemperature } from "@/lib/utils/environment"
import { cn } from "@/lib/utils"
import { WEATHER_DISPLAY_NAMES } from "@/lib/constants/ui"

function EnvironmentStatusComponent() {
  const { environment, locationPermission } = useEnvironmentContext()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const weatherIcon = useMemo(() => {
    const iconClass = "w-4 h-4 sm:w-3.5 sm:h-3.5"
    const iconMap: Record<string, React.ReactElement> = {
      rain: <CloudRain className={iconClass} />,
      snow: <CloudSnow className={iconClass} />,
      clouds: <Cloud className={iconClass} />,
      clear: <Sun className={iconClass} />,
      fog: <Cloud className={iconClass} />,
      storm: <CloudRain className={iconClass} />,
    }
    return iconMap[environment.weather] || <Cloud className={iconClass} />
  }, [environment.weather])

  const weatherDisplayName = useMemo(
    () => WEATHER_DISPLAY_NAMES[environment.weather] || "Unknown",
    [environment.weather]
  )

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDismissed(true)
  }, [])

  if (isDismissed) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto z-50 transition-all duration-300",
        "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md",
        "border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg",
        "text-sm sm:text-xs select-none"
      )}
      role="status"
      aria-live="polite"
      aria-label="Environment status"
    >
      {/* Collapsed view */}
      <button
        onClick={toggleExpanded}
        className={cn(
          "flex items-center gap-2 px-4 py-3 sm:px-3 sm:py-2 w-full sm:w-auto sm:min-w-[180px]",
          "hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors",
          "min-h-[44px] sm:min-h-0",
          isExpanded && "border-b border-gray-200 dark:border-gray-800"
        )}
      >
        <div className="flex items-center gap-2 flex-1">
          {weatherIcon}
          <span className="font-medium">{weatherDisplayName}</span>
          <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">•</span>
          <span className="text-gray-600 dark:text-gray-300 hidden sm:inline">
            {formatTemperature(environment.temperature)}
          </span>
          <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">•</span>
          <span className="text-gray-600 dark:text-gray-300 capitalize hidden sm:inline">
            {environment.timeOfDay}
          </span>
        </div>
        <div className={cn("transition-transform duration-200", isExpanded ? "rotate-180" : "")}>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-gray-500">
            <path
              d="M1 1L5 5L9 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {/* Expanded view */}
      {isExpanded && (
        <div className="px-4 py-3 sm:px-3 sm:py-3 space-y-3 sm:space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs sm:text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Environment Theming Active
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Dismiss environment status"
            >
              <X className="w-4 h-4 sm:w-3 sm:h-3" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
            <div className="flex items-center gap-2 sm:gap-1.5">
              <MapPin className="w-4 h-4 sm:w-3 sm:h-3 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-300 truncate">
                {environment.location}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-1.5">
              <Thermometer className="w-4 h-4 sm:w-3 sm:h-3 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-300">
                {formatTemperature(environment.temperature, true)}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-1.5">
              <Droplets className="w-4 h-4 sm:w-3 sm:h-3 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-300">
                {environment.humidity}% humidity
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-1.5">
              <Wind className="w-4 h-4 sm:w-3 sm:h-3 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-300">
                {Math.round(environment.windSpeed)} km/h
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <div className="text-xs sm:text-[10px] text-gray-500 dark:text-gray-400">
              The site&apos;s appearance adapts to your local time and weather conditions
              {!locationPermission && " (using approximate location from IP)"}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const EnvironmentStatus = memo(EnvironmentStatusComponent)
