import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MetricCard({ title, value, type, trend, compact = false }) {
  const formatValue = () => {
    if (type === 'currency') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    if (type === 'percent') {
      return `${value.toFixed(1)}%`;
    }
    if (type === 'days') {
      return `${Math.round(value)} days`;
    }
    return value.toLocaleString();
  };

  return (
    <Card className="bg-zinc-800/50 border-zinc-700">
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="space-y-1">
          <p className={cn("text-zinc-400 font-medium", compact ? "text-xs" : "text-sm")}>
            {title}
          </p>
          <div className="flex items-baseline justify-between">
            <p className={cn("font-bold", compact ? "text-xl" : "text-2xl")}>
              {formatValue()}
            </p>
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-semibold",
                trend > 0 ? "text-green-400" : "text-red-400"
              )}>
                {trend > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {Math.abs(trend)}%
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}