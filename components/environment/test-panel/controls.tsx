import { Slider } from "@/components/ui/slider"
import type { TimeOfDay, WeatherCondition } from "@/lib/types/environment"

interface ControlsProps {
  timeOfDay?: TimeOfDay
  weather?: WeatherCondition
  temperature?: number
  windSpeed?: number
  humidity?: number
  onTimeChange: (time: TimeOfDay) => void
  onWeatherChange: (weather: WeatherCondition) => void
  onTemperatureChange: (temp: number) => void
  onWindSpeedChange: (speed: number) => void
  onHumidityChange: (humidity: number) => void
}

const TIME_OPTIONS: TimeOfDay[] = ["dawn", "morning", "afternoon", "evening", "night"]
const WEATHER_OPTIONS: WeatherCondition[] = ["clear", "clouds", "rain", "snow", "fog", "storm"]

export function Controls({
  timeOfDay,
  weather,
  temperature = 20,
  windSpeed = 10,
  humidity = 50,
  onTimeChange,
  onWeatherChange,
  onTemperatureChange,
  onWindSpeedChange,
  onHumidityChange,
}: ControlsProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Time of Day</label>
        <select
          value={timeOfDay || ""}
          onChange={(e) => onTimeChange(e.target.value as TimeOfDay)}
          className="mt-1 w-full px-2 py-1 text-sm bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-500/30"
        >
          <option value="">Select...</option>
          {TIME_OPTIONS.map((time) => (
            <option key={time} value={time}>
              {time.charAt(0).toUpperCase() + time.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Weather</label>
        <select
          value={weather || ""}
          onChange={(e) => onWeatherChange(e.target.value as WeatherCondition)}
          className="mt-1 w-full px-2 py-1 text-sm bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-500/30"
        >
          <option value="">Select...</option>
          {WEATHER_OPTIONS.map((w) => (
            <option key={w} value={w}>
              {w.charAt(0).toUpperCase() + w.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <SliderControl
        label="Temperature (°C)"
        value={temperature}
        min={-10}
        max={40}
        onChange={onTemperatureChange}
      />

      <SliderControl
        label="Wind Speed (km/h)"
        value={windSpeed}
        min={0}
        max={100}
        onChange={onWindSpeedChange}
      />

      <SliderControl
        label="Humidity (%)"
        value={humidity}
        min={0}
        max={100}
        onChange={onHumidityChange}
      />
    </div>
  )
}

interface SliderControlProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

function SliderControl({ label, value, min, max, onChange }: SliderControlProps) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}: {value}
      </label>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="mt-2"
      />
    </div>
  )
}
