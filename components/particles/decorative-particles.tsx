"use client"

import { memo } from "react"

interface DecorativeParticle {
  id: string
  top: string
  left: string
  size: number
  opacity: number
  delay: number
  animation: "orbital" | "drift"
}

const PARTICLES: DecorativeParticle[] = [
  // Small light particles floating in space around text - tighter to text
  { id: "p1", top: "20%", left: "25%", size: 0.15, opacity: 60, delay: 0, animation: "orbital" },
  { id: "p2", top: "28%", left: "28%", size: 0.1, opacity: 40, delay: 600, animation: "orbital" },
  { id: "p3", top: "52%", left: "31%", size: 0.2, opacity: 50, delay: 1200, animation: "orbital" },
  { id: "p4", top: "25%", left: "34%", size: 0.08, opacity: 70, delay: 1800, animation: "orbital" },
  { id: "p5", top: "45%", left: "37%", size: 0.25, opacity: 30, delay: 2400, animation: "orbital" },
  { id: "p6", top: "18%", left: "40%", size: 0.12, opacity: 60, delay: 3000, animation: "orbital" },
  { id: "p7", top: "38%", left: "43%", size: 0.18, opacity: 45, delay: 3600, animation: "orbital" },
  { id: "p8", top: "55%", left: "46%", size: 0.15, opacity: 55, delay: 4200, animation: "orbital" },
  { id: "p9", top: "30%", left: "49%", size: 0.2, opacity: 40, delay: 4800, animation: "orbital" },
  { id: "p10", top: "48%", left: "52%", size: 0.1, opacity: 65, delay: 5400, animation: "orbital" },
  {
    id: "p11",
    top: "26%",
    left: "55%",
    size: 0.22,
    opacity: 35,
    delay: 6000,
    animation: "orbital",
  },
  {
    id: "p12",
    top: "42%",
    left: "58%",
    size: 0.15,
    opacity: 50,
    delay: 6600,
    animation: "orbital",
  },
  {
    id: "p13",
    top: "58%",
    left: "61%",
    size: 0.12,
    opacity: 60,
    delay: 7200,
    animation: "orbital",
  },
  {
    id: "p14",
    top: "22%",
    left: "64%",
    size: 0.25,
    opacity: 30,
    delay: 7800,
    animation: "orbital",
  },
  {
    id: "p15",
    top: "40%",
    left: "67%",
    size: 0.08,
    opacity: 70,
    delay: 8400,
    animation: "orbital",
  },
  {
    id: "p16",
    top: "15%",
    left: "70%",
    size: 0.18,
    opacity: 45,
    delay: 9000,
    animation: "orbital",
  },
  {
    id: "p17",
    top: "50%",
    left: "73%",
    size: 0.15,
    opacity: 55,
    delay: 9600,
    animation: "orbital",
  },
  {
    id: "p18",
    top: "56%",
    left: "75%",
    size: 0.2,
    opacity: 40,
    delay: 10200,
    animation: "orbital",
  },

  // Tiny drifting particles for ambient atmosphere - more centered
  { id: "p19", top: "12%", left: "27%", size: 0.1, opacity: 30, delay: 300, animation: "drift" },
  { id: "p20", top: "34%", left: "30%", size: 0.12, opacity: 25, delay: 900, animation: "drift" },
  { id: "p21", top: "60%", left: "33%", size: 0.08, opacity: 40, delay: 1500, animation: "drift" },
  { id: "p22", top: "28%", left: "36%", size: 0.15, opacity: 20, delay: 2100, animation: "drift" },
  { id: "p23", top: "39%", left: "39%", size: 0.1, opacity: 35, delay: 2700, animation: "drift" },
  { id: "p24", top: "10%", left: "42%", size: 0.13, opacity: 25, delay: 3300, animation: "drift" },
  { id: "p25", top: "53%", left: "45%", size: 0.09, opacity: 45, delay: 3900, animation: "drift" },
  { id: "p26", top: "32%", left: "48%", size: 0.11, opacity: 30, delay: 4500, animation: "drift" },
  { id: "p27", top: "62%", left: "51%", size: 0.14, opacity: 20, delay: 5100, animation: "drift" },
  { id: "p28", top: "24%", left: "54%", size: 0.1, opacity: 40, delay: 5700, animation: "drift" },
  { id: "p29", top: "44%", left: "57%", size: 0.08, opacity: 35, delay: 6300, animation: "drift" },
  { id: "p30", top: "57%", left: "60%", size: 0.12, opacity: 25, delay: 6900, animation: "drift" },
  { id: "p31", top: "19%", left: "63%", size: 0.15, opacity: 30, delay: 7500, animation: "drift" },
  { id: "p32", top: "46%", left: "66%", size: 0.09, opacity: 45, delay: 8100, animation: "drift" },
  { id: "p33", top: "11%", left: "69%", size: 0.11, opacity: 20, delay: 8700, animation: "drift" },
  { id: "p34", top: "59%", left: "72%", size: 0.13, opacity: 35, delay: 9300, animation: "drift" },

  // Tiny particles around logo area
  { id: "p35", top: "62%", left: "43%", size: 0.15, opacity: 40, delay: 0, animation: "orbital" },
  { id: "p36", top: "64%", left: "45%", size: 0.1, opacity: 35, delay: 700, animation: "orbital" },
  {
    id: "p37",
    top: "66%",
    left: "47%",
    size: 0.12,
    opacity: 45,
    delay: 1400,
    animation: "orbital",
  },
  {
    id: "p38",
    top: "70%",
    left: "48%",
    size: 0.18,
    opacity: 25,
    delay: 2100,
    animation: "orbital",
  },
  {
    id: "p39",
    top: "72%",
    left: "49%",
    size: 0.08,
    opacity: 50,
    delay: 2800,
    animation: "orbital",
  },
  { id: "p40", top: "74%", left: "50%", size: 0.2, opacity: 30, delay: 3500, animation: "orbital" },
  { id: "p41", top: "71%", left: "51%", size: 0.1, opacity: 40, delay: 4200, animation: "orbital" },
  {
    id: "p42",
    top: "69%",
    left: "52%",
    size: 0.15,
    opacity: 35,
    delay: 4900,
    animation: "orbital",
  },
  {
    id: "p43",
    top: "65%",
    left: "53%",
    size: 0.12,
    opacity: 45,
    delay: 5600,
    animation: "orbital",
  },
  {
    id: "p44",
    top: "63%",
    left: "55%",
    size: 0.09,
    opacity: 50,
    delay: 6300,
    animation: "orbital",
  },
  {
    id: "p45",
    top: "61%",
    left: "57%",
    size: 0.14,
    opacity: 30,
    delay: 7000,
    animation: "orbital",
  },
  { id: "p46", top: "68%", left: "50%", size: 0.11, opacity: 25, delay: 7700, animation: "drift" },
  { id: "p47", top: "73%", left: "46%", size: 0.08, opacity: 40, delay: 8400, animation: "drift" },
  { id: "p48", top: "67%", left: "54%", size: 0.13, opacity: 35, delay: 9100, animation: "drift" },
]

function DecorativeParticlesComponent() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[900px] h-[500px]" style={{ marginTop: "3%" }}>
          {PARTICLES.map((particle) => (
            <div
              key={particle.id}
              className={`absolute rounded-full transition-none ${
                particle.animation === "orbital" ? "animate-orbital-fade" : "animate-gentle-drift"
              }`}
              style={
                {
                  "--particle-opacity": particle.opacity / 100,
                  top: particle.top,
                  left: particle.left,
                  width: `${particle.size}rem`,
                  height: `${particle.size}rem`,
                  backgroundColor: `rgba(229, 231, 235, ${particle.opacity / 300})`,
                  boxShadow: `0 0 ${particle.size * 10}px rgba(229, 231, 235, ${particle.opacity / 150}), 0 0 ${particle.size * 20}px rgba(255, 255, 255, ${particle.opacity / 200})`,
                  filter: "blur(0.3px)",
                  animationDelay: `${particle.delay}ms`,
                  animationFillMode: "both",
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export const DecorativeParticles = memo(DecorativeParticlesComponent)
