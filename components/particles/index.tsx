"use client"

import { DecorativeParticles } from "./decorative-particles"
import { MemoizedWeatherParticles } from "./weather-particles"

export function ParticleSystem() {
  return (
    <>
      <DecorativeParticles />
      <MemoizedWeatherParticles />
    </>
  )
}

export { DecorativeParticles } from "./decorative-particles"
export { WeatherParticles, MemoizedWeatherParticles } from "./weather-particles"
