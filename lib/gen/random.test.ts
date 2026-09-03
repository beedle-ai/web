import { describe, expect, it } from "vitest"
import { createRng, hashSeed } from "./random"
import { createNoise } from "./noise"

describe("rng", () => {
  it("is deterministic for a seed", () => {
    const a = createRng(hashSeed(42))
    const b = createRng(hashSeed(42))
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(
      Array.from({ length: 5 }, () => b.next())
    )
  })

  it("differs between adjacent seeds", () => {
    expect(createRng(hashSeed(1)).next()).not.toBe(createRng(hashSeed(2)).next())
  })

  it("stays within requested ranges", () => {
    const rng = createRng(hashSeed(7))
    for (let index = 0; index < 1000; index += 1) {
      const value = rng.int(3, 5)
      expect(value).toBeGreaterThanOrEqual(3)
      expect(value).toBeLessThanOrEqual(5)
    }
  })
})

describe("noise", () => {
  it("is deterministic, continuous and bounded", () => {
    const noise = createNoise(createRng(hashSeed(9)))
    const again = createNoise(createRng(hashSeed(9)))
    expect(noise.at(1.3, 2.7)).toBe(again.at(1.3, 2.7))
    expect(Math.abs(noise.at(1.3, 2.7) - noise.at(1.3001, 2.7))).toBeLessThan(0.01)
    for (let index = 0; index < 2000; index += 1) {
      const value = noise.fbm(index * 0.173, index * 0.091)
      expect(Math.abs(value)).toBeLessThanOrEqual(1)
    }
  })
})
