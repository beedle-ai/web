export interface Point {
  x: number
  y: number
}

export interface Stroke {
  pen: number
  points: Point[]
  width?: number
}

export interface Ink {
  name: string
  light: string
  dark: string
}

export type FamilyName =
  | "streams"
  | "strata"
  | "orbits"
  | "weave"
  | "attractor"
  | "partition"
  | "harmonograph"
  | "moire"

export interface Rng {
  next: () => number
  range: (min: number, max: number) => number
  int: (min: number, max: number) => number
  pick: <T>(items: readonly T[]) => T
  chance: (probability: number) => boolean
}

export interface Noise {
  at: (x: number, y: number) => number
  fbm: (x: number, y: number, octaves?: number) => number
}

export interface FamilyContext {
  rng: Rng
  noise: Noise
  penCount: number
}

export interface Family {
  name: FamilyName
  weight: number
  generate: (context: FamilyContext) => Stroke[]
}

export interface Piece {
  id: string
  minute: number
  seed: number
  family: FamilyName
  inks: Ink[]
  strokes: Stroke[]
  totalLength: number
}

export const SHEET_MARGIN = 0.06
export const DEFAULT_STROKE_WIDTH = 0.0012
