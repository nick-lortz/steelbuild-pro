import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowLeftRight, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DrawingComparison({ 
  leftImage, 
  rightImage, 
  leftLabel = 'Original',
  rightLabel = 'Revised'
}) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState('split'); // split | overlay | sideBySide
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={viewMode === 'split' ? 'default' : 'ghost'}
                onClick={() => setViewMode('split')}
                className={cn(viewMode === 'split' && 'bg-amber-500 text-black')}
              >
                Split View
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'overlay' ? 'default' : 'ghost'}
                onClick={() => setViewMode('overlay')}
                className={cn(viewMode === 'overlay' && 'bg-amber-500 text-black')}
              >
                Overlay
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'sideBySide' ? 'default' : 'ghost'}
                onClick={() => setViewMode('sideBySide')}
                className={cn(viewMode === 'sideBySide' && 'bg-amber-500 text-black')}
              >
                Side by Side
              </Button>
            </div>

            {viewMode !== 'sideBySide' && (
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <span className="text-xs text-zinc-400 whitespace-nowrap">{leftLabel}</span>
                <Slider
                  value={[sliderPosition]}
                  onValueChange={([val]) => setSliderPosition(val)}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-zinc-400 whitespace-nowrap">{rightLabel}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison View */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardContent className="p-0">
          {viewMode === 'sideBySide' ? (
            // Side by Side
            <div className="grid grid-cols-2 gap-4 p-4">
              <div>
                <div className="text-xs font-bold text-zinc-400 uppercase mb-2">{leftLabel}</div>
                <img src={leftImage} alt={leftLabel} className="w-full border border-zinc-800 rounded" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-400 uppercase mb-2">{rightLabel}</div>
                <img src={rightImage} alt={rightLabel} className="w-full border border-zinc-800 rounded" />
              </div>
            </div>
          ) : viewMode === 'overlay' ? (
            // Overlay with opacity slider
            <div className="relative">
              <img src={leftImage} alt={leftLabel} className="w-full" />
              <img 
                src={rightImage} 
                alt={rightLabel} 
                className="absolute inset-0 w-full h-full"
                style={{ opacity: sliderPosition / 100 }}
              />
              <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
                <div className="bg-black/80 px-3 py-1 rounded text-xs font-bold text-white">
                  {leftLabel}
                </div>
                <div className="bg-black/80 px-3 py-1 rounded text-xs font-bold text-white">
                  {rightLabel}
                </div>
              </div>
            </div>
          ) : (
            // Split View
            <div
              ref={containerRef}
              className="relative overflow-hidden cursor-ew-resize select-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseUp}
            >
              {/* Left Image */}
              <img src={leftImage} alt={leftLabel} className="w-full" />
              
              {/* Right Image (clipped) */}
              <div
                className="absolute inset-0"
                style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
              >
                <img src={rightImage} alt={rightLabel} className="w-full h-full object-cover" />
              </div>

              {/* Slider Line */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-amber-500 cursor-ew-resize z-10"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={handleMouseDown}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                  <ArrowLeftRight size={16} className="text-black" />
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-4 left-4 bg-black/80 px-3 py-1 rounded text-xs font-bold text-white pointer-events-none">
                {leftLabel}
              </div>
              <div className="absolute top-4 right-4 bg-black/80 px-3 py-1 rounded text-xs font-bold text-white pointer-events-none">
                {rightLabel}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}