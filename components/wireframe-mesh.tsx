"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as THREE from "three"
import { MESH_CONFIG } from "@/lib/three/config"
import type { NetworkNode, NetworkEdge, MousePosition } from "@/lib/three/types"
import { generateNodes, generateEdges } from "@/lib/three/network-generator"
import { animateNodes, animateEdges, handleMouseMove } from "@/lib/three/animation"

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

export function WireframeMesh() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const nodesRef = useRef<NetworkNode[]>([])
  const edgesRef = useRef<NetworkEdge[]>([])
  const mouseRef = useRef<MousePosition>({ x: 0, y: 0, worldX: 0, worldY: 0 })
  const animationIdRef = useRef<number>(0)

  const isDarkMode = useThemeDetection()

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

      animateNodes(nodes, mouseRef.current, time, isDarkMode)
      animateEdges(edges, nodes, mouseRef.current, time, isDarkMode)

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
  }, [isDarkMode, handlePointerMove, handleResize])

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none"
      style={{ filter: "contrast(1.1) brightness(1.2)" }}
    />
  )
}
