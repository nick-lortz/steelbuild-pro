import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PullToRefresh({ onRefresh, children, disabled = false }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const threshold = 80; // Pull threshold in pixels
  const maxPull = 120; // Maximum pull distance

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    let touchStartY = 0;
    let currentPullDistance = 0;

    const handleTouchStart = (e) => {
      // Only trigger if scrolled to top
      if (container.scrollTop === 0) {
        touchStartY = e.touches[0].clientY;
        startY.current = touchStartY;
      }
    };

    const handleTouchMove = (e) => {
      if (!touchStartY || refreshing) return;
      
      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartY;

      // Only pull down when at top of scroll
      if (distance > 0 && container.scrollTop === 0) {
        e.preventDefault();
        currentPullDistance = Math.min(distance, maxPull);
        setPullDistance(currentPullDistance);
        setPulling(currentPullDistance > threshold);
      }
    };

    const handleTouchEnd = async () => {
      if (!pulling || refreshing) {
        setPullDistance(0);
        setPulling(false);
        return;
      }

      if (pullDistance >= threshold) {
        setRefreshing(true);
        setPulling(false);
        setPullDistance(60); // Snap to refresh position
        
        try {
          await onRefresh();
        } finally {
          setTimeout(() => {
            setRefreshing(false);
            setPullDistance(0);
          }, 500);
        }
      } else {
        setPullDistance(0);
        setPulling(false);
      }

      touchStartY = 0;
      startY.current = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pulling, refreshing, pullDistance, threshold, onRefresh, disabled]);

  return (
    <div ref={containerRef} className="relative overflow-auto h-full">
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-50",
          pullDistance > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: `${pullDistance}px`,
          transform: `translateY(-${Math.max(0, 60 - pullDistance)}px)`
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <RefreshCw
            size={24}
            className={cn(
              "text-amber-500 transition-transform",
              refreshing && "animate-spin",
              pulling && !refreshing && "rotate-180"
            )}
          />
          <span className="text-xs text-muted-foreground">
            {refreshing ? "Refreshing..." : pulling ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${refreshing ? 60 : pullDistance}px)`
        }}
      >
        {children}
      </div>
    </div>
  );
}