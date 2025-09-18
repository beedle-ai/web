export const THREE_CONSTANTS = {
  PERFORMANCE: {
    NODE_COUNT: {
      LOW_END: 20,
      MOBILE: 40,
      DESKTOP: 80,
    },
    PIXEL_RATIO: {
      MAX_MOBILE: 2,
      MAX_DESKTOP: 3,
    },
    FPS_THRESHOLD: {
      LOW: 20,
      MEDIUM: 30,
      TARGET: 60,
    },
  },
  ANIMATION: {
    BASE_ROTATION: {
      X: 0.0001,
      Y: 0.001,
    },
    ENVIRONMENT_EFFECTS: {
      WIND: {
        MULTIPLIER: 0.2,
        STORM_BOOST: 2,
      },
      TEMPERATURE: {
        COLD_THRESHOLD: 10,
        HOT_THRESHOLD: 25,
        MULTIPLIER: 0.1,
      },
      WEATHER: {
        RAIN_SPEED: 0.5,
        SNOW_SPEED: 0.3,
        FOG_DENSITY: 0.02,
      },
    },
    WAVE: {
      BASE_AMPLITUDE: 0.005,
      FREQUENCY: 2,
      STORM_MULTIPLIER: 3,
    },
    TIME_OF_DAY: {
      ROTATION_FACTOR: 0.1 * Math.PI,
    },
  },
  FOG: {
    DENSITY: {
      CLEAR: 0.0005,
      CLOUDS: 0.001,
      RAIN: 0.002,
      SNOW: 0.0025,
      FOG: 0.004,
      STORM: 0.003,
    },
    NEAR: 1,
    FAR: 1000,
  },
  CAMERA: {
    FOV: 75,
    NEAR: 0.1,
    FAR: 1000,
    POSITION: { X: 0, Y: 0, Z: 30 },
  },
  COLORS: {
    DARK_THEME: {
      PRIMARY: 0x6b7280,
      SECONDARY: 0x9ca3af,
      BACKGROUND: 0x111827,
      FOG: 0x111827,
    },
    LIGHT_THEME: {
      PRIMARY: 0x9ca3af,
      SECONDARY: 0xd1d5db,
      BACKGROUND: 0xffffff,
      FOG: 0xf3f4f6,
    },
  },
} as const
