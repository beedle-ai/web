"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as THREE from "three"
import { MESH_CONFIG } from "@/lib/three/config"
import type { NetworkNode, NetworkEdge, MousePosition } from "@/lib/three/types"
import { generateNodes, generateEdges } from "@/lib/three/network-generator"
import { animateNodes, animateEdges, handleMouseMove } from "@/lib/three/animation"
import { useEnvironmentContext } from "@/contexts/environment-context"

function useThemeDetection() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"))
    }

    checkDarkMode()

    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  return isDarkMode
}

export function EnvironmentWireframeMesh() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const nodesRef = useRef<NetworkNode[]>([])
  const edgesRef = useRef<NetworkEdge[]>([])
  const mouseRef = useRef<MousePosition>({ x: 0, y: 0, worldX: 0, worldY: 0 })
  const animationIdRef = useRef<number>(0)
  const fogRef = useRef<THREE.FogExp2 | null>(null)

  const isDarkMode = useThemeDetection()
  const { environment } = useEnvironmentContext()

  const handlePointerMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!cameraRef.current) return
    mouseRef.current = handleMouseMove(event, cameraRef.current, window)
  }, [])

  const handleResize = useCallback(() => {
    if (!cameraRef.current || !rendererRef.current) return

    cameraRef.current.aspect = window.innerWidth / window.innerHeight
    cameraRef.current.updateProjectionMatrix()
    rendererRef.current.setSize(window.innerWidth, window.innerHeight)
  }, [])

  // Update fog based on weather
  useEffect(() => {
    if (!sceneRef.current) return

    const fogColor = isDarkMode ? 0x0a0a0a : 0xf5f5f5
    let fogDensity = 0

    switch (environment.weather) {
      case "fog":
        fogDensity = 0.03
        break
      case "rain":
      case "storm":
        fogDensity = 0.015
        break
      case "snow":
        fogDensity = 0.02
        break
      case "clouds":
        fogDensity = 0.008
        break
      default:
        fogDensity = 0.003
    }

    if (fogRef.current) {
      fogRef.current.color.setHex(fogColor)
      fogRef.current.density = fogDensity
    } else {
      fogRef.current = new THREE.FogExp2(fogColor, fogDensity)
      sceneRef.current.fog = fogRef.current
    }
  }, [environment.weather, isDarkMode])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      MESH_CONFIG.camera.fov,
      window.innerWidth / window.innerHeight,
      MESH_CONFIG.camera.near,
      MESH_CONFIG.camera.far
    )
    camera.position.z = MESH_CONFIG.camera.position.z

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    mount.appendChild(renderer.domElement)

    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera

    const nodesGroup = new THREE.Group()
    const edgesGroup = new THREE.Group()
    scene.add(edgesGroup)
    scene.add(nodesGroup)

    const nodes = generateNodes(nodesGroup, isDarkMode)
    const edges = generateEdges(nodes, edgesGroup, isDarkMode)

    nodesRef.current = nodes
    edgesRef.current = edges

    window.addEventListener("mousemove", handlePointerMove)
    window.addEventListener("touchmove", handlePointerMove)
    window.addEventListener("touchstart", handlePointerMove)
    window.addEventListener("resize", handleResize)

    let time = 0
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      time += MESH_CONFIG.animation.timeStep

      // Environmental effects on animation
      const windEffect = environment.windSpeed * 0.0001
      const temperatureEffect = (environment.temperature - 20) * 0.001

      // Modify wave amplitude based on weather
      let waveMultiplier = 1
      switch (environment.weather) {
        case "storm":
          waveMultiplier = 1.5 + Math.sin(time * 2) * 0.3
          break
        case "rain":
          waveMultiplier = 1.2
          break
        case "snow":
          waveMultiplier = 0.7
          break
        case "fog":
          waveMultiplier = 0.8
          break
      }

      // Apply environmental effects to nodes
      nodes.forEach((node, i) => {
        if (node.mesh) {
          // Base animation
          const baseY = Math.sin(time * 0.5 + i * 0.3) * 0.2
          const baseX = Math.cos(time * 0.3 + i * 0.2) * 0.1

          // Environmental modifications
          node.mesh.position.y = node.position.y + baseY * waveMultiplier
          node.mesh.position.x = node.position.x + baseX + windEffect * time

          // Temperature affects expansion/contraction
          const scale = 1 + temperatureEffect
          node.mesh.scale.setScalar(scale)
        }
      })

      animateNodes(nodes, mouseRef.current, time, isDarkMode)
      animateEdges(edges, nodes, mouseRef.current, time, isDarkMode)

      // Rotate entire mesh slightly based on time of day
      const hourRotation = (new Date().getHours() / 24) * Math.PI * 0.1
      nodesGroup.rotation.z = hourRotation
      edgesGroup.rotation.z = hourRotation

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousemove", handlePointerMove)
      window.removeEventListener("touchmove", handlePointerMove)
      window.removeEventListener("touchstart", handlePointerMove)

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }

      if (mount && renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }

      renderer.dispose()

      nodesGroup.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (child.material instanceof THREE.Material) {
            child.material.dispose()
          }
        }
      })

      edgesGroup.children.forEach((child) => {
        if (child instanceof THREE.Line) {
          child.geometry.dispose()
          if (child.material instanceof THREE.Material) {
            child.material.dispose()
          }
        }
      })
    }
  }, [
    isDarkMode,
    handlePointerMove,
    handleResize,
    environment.weather,
    environment.windSpeed,
    environment.temperature,
  ])

  // Opacity based on weather/time
  const getMeshOpacity = () => {
    let opacity = 1

    if (environment.weather === "fog") opacity *= 0.5
    if (environment.weather === "storm") opacity *= 1.3
    if (environment.timeOfDay === "night") opacity *= 0.7
    if (environment.timeOfDay === "dawn" || environment.timeOfDay === "evening") opacity *= 0.85

    return opacity
  }

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
      style={{
        filter: `contrast(1.1) brightness(1.2)`,
        opacity: getMeshOpacity(),
      }}
    />
  )
}
