"use client"

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export function WireframeMesh() {
  const mountRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: 0, y: 0, worldX: 0, worldY: 0 })
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check for dark mode
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }

    checkDarkMode()

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.z = 20

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    mount.appendChild(renderer.domElement)

    // Create groups for nodes and edges
    const nodesGroup = new THREE.Group()
    const edgesGroup = new THREE.Group()
    scene.add(edgesGroup)
    scene.add(nodesGroup)

    // Generate network nodes with strong center bias
    const nodes: { mesh: THREE.Mesh, position: THREE.Vector3, connections: number[], phase: number }[] = []
    const targetNodeCount = 80 // More nodes for better network
    const minNodeDistance = 4 // Reduced for denser center packing
    const maxAttempts = 500 // Max attempts to place a node

    let attempts = 0
    while (nodes.length < targetNodeCount && attempts < maxAttempts) {
      attempts++

      // Even distribution across full width
      const t = Math.random()
      const x = (t - 0.5) * 100

      // Subtle expansion effect
      const spreadFactor = 0.5 + t * 0.5 // From 0.5 to 1.0

      // Strong vertical center bias using gaussian-like distribution
      const angle = Math.random() * Math.PI * 2

      // Use gaussian-like distribution for radius to concentrate in center
      const gaussianRandom = () => {
        // Box-Muller transform for gaussian distribution
        const u1 = Math.random()
        const u2 = Math.random()
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      }

      const gaussValue = Math.abs(gaussianRandom()) / 3 // Normalize to roughly 0-1 range
      const radiusBase = Math.min(gaussValue * 12, 12) * spreadFactor // Max radius 12, concentrated near 0

      const y = Math.sin(angle) * radiusBase
      const z = Math.cos(angle) * radiusBase * 0.3

      const newPosition = new THREE.Vector3(x, y, z)

      // Check minimum distance from existing nodes
      let tooClose = false
      for (const node of nodes) {
        if (node.position.distanceTo(newPosition) < minNodeDistance) {
          tooClose = true
          break
        }
      }

      if (!tooClose) {
        // Create node sphere
        const geometry = new THREE.SphereGeometry(0.05, 4, 4)
        const nodeOpacity = isDarkMode ? (0.04 + t * 0.02) : (0.08 + t * 0.04)
        const material = new THREE.MeshBasicMaterial({
          color: isDarkMode ? 0x94a3b8 : 0x475569,
          transparent: true,
          opacity: nodeOpacity
        })

        const nodeMesh = new THREE.Mesh(geometry, material)
        nodeMesh.position.copy(newPosition)
        nodesGroup.add(nodeMesh)

        nodes.push({
          mesh: nodeMesh,
          position: newPosition,
          connections: [],
          phase: Math.random() * Math.PI * 2
        })
      }
    }

    // Create edges for proper network mesh
    const edges: { line: THREE.Line, startIdx: number, endIdx: number }[] = []
    const maxDistance = 16 // Good for creating interconnected mesh

    // More uniform connections for network appearance
    const getMaxConnectionsForNode = () => {
      const variation = Math.random()
      if (variation < 0.2) return 6  // 20% can be hubs
      if (variation < 0.5) return 5   // 30% have 5
      return 4                        // 50% have 4
    }

    // Store max connections per node
    const maxConnectionsPerNode: number[] = nodes.map(() => getMaxConnectionsForNode())

    // First pass: Create delaunay-like triangulation for base network
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].connections.length >= maxConnectionsPerNode[i]) continue

      const potentialConnections: { index: number, distance: number, angle: number }[] = []

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue
        if (nodes[j].connections.length >= maxConnectionsPerNode[j]) continue

        // Check if already connected
        if (nodes[i].connections.includes(j)) continue

        const dist = nodes[i].position.distanceTo(nodes[j].position)

        if (dist < maxDistance) {
          const dx = nodes[j].position.x - nodes[i].position.x
          const dy = nodes[j].position.y - nodes[i].position.y
          const angle = Math.atan2(dy, dx)
          potentialConnections.push({ index: j, distance: dist, angle })
        }
      }

      // Sort by distance
      potentialConnections.sort((a, b) => a.distance - b.distance)

      // Connect to 3-4 nearest that create good triangles
      const targetConnections = 3 + (Math.random() < 0.5 ? 1 : 0)
      const connectionsToMake = Math.min(
        maxConnectionsPerNode[i] - nodes[i].connections.length,
        potentialConnections.length,
        targetConnections
      )

      // Track angles of connections to ensure good spread
      const connectedAngles: number[] = []

      for (let c = 0; c < potentialConnections.length && connectedAngles.length < connectionsToMake; c++) {
        const j = potentialConnections[c].index
        const angle = potentialConnections[c].angle

        // Check for good angular spread (avoid connections too close in angle)
        let goodAngle = true
        for (const existingAngle of connectedAngles) {
          const angleDiff = Math.abs(angle - existingAngle)
          if (angleDiff < Math.PI / 6 || angleDiff > Math.PI * 11 / 6) { // Minimum 30 degrees apart
            goodAngle = false
            break
          }
        }

        if (goodAngle || connectedAngles.length === 0) {
          connectedAngles.push(angle)

          // Create edge
          const points = [nodes[i].position.clone(), nodes[j].position.clone()]
          const geometry = new THREE.BufferGeometry().setFromPoints(points)

          const t = (nodes[i].position.x + nodes[j].position.x) / 2 / 50 + 0.5
          const edgeOpacity = isDarkMode ? (0.08 + t * 0.06) : (0.15 + t * 0.1)
          const material = new THREE.LineBasicMaterial({
            color: isDarkMode ? 0x64748b : 0x334155,
            transparent: true,
            opacity: edgeOpacity
          })

          const line = new THREE.Line(geometry, material)
          edgesGroup.add(line)

          edges.push({ line, startIdx: i, endIdx: j })
          nodes[i].connections.push(j)
          nodes[j].connections.push(i)
        }
      }
    }

    // Mouse/touch event handling
    const handleMouseMove = (event: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

      // Normalize mouse position to -1 to 1
      mouseRef.current.x = (clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(clientY / window.innerHeight) * 2 + 1

      // Convert to world coordinates
      const vector = new THREE.Vector3(mouseRef.current.x, mouseRef.current.y, 0)
      vector.unproject(camera)
      vector.sub(camera.position).normalize()
      const distance = -camera.position.z / vector.z
      const worldPos = camera.position.clone().add(vector.multiplyScalar(distance))

      mouseRef.current.worldX = worldPos.x
      mouseRef.current.worldY = worldPos.y
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleMouseMove)
    window.addEventListener('touchstart', handleMouseMove)

    // Animation
    let time = 0
    const animate = () => {
      requestAnimationFrame(animate)
      time += 0.0015

      // Animate nodes with subtle mouse influence
      nodes.forEach((node) => {
        const basePos = node.position

        // Calculate distance from mouse
        const dx = mouseRef.current.worldX - basePos.x
        const dy = mouseRef.current.worldY - basePos.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        // Subtle mouse influence with visible feedback
        const maxInfluence = 25 // Medium influence range
        const influence = Math.max(0, 1 - distance / maxInfluence)

        // Subtle attraction - creates a gentle flow toward mouse
        const attractX = influence * dx * 0.01 // Subtle movement
        const attractY = influence * dy * 0.01

        // Base floating animation with mouse influence
        const floatSpeed = 0.5
        const floatAmount = 0.4
        node.mesh.position.x = basePos.x + Math.sin(time * floatSpeed + node.phase + influence * 0.5) * floatAmount + attractX
        node.mesh.position.y = basePos.y + Math.sin(time * floatSpeed * 1.3 + node.phase + influence * 0.5) * floatAmount * 1.2 + attractY
        node.mesh.position.z = basePos.z + Math.cos(time * floatSpeed * 0.7 + node.phase) * floatAmount * 0.5

        // More visible opacity change near mouse
        if (node.mesh.material instanceof THREE.MeshBasicMaterial) {
          const t = (basePos.x + 45) / 90
          const baseOpacity = isDarkMode ? (0.04 + t * 0.02) : (0.08 + t * 0.04)
          const hoverBoost = influence * 0.08 // More visible lighting
          node.mesh.material.opacity = baseOpacity + Math.sin(time * 2 + node.phase) * 0.02 + hoverBoost

          // Subtle scale increase near mouse for visibility
          const scale = 1 + influence * 0.15
          node.mesh.scale.set(scale, scale, scale)
        }
      })

      // Update edge positions with subtle mouse influence
      edges.forEach(edge => {
        const positions = edge.line.geometry.attributes.position
        const array = positions.array as Float32Array

        array[0] = nodes[edge.startIdx].mesh.position.x
        array[1] = nodes[edge.startIdx].mesh.position.y
        array[2] = nodes[edge.startIdx].mesh.position.z
        array[3] = nodes[edge.endIdx].mesh.position.x
        array[4] = nodes[edge.endIdx].mesh.position.y
        array[5] = nodes[edge.endIdx].mesh.position.z

        positions.needsUpdate = true

        // Calculate edge midpoint distance from mouse
        const midX = (array[0] + array[3]) / 2
        const midY = (array[1] + array[4]) / 2
        const dx = mouseRef.current.worldX - midX
        const dy = mouseRef.current.worldY - midY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const influence = Math.max(0, 1 - distance / 30) // Medium influence range

        // More visible edge lighting near mouse
        if (edge.line.material instanceof THREE.LineBasicMaterial) {
          const t = (nodes[edge.startIdx].position.x + nodes[edge.endIdx].position.x) / 2 / 45 + 0.5
          const baseOpacity = isDarkMode ? (0.08 + t * 0.06) : (0.15 + t * 0.1)
          const hoverBoost = influence * 0.12 // More visible lighting
          edge.line.material.opacity = baseOpacity + Math.sin(time * 3 + edge.startIdx * 0.2) * 0.03 + hoverBoost
        }
      })

      renderer.render(scene, camera)
    }

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    // Start animation
    animate()

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleMouseMove)
      window.removeEventListener('touchstart', handleMouseMove)
      if (mount && renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [isDarkMode])

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none"
      style={{ filter: 'contrast(1.1) brightness(1.2)' }}
    />
  )
}