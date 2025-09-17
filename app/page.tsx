"use client"

import { useRef } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { WireframeMesh } from '@/components/wireframe-mesh'
import { BackgroundLayers } from '@/components/background-layers'
import { AnimatedParticles } from '@/components/animated-particles'
import { InteractiveTitle } from '@/components/interactive-title'
import { InteractiveLogo } from '@/components/interactive-logo'
import { useMousePerspective } from '@/lib/hooks/use-mouse-perspective'
import { useHoverState } from '@/lib/hooks/use-hover-state'

export default function Home() {
  const textRef = useRef<HTMLHeadingElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)

  const { isHovering: isHoveringText, hoverHandlers: textHoverHandlers } = useHoverState()
  const { isHovering: isHoveringLogo, hoverHandlers: logoHoverHandlers } = useHoverState()

  const { mousePos: textMousePos, perspectiveStyle: textPerspectiveStyle } = useMousePerspective(
    textRef,
    isHoveringText
  )

  const { mousePos: logoMousePos, perspectiveStyle: logoPerspectiveStyle } = useMousePerspective(
    logoRef,
    isHoveringLogo
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 transition-colors duration-500">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <BackgroundLayers />
      <WireframeMesh />

      <div className="relative flex min-h-screen items-center justify-center px-4">
        <main className="relative z-10 text-center">
          <InteractiveTitle
            ref={textRef}
            isHovering={isHoveringText}
            mousePos={textMousePos}
            hoverHandlers={textHoverHandlers}
            perspectiveStyle={textPerspectiveStyle}
          />

          <InteractiveLogo
            ref={logoRef}
            isHovering={isHoveringLogo}
            mousePos={logoMousePos}
            hoverHandlers={logoHoverHandlers}
            perspectiveStyle={logoPerspectiveStyle}
          />

          <AnimatedParticles />
        </main>
      </div>
    </div>
  )
}