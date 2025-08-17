'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Report to error tracking service (if configured)
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="mx-auto h-12 w-12 text-destructive">
              <AlertCircle className="h-12 w-12" />
            </div>
            
            <h2 className="text-xl font-semibold text-foreground">
              Something went wrong
            </h2>
            
            <p className="text-muted-foreground">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 text-left">
                <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-32">
                  {this.state.error?.stack}
                </pre>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const ErrorBoundaryWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (error) {
      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="mx-auto h-12 w-12 text-destructive">
              <AlertCircle className="h-12 w-12" />
            </div>
            
            <h2 className="text-xl font-semibold text-foreground">
              Something went wrong
            </h2>
            
            <p className="text-muted-foreground">
              {error.message || 'An unexpected error occurred'}
            </p>
            
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={resetError}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return children
  }

  return {
    error,
    setError,
    resetError,
    ErrorBoundary: ErrorBoundaryWrapper,
  }
}