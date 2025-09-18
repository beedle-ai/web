"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import type { EnvironmentState } from "@/lib/types/environment"
import { getTimeOfDay, getSeason, mapWeatherCode } from "@/lib/utils/environment"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useEnvironment() {
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  // Get user's location
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          })
        },
        (error) => {
          console.warn("Geolocation denied:", error)
          setPermissionDenied(true)
        },
        { timeout: 5000, maximumAge: 3600000 } // 1 hour cache
      )
    }
  }, [])

  // Fetch weather data
  const { data, error, isLoading } = useSWR(
    coordinates || permissionDenied
      ? `/api/environment${coordinates ? `?lat=${coordinates.lat}&lon=${coordinates.lon}` : ""}`
      : null,
    fetcher,
    {
      refreshInterval: 1800000, // Refresh every 30 minutes
      revalidateOnFocus: false,
    }
  )

  // Calculate environment state
  const [environment, setEnvironment] = useState<EnvironmentState>(() => {
    const now = new Date()
    return {
      timeOfDay: getTimeOfDay(now.getHours()),
      weather: "clear",
      season: getSeason(now),
      temperature: 20,
      humidity: 50,
      windSpeed: 10,
      location: "Loading...",
      lastUpdated: now,
    }
  })

  // Update environment state when data changes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setEnvironment((prev) => ({
        ...prev,
        timeOfDay: getTimeOfDay(now.getHours()),
        season: getSeason(now),
        lastUpdated: now,
      }))
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (data?.weather) {
      setEnvironment((prev) => ({
        ...prev,
        weather: mapWeatherCode(data.weather.weather_code),
        temperature: data.weather.temperature_2m,
        humidity: data.weather.relative_humidity_2m,
        windSpeed: data.weather.wind_speed_10m,
        location: data.location || prev.location,
      }))
    }
  }, [data])

  return {
    environment,
    isLoading,
    error,
    locationPermission: !permissionDenied,
  }
}
