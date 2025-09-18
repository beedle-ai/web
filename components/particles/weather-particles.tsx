"use client"

import { memo, useEffect, useState, useRef } from "react"
import { useEnvironmentContext } from "@/contexts/environment-context"
import { PARTICLE_COUNTS, PARTICLE_PHYSICS, ANIMATION_DURATIONS } from "@/lib/constants/environment"

interface Particle {
  id: string
  x: number
  y: number
  size: number
  opacity: number
  delay: number
  speedX: number
  speedY: number
  layer: number
}

interface ParticleConfig {
  count: number
  layer: number
}

function createParticle(
  config: ParticleConfig,
  weather: string,
  windSpeed: number,
  index: number
): Particle {
  const { layer } = config
  const layerScale = 1 + layer * PARTICLE_PHYSICS.LAYER_SCALE_FACTOR
  const layerSpeed = 1 - layer * PARTICLE_PHYSICS.LAYER_SPEED_FACTOR

  const baseSpeed = {
    rain: PARTICLE_PHYSICS.RAIN_SPEED_BASE,
    snow: PARTICLE_PHYSICS.SNOW_SPEED_BASE,
    storm: PARTICLE_PHYSICS.STORM_SPEED_BASE,
    default: 0.5,
  }

  const speedY =
    weather === "rain"
      ? (baseSpeed.rain + Math.random()) * layerSpeed
      : weather === "snow"
        ? (baseSpeed.snow + Math.random() * 0.3) * layerSpeed
        : weather === "storm"
          ? (baseSpeed.storm + Math.random() * 2) * layerSpeed
          : (Math.random() - 0.5) * baseSpeed.default

  return {
    id: `env-p${layer}-${index}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: weather === "rain" ? 1 : (Math.random() * 0.5 + 0.3) * layerScale,
    opacity: weather === "rain" ? 40 + layer * 20 : Math.random() * 30 + 20 + layer * 10,
    delay: Math.random() * 2000,
    speedX:
      (Math.random() - 0.5) * 0.5 +
      windSpeed * PARTICLE_PHYSICS.WIND_EFFECT_MULTIPLIER * layerSpeed,
    speedY,
    layer,
  }
}

function generateParticles(weather: string, windSpeed: number): Particle[] {
  const counts =
    PARTICLE_COUNTS[weather.toUpperCase() as keyof typeof PARTICLE_COUNTS] ||
    PARTICLE_COUNTS.DEFAULT
  const configs: ParticleConfig[] = [
    { count: counts.background, layer: 0 },
    { count: counts.mid, layer: 1 },
    { count: counts.foreground, layer: 2 },
  ]

  return configs.flatMap((config) =>
    Array.from({ length: config.count }, (_, i) => createParticle(config, weather, windSpeed, i))
  )
}

function getParticleAnimation(weather: string): string {
  const animations: Record<string, string> = {
    rain: "animate-rain",
    snow: "animate-snow",
    storm: "animate-storm-particle",
    fog: "animate-fog",
  }
  return animations[weather] || "animate-float"
}

function getRainParticleStyle(particle: Particle, windSpeed: number) {
  return {
    width: particle.layer === 2 ? "3px" : particle.layer === 1 ? "2px" : "1px",
    height: particle.layer === 2 ? "20px" : particle.layer === 1 ? "15px" : "10px",
    background: `linear-gradient(to bottom,
      transparent,
      rgba(156, 163, 175, ${0.15 + particle.layer * 0.05}),
      rgba(156, 163, 175, ${0.3 + particle.layer * 0.1}),
      transparent)`,
    transform: `rotate(${PARTICLE_PHYSICS.RAIN_ANGLE_BASE + windSpeed * 0.3}deg)`,
    animationDuration: `${ANIMATION_DURATIONS.PARTICLE_RAIN + particle.layer * 100}ms`,
    borderRadius: "2px",
  }
}

function getSnowParticleStyle(particle: Particle) {
  return {
    width: `${particle.size * 0.3}rem`,
    height: `${particle.size * 0.3}rem`,
    animationDuration: `${ANIMATION_DURATIONS.PARTICLE_SNOW + particle.layer * 2000}ms`,
    background:
      particle.layer === 2
        ? "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 100%)"
        : "rgba(255, 255, 255, 0.7)",
    boxShadow: particle.layer === 2 ? "0 0 4px rgba(255,255,255,0.5)" : "none",
    borderRadius: "50%",
  }
}

function getStormParticleStyle(particle: Particle, windSpeed: number) {
  const isElectric = Math.random() > 0.95
  const isRain = particle.layer === 2 && Math.random() > 0.3

  if (isRain) {
    return {
      width: "2px",
      height: "18px",
      animationDuration: "400ms",
      background: `linear-gradient(to bottom,
        transparent,
        rgba(156, 163, 175, ${0.2 + particle.layer * 0.05}),
        rgba(107, 114, 128, ${0.4 + particle.layer * 0.05}),
        transparent)`,
      borderRadius: "2px",
      transform: `rotate(${PARTICLE_PHYSICS.STORM_ANGLE_BASE + windSpeed * 0.4}deg)`,
    }
  }

  return {
    width: `${particle.size * 0.25}rem`,
    height: `${particle.size * 0.25}rem`,
    animationDuration: `${ANIMATION_DURATIONS.PARTICLE_STORM + particle.layer * 500}ms`,
    background: isElectric
      ? "radial-gradient(circle, rgba(209, 213, 219, 0.9) 0%, rgba(156, 163, 175, 0.5) 100%)"
      : `rgba(${156 - particle.layer * 10}, ${163 - particle.layer * 10}, 175, ${0.2 + particle.layer * 0.05})`,
    boxShadow: isElectric ? "0 0 6px rgba(209, 213, 219, 0.4)" : "none",
    borderRadius: "50%",
  }
}

export function WeatherParticles() {
  const { environment } = useEnvironmentContext()
  const [particles, setParticles] = useState<Particle[]>([])
  const [lightningFlash, setLightningFlash] = useState(false)
  const stormIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setParticles(generateParticles(environment.weather, environment.windSpeed))
  }, [environment.weather, environment.windSpeed])

  useEffect(() => {
    if (environment.weather === "storm") {
      const flashLightning = () => {
        setLightningFlash(true)
        setTimeout(() => setLightningFlash(false), ANIMATION_DURATIONS.LIGHTNING_FLASH)
      }

      stormIntervalRef.current = setInterval(() => {
        if (Math.random() > 0.7) {
          flashLightning()
          if (Math.random() > 0.5) {
            setTimeout(flashLightning, 200)
          }
        }
      }, ANIMATION_DURATIONS.LIGHTNING_INTERVAL)

      return () => {
        if (stormIntervalRef.current) {
          clearInterval(stormIntervalRef.current)
        }
      }
    }
  }, [environment.weather])

  const getParticleStyle = (particle: Particle): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      left: `${particle.x}%`,
      top: `${particle.y}%`,
      opacity: particle.opacity / 100,
      animationDelay: `${particle.delay}ms`,
      zIndex: particle.layer * 10,
    }

    switch (environment.weather) {
      case "rain":
        return { ...baseStyle, ...getRainParticleStyle(particle, environment.windSpeed) }
      case "snow":
        return { ...baseStyle, ...getSnowParticleStyle(particle) }
      case "storm":
        return { ...baseStyle, ...getStormParticleStyle(particle, environment.windSpeed) }
      case "fog":
        return {
          ...baseStyle,
          width: `${particle.size * 2}rem`,
          height: `${particle.size * 2}rem`,
          animationDuration: `${ANIMATION_DURATIONS.PARTICLE_FOG}ms`,
          filter: "blur(8px)",
          borderRadius: "50%",
        }
      default:
        return {
          ...baseStyle,
          width: `${particle.size * 0.25}rem`,
          height: `${particle.size * 0.25}rem`,
          animationDuration: `${ANIMATION_DURATIONS.PARTICLE_DEFAULT}ms`,
          borderRadius: "50%",
        }
    }
  }

  const getParticleClass = () => {
    const baseClass = environment.weather === "fog" ? "bg-gray-400/10" : ""
    return `absolute ${baseClass} ${getParticleAnimation(environment.weather)}`
  }

  return (
    <>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={getParticleClass()}
            style={getParticleStyle(particle)}
          />
        ))}
      </div>

      {environment.weather === "fog" && (
        <div
          className="fixed inset-0 bg-gradient-to-b from-gray-100/40 via-transparent to-gray-100/30 dark:from-gray-900/40 dark:via-transparent dark:to-gray-900/30 animate-pulse pointer-events-none"
          style={{ animationDuration: "4s" }}
        />
      )}

      {lightningFlash && (
        <div className="fixed inset-0 bg-white/20 dark:bg-white/10 pointer-events-none animate-flash" />
      )}
    </>
  )
}

export const MemoizedWeatherParticles = memo(WeatherParticles)
