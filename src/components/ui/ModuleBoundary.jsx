import React from 'react';
import { captureSentryException } from '@/components/providers/SentryProvider';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Module-level error boundary for high-risk areas.
 * Captures errors with module context and sends to Sentry.
 */
export class ModuleBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const { module, route, entityContext } = this.props;
    
    // Report to Sentry with full context
    captureSentryException(error, {
      module: { name: module, route },
      entity: entityContext || {},
      componentStack: errorInfo.componentStack,
    });
    
    console.error(`[${module}] Error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { module } = this.props;
      
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#E5E7EB] mb-2">
              {module} Error
            </h3>
            <p className="text-sm text-[#9CA3AF] mb-6">
              An error occurred in the {module} module. The issue has been reported.
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}