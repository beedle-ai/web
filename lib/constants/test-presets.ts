import type { TimeOfDay, WeatherCondition } from "@/lib/types/environment"
import type { EnvironmentPreset } from "@/lib/types/ui"

export const ENVIRONMENT_PRESETS: readonly EnvironmentPreset[] = [
  {
    name: "Clear Dawn",
    time: "dawn" as TimeOfDay,
    weather: "clear" as WeatherCondition,
    temperature: 15,
    humidity: 60,
    windSpeed: 5,
  },
  {
    name: "Rainy Afternoon",
    time: "afternoon" as TimeOfDay,
    weather: "rain" as WeatherCondition,
    temperature: 18,
    humidity: 85,
    windSpeed: 15,
  },
  {
    name: "Snowy Night",
    time: "night" as TimeOfDay,
    weather: "snow" as WeatherCondition,
    temperature: -2,
    humidity: 70,
    windSpeed: 10,
  },
  {
    name: "Foggy Morning",
    time: "morning" as TimeOfDay,
    weather: "fog" as WeatherCondition,
    temperature: 12,
    humidity: 90,
    windSpeed: 3,
  },
  {
    name: "Stormy Evening",
    time: "evening" as TimeOfDay,
    weather: "storm" as WeatherCondition,
    temperature: 22,
    humidity: 85,
    windSpeed: 40,
  },
] as const

export const WEATHER_DEFAULTS = {
  humidity: {
    clear: 50,
    clouds: 60,
    rain: 85,
    snow: 70,
    fog: 90,
    storm: 85,
  },
  windSpeed: {
    clear: 10,
    clouds: 12,
    rain: 20,
    snow: 15,
    fog: 5,
    storm: 40,
  },
} as const

export const TEMPERATURE_LIMITS = {
  MIN: -10,
  MAX: 40,
  DEFAULT: 20,
} as const

export const HUMIDITY_LIMITS = {
  MIN: 0,
  MAX: 100,
  DEFAULT: 50,
} as const

export const WIND_SPEED_LIMITS = {
  MIN: 0,
  MAX: 100,
  DEFAULT: 10,
} as const
