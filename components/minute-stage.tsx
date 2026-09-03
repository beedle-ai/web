import Link from "next/link"
import { InkDye } from "@/components/ink-dye"
import { MinuteNumerals } from "@/components/minute-numerals"
import { Sheet } from "@/components/sheet"
import { formatEdition, formatMinuteUtc, minuteId } from "@/lib/gen/minute"
import type { Piece } from "@/lib/gen/types"

interface OutgoingPiece {
  piece: Piece
  minute: number
}

interface MinuteStageProps {
  piece: Piece | null
  minute: number | null
  progress: number
  outgoing?: OutgoingPiece | null
  showPen?: boolean
}

function Annotation({ piece, minute }: { piece: Piece | null; minute: number }) {
  const stamp = formatMinuteUtc(minute).toLowerCase()
  if (!piece) return <p className="stage-annotation">{stamp}</p>
  return (
    <p className="stage-annotation">
      {stamp} · {piece.family} · {piece.inks.map((ink) => ink.name).join(", ")} ·{" "}
      <Link href={`/m/${minuteId(minute)}/svg?download=1`}>svg ↓</Link>
    </p>
  )
}

export function MinuteStage({
  piece,
  minute,
  progress,
  outgoing,
  showPen = true,
}: MinuteStageProps) {
  const waiting = minute === null

  return (
    <div className="stage">
      <InkDye piece={piece} />
      <div className="stage-sheet">
        <div className="stage-sheet-frame">
          <Sheet piece={piece} progress={progress} showPen={showPen && Boolean(piece)} />
          {outgoing ? (
            <div className="stage-sheet-outgoing" aria-hidden>
              <Sheet piece={outgoing.piece} progress={1} showPen={false} />
            </div>
          ) : null}
          {!piece && !waiting ? <p className="stage-blank-label">not yet drawn</p> : null}
        </div>
        {waiting ? null : <Annotation piece={piece} minute={minute} />}
        {waiting ? null : <p className="edition-note">No. {formatEdition(minute)}</p>}
      </div>
      {waiting ? null : (
        <div className="stage-numerals">
          <MinuteNumerals minute={minute} progress={piece ? progress : 0} />
        </div>
      )}
    </div>
  )
}
