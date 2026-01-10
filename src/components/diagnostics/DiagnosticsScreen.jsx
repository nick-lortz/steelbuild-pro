import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Smartphone, 
  Wifi, 
  Database, 
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { useNetworkStatus } from '@/components/shared/hooks/useNetworkStatus';

export default function DiagnosticsScreen() {
  const { isOnline } = useNetworkStatus();
  const [diagnostics, setDiagnostics] = useState(null);
  const [copying, setCopying] = useState(false);

  const collectDiagnostics = () => {
    const data = {
      timestamp: new Date().toISOString(),
      
      // App Info
      appVersion: process.env.VITE_APP_VERSION || '1.0.0',
      buildDate: process.env.VITE_BUILD_DATE || 'unknown',
      environment: import.meta.env.MODE,
      
      // Device Info
      device: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        hardwareConcurrency: navigator.hardwareConcurrency,
        maxTouchPoints: navigator.maxTouchPoints,
        vendor: navigator.vendor
      },
      
      // Screen Info
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
        orientation: window.screen.orientation?.type
      },
      
      // Network Info
      network: {
        online: navigator.onLine,
        effectiveType: navigator.connection?.effectiveType,
        downlink: navigator.connection?.downlink,
        rtt: navigator.connection?.rtt,
        saveData: navigator.connection?.saveData
      },
      
      // Memory Info (if available)
      memory: navigator.deviceMemory ? {
        deviceMemory: `${navigator.deviceMemory}GB`,
        jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit,
        totalJSHeapSize: performance.memory?.totalJSHeapSize,
        usedJSHeapSize: performance.memory?.usedJSHeapSize
      } : null,
      
      // Performance Metrics
      performance: {
        navigationTiming: performance.timing ? {
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
          domInteractive: performance.timing.domInteractive - performance.timing.navigationStart
        } : null,
        
        navigation: performance.getEntriesByType('navigation')[0] || null,
        
        resources: performance.getEntriesByType('resource')
          .filter(r => r.duration > 1000)
          .map(r => ({
            name: r.name.split('/').pop(),
            duration: Math.round(r.duration),
            size: r.transferSize
          }))
      },
      
      // App Performance Monitor (if available)
      appMetrics: window.performanceMonitor?.getReport() || null,
      
      // Storage Info
      storage: {
        localStorageAvailable: typeof localStorage !== 'undefined',
        sessionStorageAvailable: typeof sessionStorage !== 'undefined',
        indexedDBAvailable: typeof indexedDB !== 'undefined',
        localStorageSize: calculateStorageSize()
      },
      
      // Feature Support
      features: {
        serviceWorker: 'serviceWorker' in navigator,
        pushNotifications: 'PushManager' in window,
        geolocation: 'geolocation' in navigator,
        camera: 'mediaDevices' in navigator,
        webGL: detectWebGL(),
        webAssembly: typeof WebAssembly !== 'undefined'
      }
    };
    
    setDiagnostics(data);
    return data;
  };

  useEffect(() => {
    collectDiagnostics();
  }, []);

  const calculateStorageSize = () => {
    let total = 0;
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
      return `${(total / 1024).toFixed(2)} KB`;
    } catch (e) {
      return 'Unknown';
    }
  };

  const detectWebGL = () => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  };

  const copyToClipboard = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      toast.success('Diagnostics copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy diagnostics');
    }
    setCopying(false);
  };

  const downloadDiagnostics = () => {
    const blob = new Blob([JSON.stringify(diagnostics, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Diagnostics downloaded');
  };

  if (!diagnostics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  const StatusIcon = ({ condition }) => 
    condition ? 
    <CheckCircle2 className="w-4 h-4 text-green-500" /> : 
    <AlertCircle className="w-4 h-4 text-red-500" />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Diagnostics</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => collectDiagnostics()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            disabled={copying}
            className="gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadDiagnostics}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* System Status */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="w-5 h-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Network</span>
            <div className="flex items-center gap-2">
              <StatusIcon condition={isOnline} />
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Connection Quality</span>
            <Badge variant="outline">
              {diagnostics.network.effectiveType || 'Unknown'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">RTT</span>
            <span className="text-sm text-white font-mono">
              {diagnostics.network.rtt ? `${diagnostics.network.rtt}ms` : 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Device Info */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Smartphone className="w-5 h-5" />
            Device Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Platform</span>
            <span className="text-sm text-white">{diagnostics.device.platform}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Screen</span>
            <span className="text-sm text-white font-mono">
              {diagnostics.screen.width} × {diagnostics.screen.height}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Pixel Ratio</span>
            <span className="text-sm text-white font-mono">{diagnostics.screen.pixelRatio}x</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">CPU Cores</span>
            <span className="text-sm text-white">{diagnostics.device.hardwareConcurrency}</span>
          </div>
          {diagnostics.memory && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Device Memory</span>
              <span className="text-sm text-white">{diagnostics.memory.deviceMemory}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="w-5 h-5" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {diagnostics.performance.navigationTiming && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">DOM Interactive</span>
                <span className="text-sm text-white font-mono">
                  {diagnostics.performance.navigationTiming.domInteractive}ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">DOM Content Loaded</span>
                <span className="text-sm text-white font-mono">
                  {diagnostics.performance.navigationTiming.domContentLoaded}ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Load Complete</span>
                <span className="text-sm text-white font-mono">
                  {diagnostics.performance.navigationTiming.loadComplete}ms
                </span>
              </div>
            </>
          )}
          {diagnostics.performance.resources.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-zinc-500 mb-2">Slow Resources (&gt;1s)</div>
              <div className="space-y-1">
                {diagnostics.performance.resources.slice(0, 5).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 truncate max-w-[200px]">{r.name}</span>
                    <span className="text-red-400 font-mono">{r.duration}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Database className="w-5 h-5" />
            Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">LocalStorage</span>
            <div className="flex items-center gap-2">
              <StatusIcon condition={diagnostics.storage.localStorageAvailable} />
              <span className="text-sm text-white font-mono">{diagnostics.storage.localStorageSize}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">IndexedDB</span>
            <StatusIcon condition={diagnostics.storage.indexedDBAvailable} />
          </div>
        </CardContent>
      </Card>

      {/* Feature Support */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Feature Support</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(diagnostics.features).map(([key, supported]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-zinc-400 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <StatusIcon condition={supported} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* App Metrics */}
      {diagnostics.appMetrics && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">App Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {diagnostics.appMetrics.slowRenders?.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 mb-2">Components with &gt;10 renders</div>
                <div className="space-y-1">
                  {diagnostics.appMetrics.slowRenders.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">{r.name}</span>
                      <span className="text-amber-400 font-mono">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {diagnostics.appMetrics.slowInteractions?.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 mb-2">Slow Interactions (&gt;200ms)</div>
                <div className="space-y-1">
                  {diagnostics.appMetrics.slowInteractions.slice(0, 5).map((i, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">{i.name}</span>
                      <span className="text-red-400 font-mono">{i.duration}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {diagnostics.appMetrics.errors?.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 mb-2">Recent Errors</div>
                <div className="space-y-1">
                  {diagnostics.appMetrics.errors.slice(-5).map((e, i) => (
                    <div key={i} className="text-xs text-red-400 truncate">{e.error}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Build Info */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Build Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Version</span>
            <span className="text-sm text-white font-mono">{diagnostics.appVersion}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Environment</span>
            <Badge variant="outline">{diagnostics.environment}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Build Date</span>
            <span className="text-sm text-white font-mono">{diagnostics.buildDate}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}