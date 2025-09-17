"use client"

import { useState } from "react"
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

export function EnvironmentStatus() {
  const { environment, locationPermission } = useEnvironmentContext()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  const getWeatherIcon = () => {
    switch (environment.weather) {
      case "rain":
        return <CloudRain className="w-3.5 h-3.5" />
      case "snow":
        return <CloudSnow className="w-3.5 h-3.5" />
      case "clouds":
        return <Cloud className="w-3.5 h-3.5" />
      case "clear":
        return <Sun className="w-3.5 h-3.5" />
      default:
        return <Cloud className="w-3.5 h-3.5" />
    }
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 left-6 z-50 transition-all duration-300",
        "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md",
        "border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg",
        "text-xs select-none"
      )}
    >
      {/* Collapsed view */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 min-w-[180px]",
          "hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors",
          isExpanded && "border-b border-gray-200 dark:border-gray-800"
        )}
      >
        <div className="flex items-center gap-2 flex-1">
          {getWeatherIcon()}
          <span className="font-medium">
            {environment.weather === "clear"
              ? "Clear"
              : environment.weather === "clouds"
                ? "Cloudy"
                : environment.weather === "rain"
                  ? "Rainy"
                  : environment.weather === "snow"
                    ? "Snowy"
                    : environment.weather === "fog"
                      ? "Foggy"
                      : environment.weather === "storm"
                        ? "Stormy"
                        : "Unknown"}
          </span>
          <span className="text-gray-500 dark:text-gray-400">•</span>
          <span className="text-gray-600 dark:text-gray-300">
            {formatTemperature(environment.temperature)}
          </span>
          <span className="text-gray-500 dark:text-gray-400">•</span>
          <span className="text-gray-600 dark:text-gray-300 capitalize">
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
        <div className="px-3 py-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Environment Theming Active
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsDismissed(true)
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">{environment.location}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Thermometer className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">
                {formatTemperature(environment.temperature, true)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Droplets className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">
                {environment.humidity}% humidity
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Wind className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">
                {Math.round(environment.windSpeed)} km/h
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              The site&apos;s appearance adapts to your local time and weather conditions
              {!locationPermission && " (using default location)"}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
