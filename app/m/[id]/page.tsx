import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Hud } from "@/components/hud"
import { MinuteControls } from "@/components/minute-controls"
import { RevealStage } from "./reveal-stage"
import { formatMinuteUtc, minuteIndexAt, parseMinuteId } from "@/lib/gen/minute"
import { generatePiece } from "@/lib/gen/piece"
import type { Piece } from "@/lib/gen/types"

export const dynamic = "force-dynamic"

interface MinutePageProps {
  params: Promise<{ id: string }>
}

function describePiece(piece: Piece): string {
  return `${piece.family} · ${piece.inks.map((ink) => ink.name).join(", ")}`
}

export async function generateMetadata({ params }: MinutePageProps): Promise<Metadata> {
  const { id } = await params
  const minute = parseMinuteId(id)
  if (minute === null) return {}

  const title = `beedle.ai · ${formatMinuteUtc(minute)}`
  const isFuture = minute > minuteIndexAt(new Date())
  const description = isFuture ? "not yet drawn." : describePiece(generatePiece(minute))

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `/m/${id}/opengraph-image` }],
    },
  }
}

export default async function MinutePage({ params }: MinutePageProps) {
  const { id } = await params
  const minute = parseMinuteId(id)
  if (minute === null) notFound()

  const isFuture = minute > minuteIndexAt(new Date())
  const piece = isFuture ? null : generatePiece(minute)

  return (
    <div className="page">
      <Hud />
      <RevealStage piece={piece} minute={minute} />
      <MinuteControls minute={minute} progress={piece ? 1 : 0} />
    </div>
  )
}
