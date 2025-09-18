import { useState, useEffect, useCallback } from "react"
import type { RefObject } from "react"
import type { MousePosition, UseMousePerspectiveReturn } from "@/lib/types/ui"

interface PerspectiveConfig {
  rotationIntensity?: {
    x: number
    y: number
  }
  scale?: number
  transition?: string
}

const DEFAULT_CONFIG: Required<PerspectiveConfig> = {
  rotationIntensity: { x: 6, y: 4 },
  scale: 1.02,
  transition: "transform 0.15s ease-out",
}

export function useMousePerspective(
  elementRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  config: PerspectiveConfig = {}
): UseMousePerspectiveReturn {
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 })
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  const handlePointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!elementRef.current) return

      const rect = elementRef.current.getBoundingClientRect()
      const clientX = "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX
      const clientY = "touches" in e ? (e.touches[0]?.clientY ?? 0) : e.clientY

      const x = (clientX - rect.left - rect.width / 2) / rect.width
      const y = (clientY - rect.top - rect.height / 2) / rect.height

      setMousePos({ x, y })
    },
    [elementRef]
  )

  useEffect(() => {
    if (!isActive) return

    window.addEventListener("mousemove", handlePointerMove)
    window.addEventListener("touchmove", handlePointerMove)
    window.addEventListener("touchstart", handlePointerMove)

    return () => {
      window.removeEventListener("mousemove", handlePointerMove)
      window.removeEventListener("touchmove", handlePointerMove)
      window.removeEventListener("touchstart", handlePointerMove)
    }
  }, [isActive, handlePointerMove])

  const perspectiveStyle: React.CSSProperties = {
    transform: isActive
      ? `perspective(1000px) rotateX(${-mousePos.y * mergedConfig.rotationIntensity.y}deg) rotateY(${mousePos.x * mergedConfig.rotationIntensity.x}deg) scale(${mergedConfig.scale})`
      : `perspective(1000px) rotateX(${-mousePos.y * 1}deg) rotateY(${mousePos.x * 1.5}deg) scale(1)`,
    transition: mergedConfig.transition,
  }

  return { mousePos, perspectiveStyle }
}
