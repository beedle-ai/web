import type { Family } from "../types"
import { streams } from "./streams"
import { strata } from "./strata"
import { orbits } from "./orbits"
import { weave } from "./weave"
import { attractor } from "./attractor"
import { partition } from "./partition"

export const FAMILIES: readonly Family[] = [streams, strata, orbits, weave, attractor, partition]
