import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ApprovalGateModal({ 
  isOpen, 
  onClose, 
  gateResult,
  onProceedAnyway,
  loading 
}) {
  if (!gateResult) return null;

  const { gate_required, blocked, matched_rule, risk_metrics, explanation } = gateResult;

  if (!gate_required) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-400" size={24} />
              <DialogTitle>Action Approved</DialogTitle>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-zinc-400">No approval gate triggered. You may proceed.</p>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-amber-400" size={24} />
            <DialogTitle>Approval Required</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rule Info */}
          <Alert className="border-amber-500/30 bg-amber-950/20">
            <AlertDescription>
              <div className="font-medium mb-1">{matched_rule?.name}</div>
              <div className="text-xs text-zinc-400">
                Requires approval from: {matched_rule?.required_approvers?.join(', ')}
              </div>
            </AlertDescription>
          </Alert>

          {/* Risk Metrics */}
          <div className="bg-zinc-900/50 rounded-lg p-4 space-y-3">
            <div className="font-semibold text-sm text-zinc-300 mb-3">Risk Assessment</div>
            
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                icon={DollarSign}
                label="Cost Impact"
                value={`$${risk_metrics?.predicted_cost_delta_usd?.toLocaleString() || 0}`}
                severity={risk_metrics?.predicted_cost_delta_usd > 2500 ? 'high' : 'medium'}
              />
              <MetricCard
                icon={Clock}
                label="Schedule Impact"
                value={`${risk_metrics?.predicted_schedule_delta_hours || 0}h`}
                severity={risk_metrics?.predicted_schedule_delta_hours > 8 ? 'high' : 'medium'}
              />
              <MetricCard
                icon={TrendingDown}
                label="Float Consumed"
                value={`${risk_metrics?.predicted_float_consumed_days || 0}d`}
                severity={risk_metrics?.predicted_float_consumed_days > 2 ? 'high' : 'low'}
              />
              <MetricCard
                icon={AlertTriangle}
                label="Rework Probability"
                value={`${Math.round((risk_metrics?.rework_probability || 0) * 100)}%`}
                severity={risk_metrics?.rework_probability > 0.6 ? 'high' : 'medium'}
              />
            </div>

            {risk_metrics?.design_intent_change && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  Design Intent Change Detected
                </Badge>
              </div>
            )}
          </div>

          {/* Explanation Factors */}
          {explanation?.factors && explanation.factors.length > 0 && (
            <div className="space-y-2">
              <div className="font-semibold text-sm text-zinc-300">Contributing Factors</div>
              <div className="space-y-2">
                {explanation.factors.map((factor, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg bg-zinc-900/30 border border-zinc-800"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{factor.name}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        Value: {factor.value} • Weight: {Math.round(factor.weight * 100)}%
                      </div>
                    </div>
                    <div className="text-sm font-bold text-red-400">
                      ${Math.round(factor.contribution).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confidence */}
          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <span>Analysis Confidence:</span>
            <Badge variant="outline" className="text-xs">
              {Math.round((risk_metrics?.confidence_score || 0) * 100)}%
            </Badge>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-zinc-500">
            This action is {blocked ? 'blocked' : 'flagged'} pending approval
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {onProceedAnyway && !blocked && (
              <Button variant="destructive" onClick={onProceedAnyway} disabled={loading}>
                Proceed Anyway
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({ icon: Icon, label, value, severity }) {
  const severityColors = {
    high: 'border-red-500/30 bg-red-950/20',
    medium: 'border-amber-500/30 bg-amber-950/20',
    low: 'border-zinc-700 bg-zinc-900/30'
  };

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      severityColors[severity] || severityColors.low
    )}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-zinc-400" />
        <div className="text-xs text-zinc-500">{label}</div>
      </div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}