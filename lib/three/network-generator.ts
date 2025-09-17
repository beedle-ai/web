import * as THREE from "three"
import type { NetworkNode, NetworkEdge } from "./types"
import { MESH_CONFIG } from "./config"

function gaussianRandom(): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function generateNodePosition(): THREE.Vector3 {
  const t = Math.random()
  const x = (t - 0.5) * 100
  const spreadFactor = 0.5 + t * 0.5

  const angle = Math.random() * Math.PI * 2
  const gaussValue = Math.abs(gaussianRandom()) / 3
  const radiusBase = Math.min(gaussValue * 12, 12) * spreadFactor

  const y = Math.sin(angle) * radiusBase
  const z = Math.cos(angle) * radiusBase * 0.3

  return new THREE.Vector3(x, y, z)
}

function isValidNodePosition(position: THREE.Vector3, existingNodes: NetworkNode[]): boolean {
  for (const node of existingNodes) {
    if (node.position.distanceTo(position) < MESH_CONFIG.nodes.minDistance) {
      return false
    }
  }
  return true
}

export function generateNodes(nodesGroup: THREE.Group, isDarkMode: boolean): NetworkNode[] {
  const nodes: NetworkNode[] = []
  let attempts = 0

  while (nodes.length < MESH_CONFIG.nodes.targetCount && attempts < MESH_CONFIG.nodes.maxAttempts) {
    attempts++
    const position = generateNodePosition()

    if (isValidNodePosition(position, nodes)) {
      const geometry = new THREE.SphereGeometry(
        MESH_CONFIG.nodes.sphere.radius,
        MESH_CONFIG.nodes.sphere.widthSegments,
        MESH_CONFIG.nodes.sphere.heightSegments
      )

      const t = (position.x + 50) / 100
      const opacity = isDarkMode
        ? MESH_CONFIG.nodes.opacity.dark.base + t * MESH_CONFIG.nodes.opacity.dark.variation
        : MESH_CONFIG.nodes.opacity.light.base + t * MESH_CONFIG.nodes.opacity.light.variation

      const material = new THREE.MeshBasicMaterial({
        color: isDarkMode ? MESH_CONFIG.nodes.color.dark : MESH_CONFIG.nodes.color.light,
        transparent: true,
        opacity,
      })

      const nodeMesh = new THREE.Mesh(geometry, material)
      nodeMesh.position.copy(position)
      nodesGroup.add(nodeMesh)

      nodes.push({
        mesh: nodeMesh,
        position,
        connections: [],
        phase: Math.random() * Math.PI * 2,
      })
    }
  }

  return nodes
}

function getMaxConnectionsForNode(): number {
  const variation = Math.random()
  const config = MESH_CONFIG.performance.maxConnectionsVariation

  if (variation < config.hub.chance) return config.hub.connections
  if (variation < config.medium.chance) return config.medium.connections
  return config.default.connections
}

export function generateEdges(
  nodes: NetworkNode[],
  edgesGroup: THREE.Group,
  isDarkMode: boolean
): NetworkEdge[] {
  const edges: NetworkEdge[] = []
  const maxConnectionsPerNode = nodes.map(() => getMaxConnectionsForNode())

  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].connections.length >= maxConnectionsPerNode[i]) continue

    const potentialConnections = []

    for (let j = 0; j < nodes.length; j++) {
      if (i === j || nodes[j].connections.length >= maxConnectionsPerNode[j]) continue
      if (nodes[i].connections.includes(j)) continue

      const dist = nodes[i].position.distanceTo(nodes[j].position)
      if (dist < MESH_CONFIG.edges.maxDistance) {
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

    for (
      let c = 0;
      c < potentialConnections.length && connectedAngles.length < connectionsToMake;
      c++
    ) {
      const { index: j, angle } = potentialConnections[c]

      let goodAngle = connectedAngles.length === 0
      for (const existingAngle of connectedAngles) {
        const angleDiff = Math.abs(angle - existingAngle)
        if (
          angleDiff >= MESH_CONFIG.edges.minAngleSeparation &&
          angleDiff <= Math.PI * 2 - MESH_CONFIG.edges.minAngleSeparation
        ) {
          goodAngle = true
          break
        }
      }

      if (goodAngle) {
        connectedAngles.push(angle)

        const points = [nodes[i].position.clone(), nodes[j].position.clone()]
        const geometry = new THREE.BufferGeometry().setFromPoints(points)

        const t = (nodes[i].position.x + nodes[j].position.x) / 100
        const opacity = isDarkMode
          ? MESH_CONFIG.edges.opacity.dark.base + t * MESH_CONFIG.edges.opacity.dark.variation
          : MESH_CONFIG.edges.opacity.light.base + t * MESH_CONFIG.edges.opacity.light.variation

        const material = new THREE.LineBasicMaterial({
          color: isDarkMode ? MESH_CONFIG.edges.color.dark : MESH_CONFIG.edges.color.light,
          transparent: true,
          opacity,
        })

        const line = new THREE.Line(geometry, material)
        edgesGroup.add(line)

        edges.push({ line, startIdx: i, endIdx: j })
        nodes[i].connections.push(j)
        nodes[j].connections.push(i)
      }
    }
  }

  return edges
}
