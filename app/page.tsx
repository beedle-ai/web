"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { WireframeMesh } from "@/components/wireframe-mesh";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

export default function Home() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHoveringText, setIsHoveringText] = useState(false);
  const [isHoveringLogo, setIsHoveringLogo] = useState(false);
  const textRef = useRef<HTMLHeadingElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const activeRef = isHoveringLogo ? logoRef.current : textRef.current;
      if (activeRef) {
        const rect = activeRef.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
        const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
        const x = (clientX - rect.left - rect.width / 2) / rect.width;
        const y = (clientY - rect.top - rect.height / 2) / rect.height;
        setMousePos({ x, y });
      }
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchstart', handlePointerMove);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchstart', handlePointerMove);
    };
  }, [isHoveringLogo]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 transition-colors duration-500">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(125deg,transparent_25%,rgba(148,163,184,0.04)_40%,transparent_65%)] dark:bg-[linear-gradient(125deg,transparent_25%,rgba(148,163,184,0.025)_40%,transparent_65%)]" />

        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[140vh] w-[140vw] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(148,163,184,0.06),transparent_50%)] dark:bg-[radial-gradient(50%_50%_at_50%_50%,rgba(203,213,225,0.04),transparent_50%)] animate-breathe" />
        </div>

        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(148,163,184,0.05) 25%, rgba(148,163,184,0.05) 26%, transparent 27%, transparent 74%, rgba(148,163,184,0.05) 75%, rgba(148,163,184,0.05) 76%, transparent 77%, transparent),
                             linear-gradient(90deg, transparent 24%, rgba(148,163,184,0.05) 25%, rgba(148,163,184,0.05) 26%, transparent 27%, transparent 74%, rgba(148,163,184,0.05) 75%, rgba(148,163,184,0.05) 76%, transparent 77%, transparent)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <WireframeMesh />

      <div className="absolute inset-0 opacity-[0.008] dark:opacity-[0.01] bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noiseFilter%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.9%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noiseFilter)%22%2F%3E%3C%2Fsvg%3E')]" />


      <div className="relative flex min-h-screen items-center justify-center px-4">
        <main className="relative z-10 text-center">
          <h1
            ref={textRef}
            className="mb-12 text-7xl font-semibold tracking-tight sm:text-8xl lg:text-9xl select-none cursor-default"
            onMouseEnter={() => setIsHoveringText(true)}
            onMouseLeave={() => setIsHoveringText(false)}
            onTouchStart={() => setIsHoveringText(true)}
            onTouchEnd={() => setIsHoveringText(false)}
            style={{
              transform: isHoveringText
                ? `perspective(1000px) rotateX(${-mousePos.y * 4}deg) rotateY(${mousePos.x * 6}deg) scale(1.02)`
                : `perspective(1000px) rotateX(${-mousePos.y * 1}deg) rotateY(${mousePos.x * 1.5}deg) scale(1)`,
              transition: 'transform 0.15s ease-out'
            }}
          >
            <span
              className="inline-block bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent relative"
              style={{
                filter: isHoveringText
                  ? `brightness(${1.15 + Math.abs(mousePos.x) * 0.05 + Math.abs(mousePos.y) * 0.05})`
                  : 'brightness(1)',
                transition: 'filter 0.3s ease-out'
              }}
            >
              beedle.ai
              {isHoveringText && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(200px circle at ${50 + mousePos.x * 10}% ${50 + mousePos.y * 10}%,
                      rgba(148, 163, 184, 0.03) 0%,
                      transparent 40%)`,
                    filter: 'blur(20px)'
                  }}
                />
              )}
            </span>
          </h1>

          <div
            ref={logoRef}
            className="mt-8 flex justify-center cursor-default"
            onMouseEnter={() => setIsHoveringLogo(true)}
            onMouseLeave={() => setIsHoveringLogo(false)}
            onTouchStart={() => setIsHoveringLogo(true)}
            onTouchEnd={() => setIsHoveringLogo(false)}
            style={{
              transform: isHoveringLogo
                ? `perspective(1000px) rotateX(${-mousePos.y * 4}deg) rotateY(${mousePos.x * 6}deg) scale(1.02)`
                : `perspective(1000px) rotateX(${-mousePos.y * 1}deg) rotateY(${mousePos.x * 1.5}deg) scale(1)`,
              transition: 'transform 0.15s ease-out'
            }}
          >
            <div
              className="relative w-32 h-28 sm:w-40 sm:h-36"
              style={{
                filter: isHoveringLogo
                  ? `brightness(${1.15 + Math.abs(mousePos.x) * 0.05 + Math.abs(mousePos.y) * 0.05})`
                  : 'brightness(1)',
                transition: 'filter 0.3s ease-out'
              }}
            >
              <Image
                src="/beedle_logo-white.svg"
                alt="Beedle Logo"
                fill
                className="object-contain opacity-90 dark:opacity-90 invert dark:invert-0"
              />
              {isHoveringLogo && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(200px circle at ${50 + mousePos.x * 10}% ${50 + mousePos.y * 10}%,
                      rgba(148, 163, 184, 0.03) 0%,
                      transparent 40%)`,
                    filter: 'blur(20px)'
                  }}
                />
              )}
            </div>
          </div>

          <div className="absolute inset-x-0 -inset-y-24 max-w-[650px] mx-auto -z-10">
            <div className="absolute top-[20%] left-[8%] h-1 w-1 rounded-full bg-slate-400/40 dark:bg-slate-400/20 animate-float opacity-60" />
            <div className="absolute top-[65%] left-[15%] h-0.5 w-0.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-float animation-delay-2000 opacity-30" />
            <div className="absolute top-[40%] left-[12%] h-0.75 w-0.75 rounded-full bg-gray-400 dark:bg-gray-500 animate-float animation-delay-4000 opacity-35" />

            <div className="absolute top-[30%] left-[25%] h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-500 animate-float animation-delay-1000 opacity-35" />
            <div className="absolute top-[55%] left-[30%] h-0.5 w-0.5 rounded-full bg-slate-400/40 dark:bg-slate-400/20 animate-float animation-delay-3000 opacity-40" />
            <div className="absolute top-[75%] left-[35%] h-0.75 w-0.75 rounded-full bg-gray-400 dark:bg-gray-500 animate-float opacity-40" />

            <div className="absolute top-[45%] left-[45%] h-0.5 w-0.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-float animation-delay-2000 opacity-25" />
            <div className="absolute top-[25%] left-[50%] h-1 w-1 rounded-full bg-slate-400/40 dark:bg-slate-400/20 animate-float opacity-45" />
            <div className="absolute top-[70%] right-[45%] h-0.75 w-0.75 rounded-full bg-gray-400 dark:bg-gray-500 animate-float animation-delay-1000 opacity-35" />

            <div className="absolute top-[35%] right-[35%] h-0.5 w-0.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-float animation-delay-3000 opacity-30" />
            <div className="absolute top-[60%] right-[30%] h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-500 animate-float animation-delay-4000 opacity-40" />
            <div className="absolute top-[50%] right-[25%] h-0.75 w-0.75 rounded-full bg-slate-400/40 dark:bg-slate-400/20 animate-float animation-delay-1000 opacity-50" />

            <div className="absolute top-[45%] right-[12%] h-0.5 w-0.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-float animation-delay-2000 opacity-30" />
            <div className="absolute top-[25%] right-[15%] h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-500 animate-float opacity-35" />
            <div className="absolute top-[68%] right-[8%] h-0.75 w-0.75 rounded-full bg-slate-400/40 dark:bg-slate-400/20 animate-float animation-delay-3000 opacity-45" />
          </div>
        </main>
      </div>
    </div>
  );
}
