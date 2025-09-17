import { NextResponse } from "next/server"
import type { WeatherAPIResponse } from "@/lib/types/environment"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let lat = searchParams.get("lat")
  let lon = searchParams.get("lon")

  // If no coordinates provided, try to get location from IP
  if (!lat || !lon) {
    try {
      // Get IP-based location using ipapi.co (free tier: 1000 requests/day)
      const ipResponse = await fetch("https://ipapi.co/json/", {
        next: { revalidate: 86400 }, // Cache for 24 hours
      })

      if (ipResponse.ok) {
        const ipData = await ipResponse.json()
        lat = ipData.latitude?.toString()
        lon = ipData.longitude?.toString()
        // Using IP-based location: ipData.city, ipData.country_name
      }
    } catch (error) {
      console.warn("IP geolocation failed:", error)
    }
  }

  // Final fallback to San Francisco if IP lookup fails
  const latitude = lat || "37.7749"
  const longitude = lon || "-122.4194"

  try {
    // Using Open-Meteo API (free, no API key required)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`

    const weatherResponse = await fetch(weatherUrl, {
      next: { revalidate: 1800 }, // Cache for 30 minutes
    })

    if (!weatherResponse.ok) {
      throw new Error("Weather API request failed")
    }

    const weatherData: WeatherAPIResponse = await weatherResponse.json()

    // Get location name using reverse geocoding
    const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
    let locationName = "Unknown Location"

    try {
      const geoResponse = await fetch(geoUrl, {
        headers: {
          "User-Agent": "beedle.ai",
        },
        next: { revalidate: 86400 }, // Cache for 24 hours
      })

      if (geoResponse.ok) {
        const geoData = await geoResponse.json()
        locationName =
          geoData.address?.city ||
          geoData.address?.town ||
          geoData.address?.village ||
          geoData.address?.county ||
          "Unknown Location"
      }
    } catch (error) {
      console.warn("Geocoding failed:", error)
    }

    return NextResponse.json({
      weather: weatherData.current,
      location: locationName,
      coordinates: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
    })
  } catch (error) {
    console.error("Environment API error:", error)
    return NextResponse.json({ error: "Failed to fetch environment data" }, { status: 500 })
  }
}
