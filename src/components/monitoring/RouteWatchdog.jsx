import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import rumMonitor from './RUMMonitor';

const PAINT_TIMEOUT = 1500; // 1.5s
const FAIL_TIMEOUT = 5000; // 5s

export function RouteWatchdog({ children }) {
  const location = useLocation();
  const [routeState, setRouteState] = useState('loading');
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const paintTimeoutRef = useRef(null);
  const failTimeoutRef = useRef(null);
  const routeStartTimeRef = useRef(Date.now());
  const previousRouteRef = useRef(location.pathname);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Track route change
    if (previousRouteRef.current !== location.pathname) {
      const duration = Date.now() - routeStartTimeRef.current;
      
      if (rumMonitor) {
        rumMonitor.trackRouteChange(
          previousRouteRef.current,
          location.pathname,
          duration
        );
      }
      
      previousRouteRef.current = location.pathname;
    }

    routeStartTimeRef.current = Date.now();
    setRouteState('loading');
    setError(null);

    // Clear existing timeouts
    if (paintTimeoutRef.current) clearTimeout(paintTimeoutRef.current);
    if (failTimeoutRef.current) clearTimeout(failTimeoutRef.current);

    // Set paint timeout (1.5s)
    paintTimeoutRef.current = setTimeout(() => {
      if (routeState === 'loading') {
        setRouteState('slow');
        // Silent - no console noise
      }
    }, PAINT_TIMEOUT);

    // Set fail timeout (5s)
    failTimeoutRef.current = setTimeout(() => {
      if (routeState !== 'ready') {
        setRouteState('failed');
        const err = {
          route: location.pathname,
          duration: Date.now() - routeStartTimeRef.current,
          online: navigator.onLine,
          lastError: window.lastError || 'Timeout',
          retryCount
        };
        setError(err);
        
        if (rumMonitor) {
          rumMonitor.trackError({
            message: 'Route load timeout',
            ...err
          });
        }

        // Auto-retry with backoff
        if (retryCount < 2) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 4000);
          setTimeout(() => {
            handleRetry();
          }, retryDelay);
        }
      }
    }, FAIL_TIMEOUT);

    // Assume ready when component tree renders
    const readyTimer = setTimeout(() => {
      setRouteState('ready');
      const loadTime = Date.now() - routeStartTimeRef.current;
      
      if (rumMonitor) {
        rumMonitor.trackPageLoad(location.pathname, {
          duration: loadTime,
          retries: retryCount
        });
      }
    }, 100);

    return () => {
      clearTimeout(paintTimeoutRef.current);
      clearTimeout(failTimeoutRef.current);
      clearTimeout(readyTimer);
    };
  }, [location.pathname]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setRouteState('loading');
    setError(null);
    window.location.reload();
  };

  const handleForceReload = () => {
    window.location.reload();
  };

  // Skeleton during slow load
  if (routeState === 'slow') {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-[1600px] mx-auto p-6">
          <div className="space-y-6 animate-pulse">
            <div className="h-12 bg-zinc-800 rounded w-1/3" />
            <div className="h-64 bg-zinc-800 rounded" />
            <div className="grid grid-cols-3 gap-6">
              <div className="h-32 bg-zinc-800 rounded" />
              <div className="h-32 bg-zinc-800 rounded" />
              <div className="h-32 bg-zinc-800 rounded" />
            </div>
          </div>
          
          <div className="fixed bottom-6 right-6">
            <Button
              onClick={handleForceReload}
              variant="outline"
              className="bg-zinc-900 border-amber-500 text-amber-500 hover:bg-zinc-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Force Reload
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error state with diagnostics
  if (routeState === 'failed') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-zinc-900 border-2 border-red-500 rounded-lg p-8">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            
            <h2 className="text-xl font-bold text-white mb-2 text-center">
              Page Load Failed
            </h2>
            
            <p className="text-zinc-400 text-sm text-center mb-6">
              Unable to load {location.pathname}
            </p>

            {/* Diagnostics */}
            <div className="bg-black rounded p-4 mb-6 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Network</span>
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <>
                      <Wifi className="w-3 h-3 text-green-500" />
                      <span className="text-green-500">Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-red-500" />
                      <span className="text-red-500">Offline</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Load Time</span>
                <span className="text-white font-mono">
                  {error?.duration ? `${error.duration}ms` : 'N/A'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Retry Count</span>
                <span className="text-white font-mono">{retryCount}</span>
              </div>

              {error?.lastError && (
                <div className="mt-3 pt-3 border-t border-zinc-800">
                  <span className="text-zinc-500">Last Error:</span>
                  <div className="text-red-400 font-mono text-[10px] mt-1 break-all">
                    {error.lastError}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry ({retryCount + 1}/3)
              </Button>
              
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="w-full border-zinc-700 text-white hover:bg-zinc-800"
              >
                Return to Dashboard
              </Button>
            </div>

            {retryCount >= 2 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => window.location.href = '/Diagnostics'}
                  className="text-xs text-zinc-500 hover:text-zinc-400 underline"
                >
                  View Full Diagnostics
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return children;
}