import type { Ink, Rng } from "./types"

export const INKS: readonly Ink[] = [
  { name: "graphite", light: "#2a2a2e", dark: "#d9d9de" },
  { name: "indigo", light: "#22307a", dark: "#95a4ff" },
  { name: "vermilion", light: "#c9391f", dark: "#ff7452" },
  { name: "ochre", light: "#b4832a", dark: "#e6bd5e" },
  { name: "teal", light: "#1b6b69", dark: "#63d6d0" },
  { name: "violet", light: "#5d2f8c", dark: "#c493ff" },
  { name: "moss", light: "#4b6e2b", dark: "#a2d46f" },
  { name: "rose", light: "#b8446f", dark: "#ff92b9" },
  { name: "cobalt", light: "#2356c4", dark: "#6fa9ff" },
]

const STRUCTURAL_INKS = INKS.slice(0, 2)

export function chooseInkCount(rng: Rng): number {
  const roll = rng.next()
  if (roll < 0.22) return 1
  if (roll < 0.74) return 2
  return 3
}

export function chooseInks(rng: Rng, count: number): Ink[] {
  const chosen: Ink[] = []
  const leadWithStructural = rng.chance(0.6)
  if (leadWithStructural) chosen.push(rng.pick(STRUCTURAL_INKS))

  while (chosen.length < count) {
    const candidate = rng.pick(INKS)
    if (!chosen.includes(candidate)) chosen.push(candidate)
  }
  return chosen
}
