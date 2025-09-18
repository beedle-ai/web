import type { TimeOfDay, WeatherCondition, Season } from "@/lib/types/environment"

export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 7) return "dawn"
  if (hour >= 7 && hour < 12) return "morning"
  if (hour >= 12 && hour < 17) return "afternoon"
  if (hour >= 17 && hour < 20) return "evening"
  return "night"
}

export function getSeason(date: Date, isNorthernHemisphere = true): Season {
  const month = date.getMonth()
  const seasons = isNorthernHemisphere
    ? { spring: [2, 3, 4], summer: [5, 6, 7], autumn: [8, 9, 10], winter: [11, 0, 1] }
    : { spring: [8, 9, 10], summer: [11, 0, 1], autumn: [2, 3, 4], winter: [5, 6, 7] }

  if (seasons.spring.includes(month)) return "spring"
  if (seasons.summer.includes(month)) return "summer"
  if (seasons.autumn.includes(month)) return "autumn"
  return "winter"
}

// Map Open-Meteo weather codes to our weather conditions
// https://open-meteo.com/en/docs#weathervariables
export function mapWeatherCode(code: number): WeatherCondition {
  if (code === 0 || code === 1) return "clear"
  if (code >= 2 && code <= 3) return "clouds"
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain"
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "snow"
  if (code >= 45 && code <= 48) return "fog"
  if (code >= 95 && code <= 99) return "storm"
  return "clear"
}

export function getWeatherEmoji(weather: WeatherCondition): string {
  const emojis: Record<WeatherCondition, string> = {
    clear: "☀️",
    clouds: "☁️",
    rain: "🌧️",
    snow: "❄️",
    fog: "🌫️",
    storm: "⛈️",
  }
  return emojis[weather]
}

export function getTimeEmoji(time: TimeOfDay): string {
  const emojis: Record<TimeOfDay, string> = {
    dawn: "🌅",
    morning: "🌤️",
    afternoon: "☀️",
    evening: "🌆",
    night: "🌙",
  }
  return emojis[time]
}

export function formatTemperature(celsius: number, useFahrenheit = false): string {
  if (useFahrenheit) {
    const fahrenheit = (celsius * 9) / 5 + 32
    return `${Math.round(fahrenheit)}°F`
  }
  return `${Math.round(celsius)}°C`
}
