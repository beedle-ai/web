"use client"

import { memo, useEffect, useState } from "react"
import { useEnvironmentContext } from "@/contexts/environment-context"

interface Particle {
  id: string
  x: number
  y: number
  size: number
  opacity: number
  delay: number
  speedX: number
  speedY: number
}

function generateParticles(weather: string, windSpeed: number): Particle[] {
  const baseCount = 15
  const particles: Particle[] = []

  // Adjust particle count based on weather
  const count = weather === "rain" || weather === "snow" ? baseCount * 2 : baseCount

  for (let i = 0; i < count; i++) {
    particles.push({
      id: `env-p${i}`,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 0.5 + 0.5,
      opacity: Math.random() * 30 + 20,
      delay: Math.random() * 5000,
      speedX: (Math.random() - 0.5) * 0.5 + windSpeed * 0.01,
      speedY:
        weather === "rain"
          ? 2 + Math.random()
          : weather === "snow"
            ? 0.5 + Math.random() * 0.5
            : (Math.random() - 0.5) * 0.5,
    })
  }

  return particles
}

function EnvironmentParticlesComponent() {
  const { environment } = useEnvironmentContext()
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    setParticles(generateParticles(environment.weather, environment.windSpeed))
  }, [environment.weather, environment.windSpeed])

  // Determine particle styles based on weather
  const getParticleClass = () => {
    switch (environment.weather) {
      case "rain":
        return "bg-gradient-to-b from-blue-400/20 to-blue-600/10 rounded-full"
      case "snow":
        return "bg-white/40 rounded-full shadow-sm"
      case "fog":
        return "bg-gray-400/10 rounded-full blur-md"
      case "storm":
        return "bg-purple-500/20 rounded-full"
      default:
        return "bg-gray-400/30 dark:bg-gray-500/20 rounded-full"
    }
  }

  const getAnimationClass = () => {
    switch (environment.weather) {
      case "rain":
        return "animate-rain"
      case "snow":
        return "animate-snow"
      case "fog":
        return "animate-fog"
      default:
        return "animate-float"
    }
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute ${getParticleClass()} ${getAnimationClass()}`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: environment.weather === "rain" ? "2px" : `${particle.size * 0.25}rem`,
            height: environment.weather === "rain" ? "10px" : `${particle.size * 0.25}rem`,
            opacity: particle.opacity / 100,
            animationDelay: `${particle.delay}ms`,
            animationDuration:
              environment.weather === "rain" ? "1s" : environment.weather === "snow" ? "8s" : "20s",
            transform:
              environment.weather === "rain"
                ? `rotate(${15 + environment.windSpeed}deg)`
                : undefined,
          }}
        />
      ))}

      {/* Fog overlay */}
      {environment.weather === "fog" && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-gray-100/50 via-transparent to-gray-100/30 dark:from-gray-900/50 dark:via-transparent dark:to-gray-900/30 animate-pulse"
          style={{ animationDuration: "4s" }}
        />
      )}
    </div>
  )
}

export const EnvironmentParticles = memo(EnvironmentParticlesComponent)
