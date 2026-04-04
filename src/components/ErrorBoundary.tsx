import React, { Component, ReactNode, ErrorInfo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  context?: string;
}

/**
 * Error fallback component that displays when an error occurs
 */
function ErrorFallback({ error, resetErrorBoundary, context }: ErrorFallbackProps) {
  const handleReportError = () => {
    // In a real app, you'd send this to an error tracking service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Log to console for now (replace with actual error tracking service)
    console.error('Error Report:', errorReport);

    // You could integrate with Sentry, LogRocket, etc. here
    // Example: Sentry.captureException(error, { contexts: { context } });

    // Show feedback to user
    alert('Error report submitted. Thank you for your feedback!');
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
              <CardDescription className="mt-1">
                {context ? `An error occurred in ${context}` : 'An unexpected error occurred'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm font-medium text-foreground mb-2">Error Details:</p>
            <p className="text-sm text-muted-foreground font-mono break-all">
              {error.message || 'Unknown error'}
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && error.stack && (
            <details className="rounded-lg bg-muted p-4">
              <summary className="text-sm font-medium text-foreground cursor-pointer mb-2">
                Stack Trace (Development Only)
              </summary>
              <pre className="text-xs text-muted-foreground overflow-auto max-h-64 mt-2">
                {error.stack}
              </pre>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={resetErrorBoundary} className="flex-1" variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={handleGoHome} variant="outline" className="flex-1">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
            <Button onClick={handleReportError} variant="outline" className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              Report Error
            </Button>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          <p>If this problem persists, please contact support with the error details above.</p>
        </CardFooter>
      </Card>
    </div>
  );
}

interface AppErrorBoundaryProps {
  children: ReactNode;
  context?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

/**
 * App-level error boundary wrapper
 */
export function AppErrorBoundary({
  children,
  context,
  onError,
  fallback: Fallback = ErrorFallback,
}: AppErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // In production, you'd send this to an error tracking service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  };

  return (
    <ErrorBoundary
      FallbackComponent={(props) => <Fallback {...props} context={context} />}
      onError={handleError}
      onReset={() => {
        // Reset app state if needed
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Route-level error boundary (for specific route errors)
 */
export function RouteErrorBoundary({
  children,
  context,
}: {
  children: ReactNode;
  context?: string;
}) {
  return (
    <ErrorBoundary
      FallbackComponent={(props) => <ErrorFallback {...props} context={context} />}
      onError={(error, errorInfo) => {
        console.error(`Route error in ${context}:`, error, errorInfo);
        // Could route to error page instead of showing fallback
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
