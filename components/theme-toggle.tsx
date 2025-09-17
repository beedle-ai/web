"use client"

import * as React from "react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className="group relative flex h-7 w-14 items-center rounded-full bg-gray-200/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-300/50 dark:border-gray-600/50 transition-all duration-300 hover:border-gray-400/70 dark:hover:border-gray-500/70"
      aria-label="Toggle theme"
    >
      <div
        className={`absolute h-5 w-5 rounded-full bg-white dark:bg-gray-900 shadow-sm transition-all duration-500 ${
          isDark ? 'translate-x-8' : 'translate-x-1'
        }`}
        style={{
          boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
        }}
      />

      <div className="absolute left-1.5 transition-all duration-300">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-gray-600 dark:text-gray-500 transition-opacity duration-300 ${
            isDark ? 'opacity-50' : 'opacity-100'
          }`}
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </div>

      <div className="absolute right-1.5 transition-all duration-300">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-gray-500 dark:text-gray-400 transition-opacity duration-300 ${
            isDark ? 'opacity-100' : 'opacity-50'
          }`}
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </div>

      <div
        className="absolute -inset-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(148, 163, 184, 0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(71, 85, 105, 0.15) 0%, transparent 70%)'
        }}
      />
    </button>
  )
}