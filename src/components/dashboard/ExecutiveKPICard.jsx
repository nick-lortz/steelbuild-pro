import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';

export default function ExecutiveKPICard({ 
  icon: Icon, 
  label, 
  value, 
  subtitle, 
  trend,
  color = "blue",
  onClick 
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-green-500/10 text-green-400",
    amber: "bg-amber-500/10 text-amber-400",
    red: "bg-red-500/10 text-red-400",
    purple: "bg-purple-500/10 text-purple-400",
    zinc: "bg-zinc-500/10 text-zinc-500"
  };

  return (
    <Card 
      className={cn(
        "bg-card border-border card-elevated transition-smooth",
        onClick && "cursor-pointer hover:border-primary/30 hover:shadow-lg"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorClasses[color])}>
            <Icon size={20} />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-semibold text-foreground tabular-nums">
            {value}
          </div>
          {trend && (
            <div className={cn(
              "text-xs font-medium",
              trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-muted-foreground"
            )}>
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-2">
            {subtitle}
          </div>
        )}
      </CardContent>
    </Card>
  );
}