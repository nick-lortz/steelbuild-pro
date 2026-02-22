import React from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function InstallReadinessBadge({ wp }) {
  if (!wp) return null;

  const { install_ready, readiness_reason, readiness_cost_risk } = wp;

  if (install_ready === undefined) return null;

  return (
    <div className="space-y-2">
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        {install_ready ? (
          <Badge className="bg-green-900 text-green-200 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            🟢 INSTALL READY
          </Badge>
        ) : (
          <Badge className="bg-red-900 text-red-200 flex items-center gap-1">
            <XCircle className="w-4 h-4" />
            🔴 NOT READY
          </Badge>
        )}
      </div>

      {/* Blocking Reasons */}
      {!install_ready && readiness_reason && readiness_reason.length > 0 && (
        <Card className="border-red-900/30 bg-red-950/20">
          <CardContent className="pt-4">
            <div className="flex gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm font-semibold text-red-300">Blocking Reasons:</div>
            </div>
            <ul className="space-y-1 ml-6 text-xs text-red-200">
              {readiness_reason.map((reason, idx) => (
                <li key={idx}>• {reason}</li>
              ))}
            </ul>
            {readiness_cost_risk > 0 && (
              <div className="mt-3 pt-3 border-t border-red-800/50 text-xs">
                <span className="text-red-400 font-semibold">Est. Install Delay Cost: </span>
                <span className="text-red-200">${readiness_cost_risk.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Clear */}
      {install_ready && (
        <Card className="border-green-900/30 bg-green-950/20">
          <CardContent className="pt-4">
            <div className="flex gap-2 items-center text-green-200 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              All conditions met. Field safe to install.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}