import type { Noise, Rng } from "./types"

const GRADIENTS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

const SKEW = 0.5 * (Math.sqrt(3) - 1)
const UNSKEW = (3 - Math.sqrt(3)) / 6

function buildPermutation(rng: Rng): Uint8Array {
  const table = new Uint8Array(512)
  const base = Array.from({ length: 256 }, (_, index) => index)
  for (let index = base.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng.next() * (index + 1))
    ;[base[index], base[swap]] = [base[swap], base[index]]
  }
  for (let index = 0; index < 512; index += 1) {
    table[index] = base[index & 255]
  }
  return table
}

function corner(gradientIndex: number, x: number, y: number): number {
  const falloff = 0.5 - x * x - y * y
  if (falloff < 0) return 0
  const [gx, gy] = GRADIENTS[gradientIndex & 7]
  return falloff ** 4 * (gx * x + gy * y)
}

export function createNoise(rng: Rng): Noise {
  const perm = buildPermutation(rng)

  const at = (x: number, y: number): number => {
    const skew = (x + y) * SKEW
    const cellX = Math.floor(x + skew)
    const cellY = Math.floor(y + skew)
    const unskew = (cellX + cellY) * UNSKEW
    const x0 = x - (cellX - unskew)
    const y0 = y - (cellY - unskew)
    const upperTriangle = x0 > y0
    const offsetX = upperTriangle ? 1 : 0
    const offsetY = upperTriangle ? 0 : 1
    const x1 = x0 - offsetX + UNSKEW
    const y1 = y0 - offsetY + UNSKEW
    const x2 = x0 - 1 + 2 * UNSKEW
    const y2 = y0 - 1 + 2 * UNSKEW
    const wrappedX = cellX & 255
    const wrappedY = cellY & 255
    const g0 = perm[wrappedX + perm[wrappedY]]
    const g1 = perm[wrappedX + offsetX + perm[wrappedY + offsetY]]
    const g2 = perm[wrappedX + 1 + perm[wrappedY + 1]]
    return 70 * (corner(g0, x0, y0) + corner(g1, x1, y1) + corner(g2, x2, y2))
  }

  const fbm = (x: number, y: number, octaves = 4): number => {
    let amplitude = 0.5
    let frequency = 1
    let total = 0
    let normaliser = 0
    for (let octave = 0; octave < octaves; octave += 1) {
      total += amplitude * at(x * frequency, y * frequency)
      normaliser += amplitude
      amplitude *= 0.5
      frequency *= 2
    }
    return total / normaliser
  }

  return { at, fbm }
}
