"use client"

import { memo, useEffect, useState, useRef } from "react"
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
  layer: number // For depth effect
}

function generateParticles(weather: string, windSpeed: number): Particle[] {
  const particles: Particle[] = []

  // Different particle counts and behaviors for each weather type
  let configs: Array<{ count: number; layer: number }> = []

  switch (weather) {
    case "rain":
      // Multiple layers for rain depth
      configs = [
        { count: 20, layer: 0 }, // Background rain
        { count: 15, layer: 1 }, // Mid rain
        { count: 10, layer: 2 }, // Foreground rain
      ]
      break
    case "snow":
      configs = [
        { count: 25, layer: 0 },
        { count: 20, layer: 1 },
        { count: 15, layer: 2 },
      ]
      break
    case "storm":
      configs = [
        { count: 30, layer: 0 },
        { count: 25, layer: 1 },
        { count: 20, layer: 2 },
      ]
      break
    default:
      configs = [{ count: 15, layer: 1 }]
  }

  configs.forEach((config) => {
    for (let i = 0; i < config.count; i++) {
      const layerScale = 1 + config.layer * 0.3 // Bigger particles in foreground
      const layerSpeed = 1 - config.layer * 0.2 // Slower particles in background

      particles.push({
        id: `env-p${config.layer}-${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size:
          weather === "rain"
            ? 1 // Uniform for rain
            : (Math.random() * 0.5 + 0.3) * layerScale,
        opacity:
          weather === "rain"
            ? 40 + config.layer * 20 // More opaque in foreground
            : Math.random() * 30 + 20 + config.layer * 10,
        delay: Math.random() * 2000, // Reduced delay for faster appearance
        speedX: (Math.random() - 0.5) * 0.5 + windSpeed * 0.01 * layerSpeed,
        speedY:
          weather === "rain"
            ? (3 + Math.random()) * layerSpeed // Fast rain
            : weather === "snow"
              ? (0.3 + Math.random() * 0.3) * layerSpeed // Gentle snow
              : weather === "storm"
                ? (2 + Math.random() * 2) * layerSpeed // Chaotic storm
                : (Math.random() - 0.5) * 0.5,
        layer: config.layer,
      })
    }
  })

  return particles
}

function EnvironmentParticlesComponent() {
  const { environment } = useEnvironmentContext()
  const [particles, setParticles] = useState<Particle[]>([])
  const [lightningFlash, setLightningFlash] = useState(false)
  const stormIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setParticles(generateParticles(environment.weather, environment.windSpeed))
  }, [environment.weather, environment.windSpeed])

  // Storm lightning effects
  useEffect(() => {
    if (environment.weather === "storm") {
      const flashLightning = () => {
        setLightningFlash(true)
        setTimeout(() => setLightningFlash(false), 150)
      }

      // Random lightning flashes
      stormIntervalRef.current = setInterval(() => {
        if (Math.random() > 0.7) {
          // 30% chance every 2 seconds
          flashLightning()
          // Double flash sometimes
          if (Math.random() > 0.5) {
            setTimeout(flashLightning, 200)
          }
        }
      }, 2000)

      return () => {
        if (stormIntervalRef.current) {
          clearInterval(stormIntervalRef.current)
        }
      }
    }
  }, [environment.weather])

  // Get particle styles based on weather and layer
  const getParticleStyle = (particle: Particle) => {
    const baseStyle: React.CSSProperties = {
      left: `${particle.x}%`,
      top: `${particle.y}%`,
      opacity: particle.opacity / 100,
      animationDelay: `${particle.delay}ms`,
      zIndex: particle.layer * 10,
    }

    switch (environment.weather) {
      case "rain":
        return {
          ...baseStyle,
          width: particle.layer === 2 ? "3px" : particle.layer === 1 ? "2px" : "1px",
          height: particle.layer === 2 ? "20px" : particle.layer === 1 ? "15px" : "10px",
          background: `linear-gradient(to bottom,
            transparent,
            rgba(156, 163, 175, ${0.15 + particle.layer * 0.05}),
            rgba(156, 163, 175, ${0.3 + particle.layer * 0.1}),
            transparent)`,
          transform: `rotate(${8 + environment.windSpeed * 0.3}deg)`,
          animationDuration: `${0.5 + particle.layer * 0.1}s`,
          borderRadius: "2px",
        }

      case "snow":
        return {
          ...baseStyle,
          width: `${particle.size * 0.3}rem`,
          height: `${particle.size * 0.3}rem`,
          animationDuration: `${6 + particle.layer * 2}s`,
          background:
            particle.layer === 2
              ? "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 100%)"
              : "rgba(255, 255, 255, 0.7)",
          boxShadow: particle.layer === 2 ? "0 0 4px rgba(255,255,255,0.5)" : "none",
          borderRadius: "50%",
        }

      case "storm":
        const isElectric = Math.random() > 0.95 // 5% of particles are "electric"
        const isRain = particle.layer === 2 && Math.random() > 0.3 // 70% of foreground are rain
        return {
          ...baseStyle,
          width: isRain ? "2px" : `${particle.size * 0.25}rem`,
          height: isRain ? "18px" : `${particle.size * 0.25}rem`,
          animationDuration: isRain ? "0.4s" : `${1 + particle.layer * 0.5}s`,
          background: isElectric
            ? "radial-gradient(circle, rgba(209, 213, 219, 0.9) 0%, rgba(156, 163, 175, 0.5) 100%)"
            : isRain
              ? `linear-gradient(to bottom,
                  transparent,
                  rgba(156, 163, 175, ${0.2 + particle.layer * 0.05}),
                  rgba(107, 114, 128, ${0.4 + particle.layer * 0.05}),
                  transparent)`
              : `rgba(${156 - particle.layer * 10}, ${163 - particle.layer * 10}, 175, ${0.2 + particle.layer * 0.05})`,
          boxShadow: isElectric ? "0 0 6px rgba(209, 213, 219, 0.4)" : "none",
          borderRadius: isRain ? "2px" : "50%",
          transform: isRain ? `rotate(${12 + environment.windSpeed * 0.4}deg)` : undefined,
        }

      case "fog":
        return {
          ...baseStyle,
          width: `${particle.size * 2}rem`,
          height: `${particle.size * 2}rem`,
          animationDuration: "15s",
          filter: "blur(8px)",
          borderRadius: "50%",
        }

      default:
        return {
          ...baseStyle,
          width: `${particle.size * 0.25}rem`,
          height: `${particle.size * 0.25}rem`,
          animationDuration: "20s",
          borderRadius: "50%",
        }
    }
  }

  const getParticleClass = () => {
    switch (environment.weather) {
      case "rain":
        return "animate-rain"
      case "snow":
        return "animate-snow"
      case "storm":
        return "animate-storm-particle"
      case "fog":
        return "animate-fog"
      default:
        return "animate-float"
    }
  }

  const getDefaultParticleClass = () => {
    switch (environment.weather) {
      case "fog":
        return "bg-gray-400/10"
      case "storm":
        return ""
      case "rain":
        return ""
      case "snow":
        return ""
      default:
        return "bg-gray-400/30 dark:bg-gray-500/20"
    }
  }

  // Original decorative particles (always present around text/icon)
  const decorativeParticles = [
    { id: "p1", top: "20%", left: "8%", size: 1, opacity: 60, delay: 0 },
    { id: "p2", top: "65%", left: "15%", size: 0.5, opacity: 30, delay: 2000 },
    { id: "p3", top: "40%", left: "12%", size: 0.75, opacity: 35, delay: 4000 },
    { id: "p4", top: "30%", left: "25%", size: 1, opacity: 35, delay: 1000 },
    { id: "p5", top: "55%", left: "30%", size: 0.5, opacity: 40, delay: 3000 },
    { id: "p6", top: "75%", left: "35%", size: 0.75, opacity: 40, delay: 0 },
    { id: "p7", top: "45%", left: "45%", size: 0.5, opacity: 25, delay: 2000 },
    { id: "p8", top: "25%", left: "50%", size: 1, opacity: 45, delay: 0 },
    { id: "p9", top: "70%", right: "45%", size: 0.75, opacity: 35, delay: 1000 },
    { id: "p10", top: "35%", right: "35%", size: 0.5, opacity: 30, delay: 3000 },
    { id: "p11", top: "60%", right: "30%", size: 1, opacity: 40, delay: 4000 },
    { id: "p12", top: "50%", right: "25%", size: 0.75, opacity: 50, delay: 1000 },
    { id: "p13", top: "45%", right: "12%", size: 0.5, opacity: 30, delay: 2000 },
    { id: "p14", top: "25%", right: "15%", size: 1, opacity: 35, delay: 0 },
    { id: "p15", top: "68%", right: "8%", size: 0.75, opacity: 45, delay: 3000 },
  ]

  return (
    <>
      {/* Original decorative particles around text/icon - always present */}
      <div className="absolute inset-x-0 -inset-y-24 max-w-[650px] mx-auto -z-10">
        {decorativeParticles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-gray-400/30 dark:bg-gray-500/20 animate-float"
            style={{
              top: particle.top,
              ...(particle.left ? { left: particle.left } : { right: particle.right }),
              width: `${particle.size * 0.25}rem`,
              height: `${particle.size * 0.25}rem`,
              opacity: particle.opacity / 100,
              animationDelay: `${particle.delay}ms`,
            }}
          />
        ))}
      </div>

      {/* Weather particles - full screen coverage */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={`absolute ${getDefaultParticleClass()} ${getParticleClass()}`}
            style={getParticleStyle(particle)}
          />
        ))}
      </div>

      {/* Weather overlays */}
      {environment.weather === "fog" && (
        <div
          className="fixed inset-0 bg-gradient-to-b from-gray-100/40 via-transparent to-gray-100/30 dark:from-gray-900/40 dark:via-transparent dark:to-gray-900/30 animate-pulse pointer-events-none"
          style={{ animationDuration: "4s" }}
        />
      )}

      {/* Lightning flash overlay for storms */}
      {lightningFlash && (
        <div className="fixed inset-0 bg-white/20 dark:bg-white/10 pointer-events-none animate-flash" />
      )}
    </>
  )
}

export const EnhancedEnvironmentParticles = memo(EnvironmentParticlesComponent)
