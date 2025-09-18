import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import type { WeatherAPIResponse } from "@/lib/types/environment"
import { DEFAULT_LOCATION, CACHE_DURATIONS } from "@/lib/constants/environment"

async function fetchIPLocation(request: NextRequest) {
  // First try Vercel's geolocation headers (much faster)
  const city = request.headers.get("x-vercel-ip-city")
  const lat = request.headers.get("x-vercel-ip-latitude")
  const lon = request.headers.get("x-vercel-ip-longitude")

  if (lat && lon) {
    // Vercel provides geolocation from edge network
    return {
      lat,
      lon,
      city: city ? decodeURIComponent(city) : undefined,
    }
  }

  // Fallback to IP API service
  try {
    const response = await fetch("https://ipapi.co/json/", {
      next: { revalidate: CACHE_DURATIONS.IP_LOCATION },
    })

    if (response.ok) {
      const data = await response.json()
      return {
        lat: data.latitude?.toString(),
        lon: data.longitude?.toString(),
        city: data.city,
      }
    }
  } catch {
    // Silent fail - use defaults
  }
  return null
}

async function fetchWeatherData(latitude: string, longitude: string) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`

  const response = await fetch(url, {
    next: { revalidate: CACHE_DURATIONS.WEATHER },
  })

  if (!response.ok) {
    throw new Error("Weather API request failed")
  }

  return response.json() as Promise<WeatherAPIResponse>
}

async function fetchLocationName(latitude: string, longitude: string) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "beedle.ai" },
      next: { revalidate: CACHE_DURATIONS.LOCATION },
    })

    if (response.ok) {
      const data = await response.json()
      return (
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.county ||
        "Unknown Location"
      )
    }
  } catch {
    // Silent fail
  }

  return "Unknown Location"
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  let lat = searchParams.get("lat")
  let lon = searchParams.get("lon")
  let locationName: string | null = null

  if (!lat || !lon) {
    const ipLocation = await fetchIPLocation(request)
    if (ipLocation) {
      lat = ipLocation.lat
      lon = ipLocation.lon
      locationName = ipLocation.city || null
    }
  }

  const latitude = lat || DEFAULT_LOCATION.latitude
  const longitude = lon || DEFAULT_LOCATION.longitude

  try {
    // If we got a city name from IP geolocation, use it; otherwise fetch from coordinates
    if (!locationName) {
      locationName = await fetchLocationName(latitude, longitude)
    }

    const weatherData = await fetchWeatherData(latitude, longitude)

    return NextResponse.json({
      weather: weatherData.current,
      location: locationName,
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch environment data" }, { status: 500 })
  }
}
