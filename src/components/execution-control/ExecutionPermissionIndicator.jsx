import React from 'react';
import { Lock, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function ExecutionPermissionIndicator({ permission, compact = false }) {
  if (!permission) {
    return (
      <Badge variant="secondary" className="text-xs">
        <Clock className="w-3 h-3 mr-1" />
        Not Assessed
      </Badge>
    );
  }

  const statusConfig = {
    BLOCKED: {
      icon: Lock,
      label: 'Blocked',
      color: 'bg-red-500/20 text-red-300 border-red-500/40',
      iconColor: 'text-red-400'
    },
    PM_APPROVAL_REQUIRED: {
      icon: AlertTriangle,
      label: 'PM Review',
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      iconColor: 'text-amber-400'
    },
    ENGINEER_REVIEW_REQUIRED: {
      icon: AlertTriangle,
      label: 'Engineer Review',
      color: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      iconColor: 'text-orange-400'
    },
    RELEASED: {
      icon: CheckCircle2,
      label: 'Released',
      color: 'bg-green-500/20 text-green-300 border-green-500/40',
      iconColor: 'text-green-400'
    }
  };

  const config = statusConfig[permission.permission_status] || statusConfig.BLOCKED;
  const Icon = config.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={cn('text-xs border', config.color)}>
              <Icon className={cn('w-3 h-3 mr-1', config.iconColor)} />
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs">{permission.blocking_reason || 'No blocking reason'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium',
      config.color
    )}>
      <Icon className={cn('w-4 h-4', config.iconColor)} />
      <span>{config.label}</span>
      {permission.approved_by_user_id && (
        <span className="text-xs opacity-75 ml-1">
          (Overridden)
        </span>
      )}
    </div>
  );
}