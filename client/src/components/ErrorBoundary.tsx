import React, { Component, ErrorInfo, ReactNode } from 'react'
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl border-2 border-red-200/50 dark:border-red-800/50 shadow-xl shadow-red-500/10 p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
              <FaExclamationTriangle className="text-red-600 dark:text-red-400 text-4xl" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {this.state.error?.message || 'An unexpected error occurred. Please try reloading the page.'}
            </p>
            <button
              onClick={this.handleReload}
              className="btn-primary w-full"
            >
              <FaRedo className="text-sm" />
              Reload Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-40">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary


