import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** @type {{ env?: Record<string, any> }} */
const importMetaWithEnv = /** @type {any} */ (import.meta);

class ErrorBoundary extends React.Component {
  /** @param {any} props */
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Send to Sentry with global context
    import('@/components/providers/SentryProvider').then(({ captureSentryException }) => {
      const route = window.location.pathname;
      const projectId = localStorage.getItem('active_project_id');
      
      captureSentryException(error, {
        route: { path: route },
        project: projectId ? { project_id: projectId } : {},
        componentStack: errorInfo.componentStack,
      });
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card border border-destructive/20 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Something went wrong
            </h1>
            
            <p className="text-muted-foreground mb-6">
              The application encountered an unexpected error. Our team has been notified.
            </p>
            
            {importMetaWithEnv.env?.MODE === 'development' && this.state.error && (
              <details className="text-left mb-6 bg-muted p-4 rounded-md text-xs">
                <summary className="cursor-pointer font-medium mb-2">
                  Error Details (Dev Only)
                </summary>
                <pre className="whitespace-pre-wrap overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <Button 
              onClick={this.handleReset}
              className="gap-2"
            >
              <RefreshCw size={16} />
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;