import React from 'react';
import { AlertCircle, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ExecutionPermissionBanner({ 
  permission, 
  assessment, 
  onOverride 
}) {
  if (!permission || permission.permission_status === 'RELEASED') {
    return null;
  }

  const statusConfig = {
    BLOCKED: {
      icon: Lock,
      color: 'destructive',
      bgClass: 'bg-red-950/40 border-red-800',
      textClass: 'text-red-200',
      title: '🚫 Execution Blocked: Margin At Risk'
    },
    PM_APPROVAL_REQUIRED: {
      icon: AlertTriangle,
      color: 'warning',
      bgClass: 'bg-amber-950/40 border-amber-800',
      textClass: 'text-amber-200',
      title: '⚠️ PM Approval Required'
    },
    ENGINEER_REVIEW_REQUIRED: {
      icon: AlertCircle,
      color: 'warning',
      bgClass: 'bg-orange-950/40 border-orange-800',
      textClass: 'text-orange-200',
      title: '⚡ Engineer Review Required'
    }
  };

  const config = statusConfig[permission.permission_status] || statusConfig.BLOCKED;
  const Icon = config.icon;

  return (
    <Alert className={cn(
      'mb-6 border-2',
      config.bgClass
    )}>
      <Icon className="h-5 w-5" />
      <AlertTitle className={cn('text-lg font-bold', config.textClass)}>
        {config.title}
      </AlertTitle>
      <AlertDescription className="space-y-4 mt-3">
        <div>
          <p className="text-sm mb-2">{permission.blocking_reason}</p>
        </div>

        {assessment && (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="outline" className="text-xs">
                Risk Score: {assessment.risk_score}
              </Badge>
              <Badge variant={
                assessment.risk_level === 'CRITICAL' ? 'destructive' :
                assessment.risk_level === 'HIGH' ? 'warning' :
                'secondary'
              }>
                {assessment.risk_level}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Margin at Risk: ${assessment.margin_at_risk?.toLocaleString() || 0}
              </Badge>
              <Badge variant="outline" className="text-xs">
                ECC Impact: ${assessment.ecc_impact_estimate?.toLocaleString() || 0}
              </Badge>
            </div>

            {assessment.drivers && assessment.drivers.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold mb-1.5 text-muted-foreground">Risk Drivers:</p>
                <div className="flex flex-wrap gap-1.5">
                  {assessment.drivers.map((driver, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {driver}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 p-3 bg-background/50 rounded-md border border-border">
              <p className="text-xs font-semibold mb-1">Recommended Action:</p>
              <p className="text-sm font-mono">{assessment.recommended_action}</p>
            </div>
          </>
        )}

        {onOverride && permission.permission_status !== 'ENGINEER_REVIEW_REQUIRED' && (
          <div className="mt-4 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={onOverride}
              className="w-full sm:w-auto"
            >
              PM Override & Release
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}