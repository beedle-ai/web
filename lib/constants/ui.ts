export const UI_CONSTANTS = {
  MOBILE_BREAKPOINT: 768,
  TOUCH_TARGET_MIN_SIZE: 44, // WCAG 2.1 recommendation
  ANIMATION_DURATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
  },
  Z_INDEX: {
    BACKGROUND: 0,
    CONTENT: 10,
    OVERLAY: 40,
    MODAL: 50,
    TOOLTIP: 60,
  },
} as const

export const RESPONSIVE_SIZES = {
  text: {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl",
    "5xl": "text-5xl",
  },
  spacing: {
    mobile: {
      padding: "p-4",
      margin: "m-4",
      gap: "gap-3",
    },
    desktop: {
      padding: "p-6",
      margin: "m-6",
      gap: "gap-4",
    },
  },
} as const

export const WEATHER_DISPLAY_NAMES: Record<string, string> = {
  clear: "Clear",
  clouds: "Cloudy",
  rain: "Rainy",
  snow: "Snowy",
  fog: "Foggy",
  storm: "Stormy",
} as const

export const ACCESSIBILITY = {
  ARIA_LIVE: {
    POLITE: "polite" as const,
    ASSERTIVE: "assertive" as const,
    OFF: "off" as const,
  },
  ROLES: {
    BUTTON: "button",
    SWITCH: "switch",
    SLIDER: "slider",
    COMBOBOX: "combobox",
    ALERT: "alert",
    STATUS: "status",
  },
} as const
