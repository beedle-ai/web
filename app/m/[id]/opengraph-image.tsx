import { ImageResponse } from "next/og"
import { notFound } from "next/navigation"
import { formatMinuteUtc, minuteIndexAt, parseMinuteId } from "@/lib/gen/minute"
import { generatePiece } from "@/lib/gen/piece"
import { pieceToSvg } from "@/lib/render/svg"
import { PAPER } from "@/lib/render/paper"
import type { Piece } from "@/lib/gen/types"

interface OpengraphImageParams {
  params: Promise<{ id: string }>
}

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const MAX_SVG_BYTES = 1_500_000
const FONT_CSS_URL = "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400&display=swap"

let fontPromise: Promise<ArrayBuffer | null> | null = null

async function fetchFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(FONT_CSS_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15" },
    }).then((response) => response.text())
    const match = /src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/.exec(css)
    if (!match) return null
    return await fetch(match[1]).then((response) => response.arrayBuffer())
  } catch {
    return null
  }
}

function loadFont(): Promise<ArrayBuffer | null> {
  fontPromise ??= fetchFont()
  return fontPromise
}

async function imageOptions() {
  const data = await loadFont()
  if (!data) return { ...size }
  return {
    ...size,
    fonts: [{ name: "Geist Mono", data, style: "normal" as const, weight: 400 as const }],
  }
}

function truncatedSvg(piece: Piece): string {
  const full = pieceToSvg(piece, { theme: "light" })
  if (full.length <= MAX_SVG_BYTES) return full

  let strokeCount = piece.strokes.length
  while (strokeCount > 0) {
    strokeCount = Math.floor(strokeCount * 0.75)
    const candidate = pieceToSvg(
      { ...piece, strokes: piece.strokes.slice(0, strokeCount) },
      { theme: "light" }
    )
    if (candidate.length <= MAX_SVG_BYTES) return candidate
  }
  return pieceToSvg({ ...piece, strokes: [] }, { theme: "light" })
}

export default async function OpengraphImage({ params }: OpengraphImageParams) {
  const { id } = await params
  const minute = parseMinuteId(id)
  if (minute === null) notFound()

  const isFuture = minute > minuteIndexAt(new Date())
  const timestamp = formatMinuteUtc(minute).toLowerCase()

  if (isFuture) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#dcd9d1",
            fontSize: 28,
            color: "#5b5852",
            fontFamily: "Geist Mono, monospace",
          }}
        >
          not yet drawn · {timestamp}
        </div>
      ),
      await imageOptions()
    )
  }

  const piece = generatePiece(minute)
  const svg = truncatedSvg(piece)
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
  const inkNames = piece.inks.map((ink) => ink.name).join(", ")

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#dcd9d1",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 480,
            height: 480,
            backgroundColor: PAPER.light,
            border: "1px solid rgba(0,0,0,0.14)",
          }}
        >
          <img src={dataUri} width={480} height={480} alt="" />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 60,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            fontSize: 20,
            color: "#5b5852",
            fontFamily: "Geist Mono, monospace",
          }}
        >
          <span>{timestamp}</span>
          <span>
            {piece.family} · {inkNames}
          </span>
        </div>
      </div>
    ),
    await imageOptions()
  )
}
