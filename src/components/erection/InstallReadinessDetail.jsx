import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * Detailed install readiness display for WP detail page
 * Separates blocking reasons from warnings
 */
export default function InstallReadinessDetail({ wp }) {
  if (!wp) return null;

  const { install_ready, readiness_reason, readiness_cost_risk, install_ready_warnings, install_ready_warnings_severity } = wp;

  if (install_ready === undefined) return null;

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <Card className={install_ready ? 'border-green-900/30 bg-green-950/10' : 'border-red-900/30 bg-red-950/10'}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {install_ready ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-green-300">Install Ready</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-300">Not Install Ready</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {install_ready ? (
            <p className="text-sm text-green-200">This WP meets all blocking conditions and is safe for field installation.</p>
          ) : (
            <p className="text-sm text-red-200">Address blocking issues below before proceeding with installation.</p>
          )}
        </CardContent>
      </Card>

      {/* Blocking Reasons (Critical) */}
      {readiness_reason && readiness_reason.length > 0 && (
        <Card className="border-red-900/40 bg-red-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-red-300">Blocking Issues ({readiness_reason.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {readiness_reason.map((reason, idx) => (
              <div key={idx} className="flex gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                <p className="text-red-200">{reason}</p>
              </div>
            ))}
            {readiness_cost_risk > 0 && (
              <div className="mt-4 pt-3 border-t border-red-800/40 text-xs">
                <span className="text-red-400 font-semibold">Estimated Install Delay Cost: </span>
                <span className="text-red-200 font-bold">${readiness_cost_risk.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Warnings (Non-Blocking) */}
      {install_ready && install_ready_warnings && install_ready_warnings.length > 0 && (
        <Card className="border-amber-900/40 bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300">Non-Blocking Warnings ({install_ready_warnings.length})</span>
              <Badge className={`ml-auto ${
                install_ready_warnings_severity === 'caution' ? 'bg-red-700 text-red-100' :
                install_ready_warnings_severity === 'warning' ? 'bg-amber-700 text-amber-100' :
                'bg-blue-700 text-blue-100'
              }`}>
                {install_ready_warnings_severity}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {install_ready_warnings.map((warning, idx) => (
              <div key={idx} className="flex gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                <p className="text-amber-200">{warning}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Clear */}
      {install_ready && (!install_ready_warnings || install_ready_warnings.length === 0) && (
        <Card className="border-green-900/40 bg-green-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-2 items-center text-green-200 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p>All conditions met. No warnings. Field safe to install.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}