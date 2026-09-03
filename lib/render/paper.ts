import type { Ink } from "@/lib/gen/types"

export const PAPER = { light: "#f4f1ea", dark: "#0b0b0d" } as const

export type ThemeMode = "light" | "dark"

export function inkColour(ink: Ink, theme: ThemeMode): string {
  return theme === "dark" ? ink.dark : ink.light
}
