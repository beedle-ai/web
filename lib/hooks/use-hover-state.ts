import { useState, useCallback } from "react"
import type { UseHoverStateReturn } from "@/lib/types/ui"

export function useHoverState(): UseHoverStateReturn {
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseEnter = useCallback(() => setIsHovering(true), [])
  const handleMouseLeave = useCallback(() => setIsHovering(false), [])
  const handleTouchStart = useCallback(() => setIsHovering(true), [])
  const handleTouchEnd = useCallback(() => setIsHovering(false), [])

  return {
    isHovering,
    hoverHandlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
    },
  }
}
