import type { Family, Piece, Stroke } from "./types"
import { createRng, hashSeed } from "./random"
import { createNoise } from "./noise"
import { chooseInkCount, chooseInks } from "./inks"
import { minuteId } from "./minute"
import { strokeLength } from "./geometry"
import { FAMILIES } from "./families"

const cache = new Map<number, Piece>()
const CACHE_LIMIT = 64

function chooseFamily(roll: number, families: readonly Family[]): Family {
  const totalWeight = families.reduce((sum, family) => sum + family.weight, 0)
  let remaining = roll * totalWeight
  for (const family of families) {
    remaining -= family.weight
    if (remaining <= 0) return family
  }
  return families[families.length - 1]
}

function sortByPen(strokes: Stroke[]): Stroke[] {
  return strokes
    .map((stroke, order) => ({ stroke, order }))
    .sort((a, b) => a.stroke.pen - b.stroke.pen || a.order - b.order)
    .map(({ stroke }) => stroke)
}

function remember(piece: Piece): Piece {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(piece.minute, piece)
  return piece
}

export function generatePiece(minute: number, families: readonly Family[] = FAMILIES): Piece {
  const cached = cache.get(minute)
  if (cached && families === FAMILIES) return cached

  const seed = hashSeed(minute)
  const rng = createRng(seed)
  const noise = createNoise(createRng(hashSeed(seed ^ 0x5bd1e995)))
  const inks = chooseInks(rng, chooseInkCount(rng))
  const family = chooseFamily(rng.next(), families)
  const strokes = sortByPen(family.generate({ rng, noise, penCount: inks.length }))
  const totalLength = strokes.reduce((sum, stroke) => sum + strokeLength(stroke), 0)

  const piece: Piece = {
    id: minuteId(minute),
    minute,
    seed,
    family: family.name,
    inks,
    strokes,
    totalLength,
  }
  return families === FAMILIES ? remember(piece) : piece
}
