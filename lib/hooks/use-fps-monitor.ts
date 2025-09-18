import { useEffect, useRef, useState, useCallback } from "react"
import { THREE_CONSTANTS } from "@/lib/constants/three"

interface FPSMonitorOptions {
  onLowFPS?: (fps: number) => void
  threshold?: number
  sampleSize?: number
}

interface FPSMonitorReturn {
  fps: number
  isLowFPS: boolean
  startMonitoring: () => void
  stopMonitoring: () => void
}

export function useFPSMonitor(options: FPSMonitorOptions = {}): FPSMonitorReturn {
  const {
    onLowFPS,
    threshold = THREE_CONSTANTS.PERFORMANCE.FPS_THRESHOLD.MEDIUM,
    sampleSize = 10,
  } = options

  const [fps, setFPS] = useState(60)
  const [isLowFPS, setIsLowFPS] = useState(false)
  const frameTimesRef = useRef<number[]>([])
  const animationIdRef = useRef<number | null>(null)
  const lastTimeRef = useRef(performance.now())
  const isMonitoringRef = useRef(false)

  const calculateFPS = useCallback(() => {
    const currentTime = performance.now()
    const delta = currentTime - lastTimeRef.current
    lastTimeRef.current = currentTime

    // Add current frame time
    frameTimesRef.current.push(delta)

    // Keep only the last N samples
    if (frameTimesRef.current.length > sampleSize) {
      frameTimesRef.current.shift()
    }

    // Calculate average FPS from samples
    if (frameTimesRef.current.length > 0) {
      const averageDelta =
        frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
      const currentFPS = Math.round(1000 / averageDelta)

      setFPS(currentFPS)
      setIsLowFPS(currentFPS < threshold)

      if (currentFPS < threshold && onLowFPS) {
        onLowFPS(currentFPS)
      }
    }
  }, [threshold, onLowFPS, sampleSize])

  const monitor = useCallback(() => {
    if (!isMonitoringRef.current) return

    calculateFPS()
    animationIdRef.current = requestAnimationFrame(monitor)
  }, [calculateFPS])

  const startMonitoring = useCallback(() => {
    if (isMonitoringRef.current) return

    isMonitoringRef.current = true
    frameTimesRef.current = []
    lastTimeRef.current = performance.now()
    animationIdRef.current = requestAnimationFrame(monitor)
  }, [monitor])

  const stopMonitoring = useCallback(() => {
    isMonitoringRef.current = false

    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current)
      animationIdRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [stopMonitoring])

  return {
    fps,
    isLowFPS,
    startMonitoring,
    stopMonitoring,
  }
}
