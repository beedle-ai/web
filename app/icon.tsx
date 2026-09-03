import { ImageResponse } from "next/og"
import { PAPER } from "@/lib/render/paper"
import { INKS } from "@/lib/gen/inks"

export const size = { width: 64, height: 64 }
export const contentType = "image/png"

const vermilion = INKS.find((ink) => ink.name === "vermilion")

export default function Icon() {
  const line = vermilion?.dark ?? "#ff7452"

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: PAPER.dark,
        }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64">
          <line
            x1="14"
            y1="50"
            x2="50"
            y2="14"
            stroke={line}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
