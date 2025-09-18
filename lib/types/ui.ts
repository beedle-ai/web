export interface MousePosition {
  x: number
  y: number
}

export interface HoverHandlers {
  onMouseEnter: () => void
  onMouseLeave: () => void
  onTouchStart: () => void
  onTouchEnd: () => void
}

export interface PerspectiveStyle {
  transform: string
  transition: string
}

export interface UseMousePerspectiveReturn {
  mousePos: MousePosition
  perspectiveStyle: React.CSSProperties
}

export interface UseHoverStateReturn {
  isHovering: boolean
  hoverHandlers: HoverHandlers
}

export interface Particle {
  id: string
  x: number
  y: number
  size: number
  opacity: number
  speed?: number
  angle?: number
  delay?: number
}

export interface WeatherParticle extends Particle {
  type: "rain" | "snow" | "storm"
  zIndex?: number
}

export interface EnvironmentPreset {
  name: string
  time: TimeOfDay
  weather: WeatherCondition
  temperature: number
  humidity?: number
  windSpeed?: number
}

export interface SliderProps {
  min: number
  max: number
  step: number
  value: number[]
  onValueChange: (value: number[]) => void
  label: string
  "aria-label": string
  "aria-valuemin": number
  "aria-valuemax": number
  "aria-valuenow": number
}

import type { TimeOfDay, WeatherCondition } from "./environment"
