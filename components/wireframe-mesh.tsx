"use client"

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export function WireframeMesh() {
  const mountRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: 0, y: 0, worldX: 0, worldY: 0 })
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }

    checkDarkMode()

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

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.z = 20

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    mount.appendChild(renderer.domElement)

    const nodesGroup = new THREE.Group()
    const edgesGroup = new THREE.Group()
    scene.add(edgesGroup)
    scene.add(nodesGroup)

    const nodes: { mesh: THREE.Mesh, position: THREE.Vector3, connections: number[], phase: number }[] = []
    const targetNodeCount = 80
    const minNodeDistance = 4
    const maxAttempts = 500

    let attempts = 0
    while (nodes.length < targetNodeCount && attempts < maxAttempts) {
      attempts++

      const t = Math.random()
      const x = (t - 0.5) * 100

      // Subtle expansion effect
      const spreadFactor = 0.5 + t * 0.5

      const angle = Math.random() * Math.PI * 2

      const gaussianRandom = () => {
        const u1 = Math.random()
        const u2 = Math.random()
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      }

      const gaussValue = Math.abs(gaussianRandom()) / 3
      const radiusBase = Math.min(gaussValue * 12, 12) * spreadFactor

      const y = Math.sin(angle) * radiusBase
      const z = Math.cos(angle) * radiusBase * 0.3

      const newPosition = new THREE.Vector3(x, y, z)

      let tooClose = false
      for (const node of nodes) {
        if (node.position.distanceTo(newPosition) < minNodeDistance) {
          tooClose = true
          break
        }
      }

      if (!tooClose) {
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

    const edges: { line: THREE.Line, startIdx: number, endIdx: number }[] = []
    const maxDistance = 16

    const getMaxConnectionsForNode = () => {
      const variation = Math.random()
      if (variation < 0.2) return 6
      if (variation < 0.5) return 5
      return 4
    }

    const maxConnectionsPerNode: number[] = nodes.map(() => getMaxConnectionsForNode())

    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].connections.length >= maxConnectionsPerNode[i]) continue

      const potentialConnections: { index: number, distance: number, angle: number }[] = []

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue
        if (nodes[j].connections.length >= maxConnectionsPerNode[j]) continue

        if (nodes[i].connections.includes(j)) continue

        const dist = nodes[i].position.distanceTo(nodes[j].position)

        if (dist < maxDistance) {
          const dx = nodes[j].position.x - nodes[i].position.x
          const dy = nodes[j].position.y - nodes[i].position.y
          const angle = Math.atan2(dy, dx)
          potentialConnections.push({ index: j, distance: dist, angle })
        }
      }

      potentialConnections.sort((a, b) => a.distance - b.distance)

      const targetConnections = 3 + (Math.random() < 0.5 ? 1 : 0)
      const connectionsToMake = Math.min(
        maxConnectionsPerNode[i] - nodes[i].connections.length,
        potentialConnections.length,
        targetConnections
      )

      const connectedAngles: number[] = []

      for (let c = 0; c < potentialConnections.length && connectedAngles.length < connectionsToMake; c++) {
        const j = potentialConnections[c].index
        const angle = potentialConnections[c].angle

        let goodAngle = true
        for (const existingAngle of connectedAngles) {
          const angleDiff = Math.abs(angle - existingAngle)
          if (angleDiff < Math.PI / 6 || angleDiff > Math.PI * 11 / 6) {
            goodAngle = false
            break
          }
        }

        if (goodAngle || connectedAngles.length === 0) {
          connectedAngles.push(angle)

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

    const handleMouseMove = (event: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

      mouseRef.current.x = (clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(clientY / window.innerHeight) * 2 + 1

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

    let time = 0
    const animate = () => {
      requestAnimationFrame(animate)
      time += 0.0015

      nodes.forEach((node) => {
        const basePos = node.position

        const dx = mouseRef.current.worldX - basePos.x
        const dy = mouseRef.current.worldY - basePos.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        const maxInfluence = 25
        const influence = Math.max(0, 1 - distance / maxInfluence)

        const attractX = influence * dx * 0.01
        const attractY = influence * dy * 0.01

        const floatSpeed = 0.5
        const floatAmount = 0.4
        node.mesh.position.x = basePos.x + Math.sin(time * floatSpeed + node.phase + influence * 0.5) * floatAmount + attractX
        node.mesh.position.y = basePos.y + Math.sin(time * floatSpeed * 1.3 + node.phase + influence * 0.5) * floatAmount * 1.2 + attractY
        node.mesh.position.z = basePos.z + Math.cos(time * floatSpeed * 0.7 + node.phase) * floatAmount * 0.5

        if (node.mesh.material instanceof THREE.MeshBasicMaterial) {
          const t = (basePos.x + 45) / 90
          const baseOpacity = isDarkMode ? (0.04 + t * 0.02) : (0.08 + t * 0.04)
          const hoverBoost = influence * 0.08
          node.mesh.material.opacity = baseOpacity + Math.sin(time * 2 + node.phase) * 0.02 + hoverBoost

          const scale = 1 + influence * 0.15
          node.mesh.scale.set(scale, scale, scale)
        }
      })

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

        const midX = (array[0] + array[3]) / 2
        const midY = (array[1] + array[4]) / 2
        const dx = mouseRef.current.worldX - midX
        const dy = mouseRef.current.worldY - midY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const influence = Math.max(0, 1 - distance / 30)

        if (edge.line.material instanceof THREE.LineBasicMaterial) {
          const t = (nodes[edge.startIdx].position.x + nodes[edge.endIdx].position.x) / 2 / 45 + 0.5
          const baseOpacity = isDarkMode ? (0.08 + t * 0.06) : (0.15 + t * 0.1)
          const hoverBoost = influence * 0.12
          edge.line.material.opacity = baseOpacity + Math.sin(time * 3 + edge.startIdx * 0.2) * 0.03 + hoverBoost
        }
      })

      renderer.render(scene, camera)
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    animate()

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