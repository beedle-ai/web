"use client"

import { forwardRef, memo } from "react"
import { ANIMATION_CONFIG } from "@/lib/constants/animation"

interface InteractiveTitleProps {
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

const InteractiveTitleComponent = forwardRef<HTMLHeadingElement, InteractiveTitleProps>(
  ({ isHovering, mousePos, hoverHandlers, perspectiveStyle }, ref) => {
    const glowStyle: React.CSSProperties = {
      background: `radial-gradient(${ANIMATION_CONFIG.glow.radius}px circle at ${50 + mousePos.x * 10}% ${50 + mousePos.y * 10}%,
        rgba(148, 163, 184, ${ANIMATION_CONFIG.glow.opacity}) 0%,
        transparent 40%)`,
      filter: `blur(${ANIMATION_CONFIG.glow.blur}px)`,
    }

    const textGradientStyle: React.CSSProperties = {
      filter: isHovering
        ? `brightness(${ANIMATION_CONFIG.brightness.base + Math.abs(mousePos.x) * ANIMATION_CONFIG.brightness.mouseInfluence + Math.abs(mousePos.y) * ANIMATION_CONFIG.brightness.mouseInfluence})`
        : "brightness(1)",
      transition: "filter 0.3s ease-out",
    }

    return (
      <h1
        ref={ref}
        className="mb-8 sm:mb-12 text-5xl font-semibold tracking-tight sm:text-7xl md:text-8xl lg:text-9xl select-none cursor-default"
        style={perspectiveStyle}
        {...hoverHandlers}
      >
        <span
          className="inline-block bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent relative"
          style={textGradientStyle}
        >
          beedle.ai
          {isHovering && <div className="absolute inset-0 pointer-events-none" style={glowStyle} />}
        </span>
      </h1>
    )
  }
)

InteractiveTitleComponent.displayName = "InteractiveTitle"

export const InteractiveTitle = memo(InteractiveTitleComponent)
