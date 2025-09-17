export const ANIMATION_CONFIG = {
  perspective: {
    default: {
      rotationX: 1,
      rotationY: 1.5
    },
    hover: {
      rotationX: 4,
      rotationY: 6,
      scale: 1.02
    }
  },
  brightness: {
    base: 1.15,
    mouseInfluence: 0.05
  },
  glow: {
    radius: 200,
    opacity: 0.03,
    blur: 20
  },
  particles: {
    count: 15,
    animationDelays: [0, 1000, 2000, 3000, 4000]
  }
} as const

export const GRADIENT_CONFIG = {
  background: {
    lightMode: {
      from: 'from-gray-50',
      to: 'to-white'
    },
    darkMode: {
      from: 'dark:from-gray-950',
      to: 'dark:to-gray-900'
    }
  },
  mesh: {
    size: '60px 60px'
  }
} as const