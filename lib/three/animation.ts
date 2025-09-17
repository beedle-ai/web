import * as THREE from "three"
import type { NetworkNode, NetworkEdge, MousePosition } from "./types"
import { MESH_CONFIG } from "./config"

export function animateNodes(
  nodes: NetworkNode[],
  mouse: MousePosition,
  time: number,
  isDarkMode: boolean
): void {
  const config = MESH_CONFIG.animation

  nodes.forEach((node) => {
    const basePos = node.position

    const dx = mouse.worldX - basePos.x
    const dy = mouse.worldY - basePos.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    const influence = Math.max(0, 1 - distance / config.mouse.influenceRange)

    const attractX = influence * dx * config.mouse.attractionStrength
    const attractY = influence * dy * config.mouse.attractionStrength

    node.mesh.position.x =
      basePos.x +
      Math.sin(time * config.float.speed + node.phase + influence * 0.5) * config.float.amount +
      attractX

    node.mesh.position.y =
      basePos.y +
      Math.sin(time * config.float.speed * 1.3 + node.phase + influence * 0.5) *
        config.float.amount *
        config.float.yMultiplier +
      attractY

    node.mesh.position.z =
      basePos.z +
      Math.cos(time * config.float.speed * 0.7 + node.phase) *
        config.float.amount *
        config.float.zMultiplier

    if (node.mesh.material instanceof THREE.MeshBasicMaterial) {
      const t = (basePos.x + 45) / 90
      const baseOpacity = isDarkMode
        ? MESH_CONFIG.nodes.opacity.dark.base + t * MESH_CONFIG.nodes.opacity.dark.variation
        : MESH_CONFIG.nodes.opacity.light.base + t * MESH_CONFIG.nodes.opacity.light.variation

      node.mesh.material.opacity =
        baseOpacity + Math.sin(time * 2 + node.phase) * 0.02 + influence * config.mouse.opacityBoost

      const scale = 1 + influence * config.mouse.scaleBoost
      node.mesh.scale.set(scale, scale, scale)
    }
  })
}

export function animateEdges(
  edges: NetworkEdge[],
  nodes: NetworkNode[],
  mouse: MousePosition,
  time: number,
  isDarkMode: boolean
): void {
  const config = MESH_CONFIG.animation

  edges.forEach((edge) => {
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
    const dx = mouse.worldX - midX
    const dy = mouse.worldY - midY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const influence = Math.max(0, 1 - distance / 30)

    if (edge.line.material instanceof THREE.LineBasicMaterial) {
      const t = (nodes[edge.startIdx].position.x + nodes[edge.endIdx].position.x) / 90
      const baseOpacity = isDarkMode
        ? MESH_CONFIG.edges.opacity.dark.base + t * MESH_CONFIG.edges.opacity.dark.variation
        : MESH_CONFIG.edges.opacity.light.base + t * MESH_CONFIG.edges.opacity.light.variation

      edge.line.material.opacity =
        baseOpacity +
        Math.sin(time * 3 + edge.startIdx * 0.2) * 0.03 +
        influence * config.mouse.edgeOpacityBoost
    }
  })
}

export function handleMouseMove(
  event: MouseEvent | TouchEvent,
  camera: THREE.Camera,
  window: Window
): MousePosition {
  const clientX = "touches" in event ? (event.touches[0]?.clientX ?? 0) : event.clientX
  const clientY = "touches" in event ? (event.touches[0]?.clientY ?? 0) : event.clientY

  const x = (clientX / window.innerWidth) * 2 - 1
  const y = -(clientY / window.innerHeight) * 2 + 1

  const vector = new THREE.Vector3(x, y, 0)
  vector.unproject(camera)
  vector.sub(camera.position).normalize()
  const distance = -camera.position.z / vector.z
  const worldPos = camera.position.clone().add(vector.multiplyScalar(distance))

  return {
    x,
    y,
    worldX: worldPos.x,
    worldY: worldPos.y,
  }
}
