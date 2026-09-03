import { NextResponse } from "next/server"
import { minuteIndexAt, parseMinuteId } from "@/lib/gen/minute"
import { generatePiece } from "@/lib/gen/piece"
import { pieceToSvg } from "@/lib/render/svg"

export const dynamic = "force-dynamic"

interface SvgRouteParams {
  params: Promise<{ id: string }>
}

const CACHE_CONTROL = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"

export async function GET(request: Request, { params }: SvgRouteParams) {
  const { id } = await params
  const minute = parseMinuteId(id)
  if (minute === null) return new NextResponse(null, { status: 404 })
  if (minute > minuteIndexAt(new Date())) return new NextResponse(null, { status: 404 })

  const query = new URL(request.url).searchParams
  const theme = query.get("theme") === "dark" ? "dark" : "light"
  const paper = query.get("paper") !== "0"
  const download = query.get("download") === "1"

  const svg = pieceToSvg(generatePiece(minute), { theme, paper })
  const headers: Record<string, string> = {
    "Content-Type": "image/svg+xml",
    "Cache-Control": CACHE_CONTROL,
  }
  if (download) headers["Content-Disposition"] = `attachment; filename="beedle-${id}.svg"`

  return new NextResponse(svg, { headers })
}
