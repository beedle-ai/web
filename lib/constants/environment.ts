import type { TimeOfDay, WeatherCondition } from "@/lib/types/environment"

export const CACHE_DURATIONS = {
  WEATHER: 1800000, // 30 minutes
  LOCATION: 86400, // 24 hours
  IP_LOCATION: 86400, // 24 hours
} as const

export const ANIMATION_DURATIONS = {
  LIGHT_TRANSITION: 3000,
  WEATHER_TRANSITION: 2000,
  PARTICLE_RAIN: 500,
  PARTICLE_SNOW: 6000,
  PARTICLE_STORM: 1000,
  PARTICLE_FOG: 15000,
  PARTICLE_DEFAULT: 20000,
  LIGHTNING_FLASH: 150,
  LIGHTNING_INTERVAL: 2000,
} as const

export const PARTICLE_COUNTS = {
  RAIN: { background: 20, mid: 15, foreground: 10 },
  SNOW: { background: 25, mid: 20, foreground: 15 },
  STORM: { background: 30, mid: 25, foreground: 20 },
  DEFAULT: { background: 15, mid: 15, foreground: 15 },
} as const

export const PARTICLE_PHYSICS = {
  LAYER_SCALE_FACTOR: 0.3,
  LAYER_SPEED_FACTOR: 0.2,
  WIND_EFFECT_MULTIPLIER: 0.01,
  RAIN_SPEED_BASE: 3,
  SNOW_SPEED_BASE: 0.3,
  STORM_SPEED_BASE: 2,
  RAIN_ANGLE_BASE: 8,
  STORM_ANGLE_BASE: 12,
} as const

export const ENVIRONMENT_PRESETS = [
  {
    name: "Clear Dawn",
    time: "dawn" as TimeOfDay,
    weather: "clear" as WeatherCondition,
    temp: 15,
    humidity: 60,
    windSpeed: 10,
  },
  {
    name: "Rainy Afternoon",
    time: "afternoon" as TimeOfDay,
    weather: "rain" as WeatherCondition,
    temp: 18,
    humidity: 85,
    windSpeed: 20,
  },
  {
    name: "Snowy Night",
    time: "night" as TimeOfDay,
    weather: "snow" as WeatherCondition,
    temp: -2,
    humidity: 70,
    windSpeed: 15,
  },
  {
    name: "Foggy Morning",
    time: "morning" as TimeOfDay,
    weather: "fog" as WeatherCondition,
    temp: 12,
    humidity: 95,
    windSpeed: 5,
  },
  {
    name: "Stormy Evening",
    time: "evening" as TimeOfDay,
    weather: "storm" as WeatherCondition,
    temp: 22,
    humidity: 85,
    windSpeed: 40,
  },
] as const

export const TIME_GRADIENTS: Record<TimeOfDay, string> = {
  dawn: `radial-gradient(ellipse at top right,
    rgba(251, 146, 60, 0.15) 0%,
    rgba(254, 215, 170, 0.08) 30%,
    rgba(251, 207, 232, 0.05) 60%,
    transparent 100%)`,
  morning: `radial-gradient(ellipse at top,
    rgba(254, 243, 199, 0.08) 0%,
    rgba(253, 230, 138, 0.05) 40%,
    transparent 100%)`,
  afternoon: `radial-gradient(ellipse at top,
    rgba(255, 255, 255, 0.02) 0%,
    transparent 50%)`,
  evening: `radial-gradient(ellipse at top left,
    rgba(251, 191, 36, 0.12) 0%,
    rgba(245, 158, 11, 0.08) 30%,
    rgba(239, 68, 68, 0.03) 60%,
    transparent 100%)`,
  night: `radial-gradient(ellipse at top,
    rgba(99, 102, 241, 0.08) 0%,
    rgba(139, 92, 246, 0.05) 40%,
    rgba(79, 70, 229, 0.03) 70%,
    transparent 100%)`,
}

export const WEATHER_OVERLAYS: Partial<Record<WeatherCondition, string>> = {
  storm: `linear-gradient(180deg,
    rgba(75, 85, 99, 0.1) 0%,
    rgba(107, 33, 168, 0.05) 50%,
    rgba(75, 85, 99, 0.1) 100%)`,
  rain: `linear-gradient(180deg,
    rgba(100, 116, 139, 0.08) 0%,
    transparent 100%)`,
  snow: `radial-gradient(ellipse at center,
    rgba(224, 242, 254, 0.1) 0%,
    rgba(186, 230, 253, 0.05) 50%,
    transparent 100%)`,
}

export const DEFAULT_LOCATION = {
  latitude: "37.7749",
  longitude: "-122.4194",
  name: "San Francisco",
} as const
