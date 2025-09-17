"use client"

import { memo } from 'react'

interface Particle {
  id: string
  top: string
  left?: string
  right?: string
  size: number
  opacity: number
  delay: number
  colorClass: string
}

const particles: Particle[] = [
  { id: 'p1', top: '20%', left: '8%', size: 1, opacity: 60, delay: 0, colorClass: 'bg-slate-400/40 dark:bg-slate-400/20' },
  { id: 'p2', top: '65%', left: '15%', size: 0.5, opacity: 30, delay: 2000, colorClass: 'bg-gray-400 dark:bg-gray-500' },
  { id: 'p3', top: '40%', left: '12%', size: 0.75, opacity: 35, delay: 4000, colorClass: 'bg-gray-400 dark:bg-gray-500' },
  { id: 'p4', top: '30%', left: '25%', size: 1, opacity: 35, delay: 1000, colorClass: 'bg-gray-400 dark:bg-gray-500' },
  { id: 'p5', top: '55%', left: '30%', size: 0.5, opacity: 40, delay: 3000, colorClass: 'bg-slate-400/40 dark:bg-slate-400/20' },
  { id: 'p6', top: '75%', left: '35%', size: 0.75, opacity: 40, delay: 0, colorClass: 'bg-gray-400 dark:bg-gray-500' },
  { id: 'p7', top: '45%', left: '45%', size: 0.5, opacity: 25, delay: 2000, colorClass: 'bg-gray-400 dark:bg-gray-500' },
  { id: 'p8', top: '25%', left: '50%', size: 1, opacity: 45, delay: 0, colorClass: 'bg-slate-400/40 dark:bg-slate-400/20' },
  { id: 'p9', top: '70%', right: '45%', size: 0.75, opacity: 35, delay: 1000, colorClass: 'bg-gray-400 dark:bg-gray-500' },
  { id: 'p10', top: '35%', right: '35%', size: 0.5, opacity: 30, delay: 3000, colorClass: 'bg-gray-400 dark:bg-gray-500' },
  { id: 'p11', top: '60%', right: '30%', size: 1, opacity: 40, delay: 4000, colorClass: 'bg-gray-400 dark:bg-gray-500' },
  { id: 'p12', top: '50%', right: '25%', size: 0.75, opacity: 50, delay: 1000, colorClass: 'bg-slate-400/40 dark:bg-slate-400/20' },
  { id: 'p13', top: '45%', right: '12%', size: 0.5, opacity: 30, delay: 2000, colorClass: 'bg-gray-400 dark:bg-gray-500' },
  { id: 'p14', top: '25%', right: '15%', size: 1, opacity: 35, delay: 0, colorClass: 'bg-gray-400 dark:bg-gray-500' },
  { id: 'p15', top: '68%', right: '8%', size: 0.75, opacity: 45, delay: 3000, colorClass: 'bg-slate-400/40 dark:bg-slate-400/20' }
]

function AnimatedParticlesComponent() {
  return (
    <div className="absolute inset-x-0 -inset-y-24 max-w-[650px] mx-auto -z-10">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute rounded-full ${particle.colorClass} animate-float`}
          style={{
            top: particle.top,
            ...(particle.left ? { left: particle.left } : { right: particle.right }),
            width: `${particle.size * 0.25}rem`,
            height: `${particle.size * 0.25}rem`,
            opacity: particle.opacity / 100,
            animationDelay: `${particle.delay}ms`
          }}
        />
      ))}
    </div>
  )
}

export const AnimatedParticles = memo(AnimatedParticlesComponent)