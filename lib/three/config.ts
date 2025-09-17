export const MESH_CONFIG = {
  camera: {
    fov: 50,
    near: 0.1,
    far: 1000,
    position: { z: 20 },
  },
  nodes: {
    targetCount: 80,
    minDistance: 4,
    maxAttempts: 500,
    sphere: {
      radius: 0.05,
      widthSegments: 4,
      heightSegments: 4,
    },
    opacity: {
      light: { base: 0.08, variation: 0.04 },
      dark: { base: 0.04, variation: 0.02 },
    },
    color: {
      light: 0x475569,
      dark: 0x94a3b8,
    },
  },
  edges: {
    maxDistance: 16,
    minAngleSeparation: Math.PI / 6,
    opacity: {
      light: { base: 0.15, variation: 0.1 },
      dark: { base: 0.08, variation: 0.06 },
    },
    color: {
      light: 0x334155,
      dark: 0x64748b,
    },
  },
  animation: {
    timeStep: 0.0015,
    float: {
      speed: 0.5,
      amount: 0.4,
      yMultiplier: 1.2,
      zMultiplier: 0.5,
    },
    mouse: {
      influenceRange: 25,
      attractionStrength: 0.01,
      opacityBoost: 0.08,
      scaleBoost: 0.15,
      edgeOpacityBoost: 0.12,
    },
  },
  performance: {
    maxConnectionsVariation: {
      hub: { chance: 0.2, connections: 6 },
      medium: { chance: 0.5, connections: 5 },
      default: { connections: 4 },
    },
  },
} as const
