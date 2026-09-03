import { NextResponse } from "next/server"
import { minuteIndexAt, parseMinuteId } from "@/lib/gen/minute"
import { generatePiece } from "@/lib/gen/piece"
import { pieceToSvg } from "@/lib/render/svg"

export const dynamic = "force-dynamic"

interface SvgRouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: SvgRouteParams) {
  const { id } = await params
  const minute = parseMinuteId(id)
  if (minute === null) return new NextResponse(null, { status: 404 })
  if (minute > minuteIndexAt(new Date())) return new NextResponse(null, { status: 404 })

  const piece = generatePiece(minute)
  const svg = pieceToSvg(piece)

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `attachment; filename="beedle-${id}.svg"`,
    },
  })
}
