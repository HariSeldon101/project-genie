'use client'

/**
 * Error Boundary Component
 *
 * CLAUDE.md Compliance:
 * - NO graceful degradation - errors are shown
 * - NO fallback UI that hides problems
 * - Real errors visible for debugging
 * - Reports errors to server endpoint
 *
 * This component catches React component errors and:
 * 1. Displays them to the user (for debugging)
 * 2. Reports them to our logging endpoint
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackComponent?: React.ComponentType<{ error: Error; errorInfo: ErrorInfo }>
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state to show error UI
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for immediate visibility
    console.error('ErrorBoundary caught:', error, errorInfo)

    // Update state with error info
    this.setState({
      error,
      errorInfo
    })

    // Report to server-side logging endpoint
    this.reportError(error, errorInfo)
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      // Send error to our logging API endpoint
      await fetch('/api/logs/client-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          category: 'REACT_ERROR_BOUNDARY',
          errorName: error.name,
          url: window.location.href,
          userAgent: navigator.userAgent,
          metadata: {
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            // Include any React-specific error details
            digest: (error as any).digest || undefined
          }
        })
      })
    } catch (reportingError) {
      // If reporting fails, log it but don't throw
      // We don't want reporting failures to break the error UI
      console.error('Failed to report error to server:', reportingError)
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // If a custom fallback component is provided, use it
      if (this.props.fallbackComponent) {
        const FallbackComponent = this.props.fallbackComponent
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo!}
          />
        )
      }

      // Default error UI - SHOWS the error, doesn't hide it
      // CLAUDE.md: We need real errors to test the application
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                  Component Error
                </h2>

                <p className="text-red-800 dark:text-red-200 mb-4">
                  An error occurred in this component. This error has been logged for debugging.
                </p>

                {/* Show the actual error message - NO hiding */}
                <div className="bg-red-100 dark:bg-red-900/30 rounded p-3 mb-4">
                  <p className="font-mono text-sm text-red-900 dark:text-red-100">
                    {this.state.error.message}
                  </p>
                </div>

                {/* In development, show the stack trace */}
                {process.env.NODE_ENV === 'development' && this.state.error.stack && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-red-700 dark:text-red-300 hover:underline">
                      Show stack trace
                    </summary>
                    <pre className="mt-2 p-3 bg-red-100 dark:bg-red-900/30 rounded text-xs overflow-auto max-h-64">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}

                {/* Component stack in development */}
                {process.env.NODE_ENV === 'development' && this.state.errorInfo?.componentStack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-red-700 dark:text-red-300 hover:underline">
                      Show component stack
                    </summary>
                    <pre className="mt-2 p-3 bg-red-100 dark:bg-red-900/30 rounded text-xs overflow-auto max-h-64">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // No error, render children normally
    return this.props.children
  }
}