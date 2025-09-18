"use client"

import { forwardRef, memo } from "react"
import Image from "next/image"
import { ANIMATION_CONFIG } from "@/lib/constants/animation"

interface InteractiveLogoProps {
  isHovering: boolean
  mousePos: { x: number; y: number }
  hoverHandlers: {
    onMouseEnter: () => void
    onMouseLeave: () => void
    onTouchStart: () => void
    onTouchEnd: () => void
  }
  perspectiveStyle: React.CSSProperties
}

const InteractiveLogoComponent = forwardRef<HTMLDivElement, InteractiveLogoProps>(
  ({ isHovering, mousePos, hoverHandlers, perspectiveStyle }, ref) => {
    const glowStyle: React.CSSProperties = {
      background: `radial-gradient(${ANIMATION_CONFIG.glow.radius}px circle at ${50 + mousePos.x * 10}% ${50 + mousePos.y * 10}%,
        rgba(148, 163, 184, ${ANIMATION_CONFIG.glow.opacity}) 0%,
        transparent 40%)`,
      filter: `blur(${ANIMATION_CONFIG.glow.blur}px)`,
    }

    const brightnessStyle: React.CSSProperties = {
      filter: isHovering
        ? `brightness(${ANIMATION_CONFIG.brightness.base + Math.abs(mousePos.x) * ANIMATION_CONFIG.brightness.mouseInfluence + Math.abs(mousePos.y) * ANIMATION_CONFIG.brightness.mouseInfluence})`
        : "brightness(1)",
      transition: "filter 0.3s ease-out",
    }

    return (
      <div
        ref={ref}
        className="mt-8 flex justify-center cursor-default"
        style={perspectiveStyle}
        {...hoverHandlers}
      >
        <div
          className="relative w-24 h-20 sm:w-32 sm:h-28 md:w-40 md:h-36 select-none"
          style={brightnessStyle}
        >
          <Image
            src="/beedle_logo-white.svg"
            alt="Beedle Logo"
            fill
            className="object-contain opacity-90 dark:opacity-90 invert dark:invert-0 pointer-events-none select-none"
            priority
            draggable={false}
          />
          {isHovering && <div className="absolute inset-0 pointer-events-none" style={glowStyle} />}
        </div>
      </div>
    )
  }
)

InteractiveLogoComponent.displayName = "InteractiveLogo"

export const InteractiveLogo = memo(InteractiveLogoComponent)
