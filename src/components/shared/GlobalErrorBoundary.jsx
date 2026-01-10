import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Global Error:', error, errorInfo);
    
    // Track in performance monitor
    if (typeof window !== 'undefined' && window.performanceMonitor) {
      window.performanceMonitor.trackError(error, errorInfo);
    }

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Auto-reload after 3 consecutive errors to prevent infinite error loops
    if (this.state.errorCount >= 2) {
      console.warn('Multiple errors detected, forcing page reload...');
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="bg-zinc-900 border-2 border-red-500 rounded-lg p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              
              <h1 className="text-2xl font-bold text-white mb-2">
                Something Went Wrong
              </h1>
              
              <p className="text-zinc-400 mb-6">
                The application encountered an unexpected error. This has been logged for investigation.
              </p>

              {this.state.errorCount > 1 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 mb-6">
                  <p className="text-xs text-amber-400">
                    Multiple errors detected. Page will auto-reload in 3 seconds...
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={this.handleReload}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Application
                </Button>
                
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="w-full border-zinc-700 text-white hover:bg-zinc-800"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Return to Dashboard
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400 mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="bg-black rounded p-3 text-xs text-red-400 font-mono overflow-auto max-h-48">
                    <div className="mb-2 font-bold">{this.state.error.toString()}</div>
                    <div className="text-zinc-500 whitespace-pre-wrap">
                      {this.state.errorInfo?.componentStack}
                    </div>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;