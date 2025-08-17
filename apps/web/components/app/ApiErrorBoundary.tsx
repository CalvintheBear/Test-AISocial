'use client'

import * as React from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

interface ApiErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ApiErrorBoundaryState {
  hasError: boolean
  error: Error | null
  statusCode?: number
  message?: string
}

export class ApiErrorBoundary extends React.Component<ApiErrorBoundaryProps, ApiErrorBoundaryState> {
  constructor(props: ApiErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): ApiErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error) {
    console.error('API Error caught:', error)
    
    // Extract status code and message from API error
    const isApiError = error.message?.includes('status:')
    if (isApiError) {
      const match = error.message.match(/status:\s*(\d+)/)
      const statusCode = match ? parseInt(match[1]) : 500
      
      this.setState({
        statusCode,
        message: this.getErrorMessage(statusCode),
      })
    }
  }

  getErrorMessage(statusCode: number): string {
    switch (statusCode) {
      case 401:
        return 'Authentication required. Please sign in to continue.'
      case 403:
        return 'You don\'t have permission to access this content.'
      case 404:
        return 'The requested content could not be found.'
      case 429:
        return 'Too many requests. Please try again later.'
      case 500:
      default:
        return 'Something went wrong while loading the content.'
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      statusCode: undefined,
      message: undefined,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 text-destructive">
                <AlertCircle className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {this.state.statusCode === 404 ? 'Not Found' : 'Oops! Something went wrong'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {this.state.message || 'An unexpected error occurred'}
              </p>
            </CardHeader>
            
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                {this.state.statusCode === 401 
                  ? 'Please sign in to access this content'
                  : 'We\'re working to fix this issue. Please try again.'
                }
              </p>
            </CardContent>
            
            <CardFooter className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={this.handleRetry}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => window.location.href = '/'}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook-based API error handler
export function useApiErrorHandler() {
  const [error, setError] = React.useState<{
    message: string
    statusCode?: number
  } | null>(null)

  const handleApiError = React.useCallback((error: any) => {
    const statusCode = error?.response?.status || error?.status || 500
    const message = error?.response?.data?.message || error?.message || 'An unexpected error occurred'
    
    setError({
      message,
      statusCode,
    })
  }, [])

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  return {
    error,
    handleApiError,
    resetError,
  }
}