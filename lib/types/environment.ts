export type TimeOfDay = "dawn" | "morning" | "afternoon" | "evening" | "night"
export type WeatherCondition = "clear" | "clouds" | "rain" | "snow" | "fog" | "storm"
export type Season = "spring" | "summer" | "autumn" | "winter"

export interface EnvironmentState {
  timeOfDay: TimeOfDay
  weather: WeatherCondition
  season: Season
  temperature: number // in Celsius
  humidity: number // percentage
  windSpeed: number // km/h
  location: string
  lastUpdated: Date
}

export interface WeatherAPIResponse {
  current: {
    temperature_2m: number
    relative_humidity_2m: number
    weather_code: number
    wind_speed_10m: number
  }
}

export interface LocationData {
  latitude: number
  longitude: number
  city?: string
  country?: string
}
