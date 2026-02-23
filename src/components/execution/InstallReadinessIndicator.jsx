import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InstallReadinessIndicator({ score, recommendation, reasoning, size = 'default' }) {
  const getStatus = (score) => {
    if (score >= 90) return { label: 'Ready', color: 'emerald', icon: CheckCircle2 };
    if (score >= 70) return { label: 'Conditional', color: 'amber', icon: AlertTriangle };
    return { label: 'Blocked', color: 'red', icon: Shield };
  };

  const status = getStatus(score);
  const Icon = status.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    default: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <div className="flex items-center gap-2">
      <Badge 
        className={cn(
          `bg-${status.color}-500/20 text-${status.color}-400 border-${status.color}-500/30`,
          sizeClasses[size]
        )}
      >
        <Icon size={size === 'sm' ? 12 : 14} className="mr-1" />
        {status.label}
      </Badge>
      
      {size !== 'sm' && (
        <div className="flex items-center gap-1">
          <div className="w-20 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all",
                score >= 90 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400 font-mono">{score}</span>
        </div>
      )}

      {reasoning && size === 'lg' && (
        <span className="text-xs text-zinc-500 italic ml-2">{reasoning}</span>
      )}
    </div>
  );
}