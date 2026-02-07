import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * MetricsBar - Standardized KPI metrics display section
 * 
 * @param {Array} metrics - Array of metric objects: { label, value, color, subtext }
 */
export default function MetricsBar({ metrics, className }) {
  return (
    <div className={cn(
      "border-b border-zinc-800/50 bg-zinc-950/50",
      className
    )}>
      <div className="max-w-[1800px] mx-auto px-8 py-4">
        <div className={cn(
          "grid gap-4",
          metrics.length <= 3 && "grid-cols-3",
          metrics.length === 4 && "grid-cols-4",
          metrics.length === 5 && "grid-cols-5",
          metrics.length >= 6 && "grid-cols-6"
        )}>
          {metrics.map((metric, idx) => (
            <Card 
              key={idx} 
              className={cn(
                "bg-zinc-900 border-zinc-800 rounded-lg",
                metric.accentColor && `bg-gradient-to-br ${metric.accentColor}`
              )}
            >
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                  {metric.icon && <metric.icon size={10} />}
                  {metric.label}
                </div>
                <div className={cn(
                  "text-3xl font-bold",
                  metric.color || "text-white"
                )}>
                  {metric.value}
                </div>
                {metric.subtext && (
                  <div className="text-[10px] text-zinc-600 mt-1">{metric.subtext}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}