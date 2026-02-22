/**
 * LAZY ROUTE WRAPPER
 * 
 * Provides consistent lazy loading behavior with Suspense fallback
 * for heavy dashboard pages.
 */

import React, { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function LazyRoute({ children }) {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      {children}
    </Suspense>
  );
}

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#0A0E13] p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-zinc-800 rounded mb-2" />
          <div className="h-4 w-96 bg-zinc-800/50 rounded" />
        </div>
        
        {/* KPI cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6 animate-pulse">
                <div className="h-4 w-24 bg-zinc-800 rounded mb-3" />
                <div className="h-8 w-32 bg-zinc-800 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Main content skeleton */}
        <Card>
          <CardContent className="p-6 animate-pulse space-y-4">
            <div className="h-4 w-full bg-zinc-800 rounded" />
            <div className="h-4 w-5/6 bg-zinc-800 rounded" />
            <div className="h-4 w-4/6 bg-zinc-800 rounded" />
            <div className="h-64 w-full bg-zinc-800/50 rounded mt-6" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}