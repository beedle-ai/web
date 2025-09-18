"use client"

import React, { Component } from "react"
import type { ReactNode, ErrorInfo } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  isolate?: boolean
  componentName?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null
  private previousResetKeys: Array<string | number> = []

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, componentName } = this.props
    const errorCount = this.state.errorCount + 1

    console.error(`Error in ${componentName || "Component"}:`, error, errorInfo)

    this.setState({
      errorInfo,
      errorCount,
    })

    if (onError) {
      onError(error, errorInfo)
    }

    // Auto-recover after 3 errors to prevent infinite loops
    if (errorCount >= 3) {
      this.scheduleReset(5000)
    }
  }

  componentDidUpdate(_prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state

    if (hasError && resetOnPropsChange) {
      if (resetKeys && resetKeys.some((key, idx) => key !== this.previousResetKeys[idx])) {
        this.resetErrorBoundary()
      }
    }

    this.previousResetKeys = resetKeys || []
  }

  scheduleReset = (delay: number) => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary()
    }, delay)
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    })
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  render() {
    const { hasError, error, errorCount } = this.state
    const { children, fallback, isolate, componentName } = this.props

    if (hasError && error) {
      if (fallback) {
        return <>{fallback}</>
      }

      if (isolate) {
        // Minimal fallback for isolated components
        return (
          <div className="flex items-center justify-center p-4 text-gray-500 dark:text-gray-400">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span className="text-sm">Component unavailable</span>
          </div>
        )
      }

      // Full error display for critical components
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-6 max-w-md">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {componentName || "Component"} Error
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {error.message || "An unexpected error occurred"}
            </p>
            {process.env.NODE_ENV === "development" && (
              <details className="text-left mb-4">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                  Error details
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-32">
                  {error.stack}
                </pre>
              </details>
            )}
            <button
              onClick={this.resetErrorBoundary}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
              disabled={errorCount >= 3}
            >
              <RefreshCw className="w-4 h-4" />
              {errorCount >= 3 ? "Auto-recovering..." : "Try Again"}
            </button>
            {errorCount >= 3 && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Multiple errors detected. Auto-recovering in 5 seconds...
              </p>
            )}
          </div>
        </div>
      )
    }

    return children
  }
}

// Specialized error boundary for Three.js components
export function ThreeErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      componentName="3D Scene"
      isolate
      fallback={
        <div className="w-full h-full flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="text-center p-6">
            <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">3D visualization unavailable</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Your device may not support WebGL
            </p>
          </div>
        </div>
      }
      onError={(error) => {
        console.warn("Three.js component error:", error.message)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
