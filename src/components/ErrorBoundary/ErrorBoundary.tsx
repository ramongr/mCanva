/**
 * ErrorBoundary — catches rendering errors and displays a fallback UI.
 *
 * Wraps components that may throw during render (e.g., Canvas with Konva)
 * and provides graceful error handling with a retry option.
 */
import { Component, type ReactNode } from 'react'

export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode
  /** Optional custom fallback UI (defaults to built-in error message) */
  fallback?: ReactNode
  /** Called when an error is caught (for logging/reporting) */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary component that catches JavaScript errors in child components.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary onError={(err) => console.error(err)}>
 *   <Canvas width={800} height={600} />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to console for development
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    // Call optional error handler (for external logging/reporting)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div
          className="flex h-full flex-col items-center justify-center gap-4 bg-gray-50 p-8"
          role="alert"
          data-testid="error-boundary-fallback"
        >
          <div className="text-center">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Something went wrong
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              An error occurred while rendering the canvas.
              {this.state.error && (
                <span className="mt-2 block font-mono text-xs text-red-600">
                  {this.state.error.message}
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              data-testid="error-boundary-retry"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
