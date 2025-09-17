"use client"

import { memo } from 'react'

const GRADIENT_CLASSES = {
  baseLayer: 'absolute inset-0 bg-[linear-gradient(125deg,transparent_25%,rgba(148,163,184,0.04)_40%,transparent_65%)] dark:bg-[linear-gradient(125deg,transparent_25%,rgba(148,163,184,0.025)_40%,transparent_65%)]',
  breathingGlow: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[140vh] w-[140vw] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(148,163,184,0.06),transparent_50%)] dark:bg-[radial-gradient(50%_50%_at_50%_50%,rgba(203,213,225,0.04),transparent_50%)] animate-breathe'
} as const

const MESH_OVERLAY_STYLE = {
  backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(148,163,184,0.05) 25%, rgba(148,163,184,0.05) 26%, transparent 27%, transparent 74%, rgba(148,163,184,0.05) 75%, rgba(148,163,184,0.05) 76%, transparent 77%, transparent),
                   linear-gradient(90deg, transparent 24%, rgba(148,163,184,0.05) 25%, rgba(148,163,184,0.05) 26%, transparent 27%, transparent 74%, rgba(148,163,184,0.05) 75%, rgba(148,163,184,0.05) 76%, transparent 77%, transparent)`,
  backgroundSize: '60px 60px'
} as const

const NOISE_TEXTURE_DATA = "data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noiseFilter%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.9%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noiseFilter)%22%2F%3E%3C%2Fsvg%3E"

function BackgroundLayersComponent() {
  return (
    <>
      <div className="absolute inset-0">
        <div className={GRADIENT_CLASSES.baseLayer} />
        <div className="absolute inset-0">
          <div className={GRADIENT_CLASSES.breathingGlow} />
        </div>
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.015]"
          style={MESH_OVERLAY_STYLE}
        />
      </div>
      <div
        className="absolute inset-0 opacity-[0.008] dark:opacity-[0.01]"
        style={{ backgroundImage: `url('${NOISE_TEXTURE_DATA}')` }}
      />
    </>
  )
}

export const BackgroundLayers = memo(BackgroundLayersComponent)