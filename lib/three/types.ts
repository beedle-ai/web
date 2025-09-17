import type * as THREE from "three"

export interface NetworkNode {
  mesh: THREE.Mesh
  position: THREE.Vector3
  connections: number[]
  phase: number
}

export interface NetworkEdge {
  line: THREE.Line
  startIdx: number
  endIdx: number
}

export interface MousePosition {
  x: number
  y: number
  worldX: number
  worldY: number
}

export interface AnimationState {
  time: number
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  mouse: MousePosition
}
