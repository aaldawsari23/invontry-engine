import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorId: Math.random().toString(36).substr(2, 9)
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substr(2, 9)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: Math.random().toString(36).substr(2, 9)
    });
  };

  render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.handleRetry);
      }

      return (
        <ErrorFallback 
          error={this.state.error} 
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  errorId: string;
  onRetry: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, errorInfo, errorId, onRetry }) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const [reportSent, setReportSent] = React.useState(false);

  const handleReportError = async () => {
    try {
      // In a real app, you'd send this to your error reporting service
      console.log('Error report:', {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
      setReportSent(true);
    } catch (e) {
      console.error('Failed to report error:', e);
    }
  };

  const handleCopyError = () => {
    const errorText = `
Error ID: ${errorId}
Error: ${error.message}
Stack: ${error.stack}
Component Stack: ${errorInfo.componentStack}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      alert('Error details copied to clipboard');
    }).catch(() => {
      console.error('Failed to copy error details');
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-slate-800 border border-red-500/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-red-400">Something went wrong</h1>
              <p className="text-sm text-slate-400">Error ID: {errorId}</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-slate-300">
              We apologize for the inconvenience. The application encountered an unexpected error.
            </p>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h3 className="font-medium text-red-400 mb-2">Error Message</h3>
              <code className="text-sm text-red-300 break-all">{error.message}</code>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors font-medium"
              >
                🔄 Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                🔃 Reload Page
              </button>

              <button
                onClick={() => setShowDetails(!showDetails)}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                {showDetails ? '👁️ Hide Details' : '🔍 Show Details'}
              </button>

              <button
                onClick={handleCopyError}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                📋 Copy Error
              </button>

              {!reportSent ? (
                <button
                  onClick={handleReportError}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                >
                  📡 Report Error
                </button>
              ) : (
                <span className="px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-sm">
                  ✅ Error Reported
                </span>
              )}
            </div>

            {showDetails && (
              <div className="mt-6 space-y-4">
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <h4 className="font-medium text-slate-300 mb-2">Stack Trace</h4>
                  <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </div>

                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <h4 className="font-medium text-slate-300 mb-2">Component Stack</h4>
                  <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-700 text-sm text-slate-400">
              <h4 className="font-medium mb-2">What can you do?</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Try refreshing the page</li>
                <li>Clear your browser cache</li>
                <li>Try uploading a different file</li>
                <li>Contact support if the problem persists</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook for handling async errors
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, context?: string) => {
    console.error(`Error in ${context || 'unknown context'}:`, error);
    
    // You could integrate with error reporting services here
    // Example: Sentry.captureException(error, { tags: { context } });
  }, []);

  const handleAsyncError = React.useCallback(async (
    asyncFn: () => Promise<any>,
    context?: string,
    fallback?: any
  ) => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error as Error, context);
      return fallback;
    }
  }, [handleError]);

  return { handleError, handleAsyncError };
};

// Component for network error handling
export const NetworkErrorBoundary: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [hasNetworkError, setHasNetworkError] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setHasNetworkError(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setHasNetworkError(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (hasNetworkError || !isOnline) {
    return fallback || (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 m-4">
        <div className="flex items-center gap-2 text-yellow-400">
          <span>📡</span>
          <span className="font-medium">Network Issue</span>
        </div>
        <p className="text-sm text-slate-300 mt-1">
          {!isOnline 
            ? "You're currently offline. Some features may not work properly."
            : "Network connection issues detected. Please check your internet connection."
          }
        </p>
      </div>
    );
  }

  return <>{children}</>;
};