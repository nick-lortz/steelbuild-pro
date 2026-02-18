import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ApprovalGateQueue({ projectId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterEntity, setFilterEntity] = useState('all');
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['approval-decisions', projectId, filterStatus],
    queryFn: () => {
      const filter = { status: filterStatus };
      if (projectId) filter.project_id = projectId;
      return base44.entities.ApprovalGateDecision.filter(filter);
    },
    refetchInterval: 30000
  });

  const approveMutation = useMutation({
    mutationFn: ({ decision_id, action, reason, override_reason }) =>
      base44.functions.invoke('approveGateDecision', {
        decision_id,
        action,
        reason,
        override_reason
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-decisions'] });
      setSelectedDecision(null);
      setAction(null);
      setReason('');
    }
  });

  const filteredDecisions = decisions.filter(d => 
    filterEntity === 'all' || d.entity_type === filterEntity
  );

  const handleDecisionClick = (decision) => {
    setSelectedDecision(decision);
  };

  const handleAction = (actionType) => {
    setAction(actionType);
  };

  const handleSubmit = () => {
    if (!selectedDecision) return;
    
    approveMutation.mutate({
      decision_id: selectedDecision.id,
      action,
      reason: action === 'override' ? undefined : reason,
      override_reason: action === 'override' ? reason : undefined
    });
  };

  const getEntityLink = (entityType, entityId) => {
    const linkMap = {
      'RFI': () => navigate(createPageUrl('RFIHub')),
      'DetailImprovement': () => navigate(createPageUrl('FeedbackLoop')),
      'Delivery': () => navigate(createPageUrl('Deliveries'))
    };
    return linkMap[entityType] || null;
  };

  if (isLoading) {
    return <div className="text-zinc-500">Loading approvals...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="overridden">Overridden</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="RFI">RFI</SelectItem>
            <SelectItem value="DetailImprovement">Detail Improvement</SelectItem>
            <SelectItem value="Delivery">Delivery</SelectItem>
            <SelectItem value="ErectionSequence">Erection Sequence</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Decision List */}
      <div className="space-y-3">
        {filteredDecisions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock size={48} className="mx-auto mb-3 text-zinc-600" />
              <p className="text-zinc-500">No {filterStatus} approvals</p>
            </CardContent>
          </Card>
        ) : (
          filteredDecisions.map(decision => {
            const outputs = JSON.parse(decision.outputs_snapshot_json || '{}');
            const isPending = decision.status === 'pending';

            return (
              <Card 
                key={decision.id}
                className={cn(
                  "cursor-pointer hover:border-zinc-600 transition-colors",
                  isPending && "border-l-4 border-l-amber-500"
                )}
                onClick={() => handleDecisionClick(decision)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{decision.entity_type}</Badge>
                        <StatusBadge status={decision.status} />
                        {outputs.design_intent_change && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                            Design Intent
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-zinc-400">
                        <span>Requested by {decision.requested_by}</span>
                        <span>•</span>
                        <span>{format(new Date(decision.created_date), 'MMM d, yyyy h:mm a')}</span>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-red-400 font-medium">
                          ${outputs.predicted_cost_delta_usd?.toLocaleString() || 0}
                        </span>
                        <span className="text-amber-400">
                          {outputs.predicted_schedule_delta_hours || 0}h delay
                        </span>
                        {outputs.predicted_float_consumed_days > 0 && (
                          <span className="text-zinc-400">
                            {outputs.predicted_float_consumed_days}d float
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {isPending ? (
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleDecisionClick(decision); }}>
                          Review
                        </Button>
                      ) : (
                        <div className="text-xs text-zinc-500">
                          {decision.decided_by && `By ${decision.decided_by}`}
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          const linkFn = getEntityLink(decision.entity_type, decision.entity_id);
                          if (linkFn) linkFn();
                        }}
                      >
                        <ExternalLink size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Decision Detail Dialog */}
      {selectedDecision && (
        <Dialog open={!!selectedDecision} onOpenChange={() => setSelectedDecision(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Approval Decision</DialogTitle>
            </DialogHeader>

            <DecisionDetail 
              decision={selectedDecision} 
              action={action}
              reason={reason}
              onActionChange={handleAction}
              onReasonChange={setReason}
            />

            <DialogFooter>
              {selectedDecision.status === 'pending' && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedDecision(null)}>
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleAction('reject')}
                    disabled={action === 'reject' && !reason}
                  >
                    <XCircle size={16} className="mr-2" />
                    Reject
                  </Button>
                  <Button 
                    onClick={() => handleAction('approve')}
                    disabled={action === 'approve' && !reason}
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Approve
                  </Button>
                </div>
              )}
            </DialogFooter>

            {action && (
              <div className="mt-4 space-y-3">
                <Textarea
                  placeholder={action === 'override' ? 'Override reason (required)' : 'Decision reason (optional)'}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={handleSubmit}
                  disabled={approveMutation.isPending || (action === 'override' && !reason)}
                  className="w-full"
                >
                  Submit {action === 'override' ? 'Override' : action === 'approve' ? 'Approval' : 'Rejection'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    pending: { icon: Clock, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    approved: { icon: CheckCircle, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    rejected: { icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    overridden: { icon: AlertTriangle, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
  };

  const { icon: Icon, color } = config[status] || config.pending;

  return (
    <Badge className={color}>
      <Icon size={12} className="mr-1" />
      {status}
    </Badge>
  );
}

function DecisionDetail({ decision, action, reason, onActionChange, onReasonChange }) {
  const outputs = JSON.parse(decision.outputs_snapshot_json || '{}');
  const explain = decision.explain_json ? JSON.parse(decision.explain_json) : null;

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Cost Impact" value={`$${outputs.predicted_cost_delta_usd?.toLocaleString() || 0}`} />
        <MetricCard label="Schedule" value={`${outputs.predicted_schedule_delta_hours || 0}h`} />
        <MetricCard label="Float Consumed" value={`${outputs.predicted_float_consumed_days || 0}d`} />
        <MetricCard label="Rework Risk" value={`${Math.round((outputs.rework_probability || 0) * 100)}%`} />
      </div>

      {explain?.factors && (
        <div className="space-y-2">
          <div className="font-semibold text-sm">Contributing Factors</div>
          {explain.factors.map((f, i) => (
            <div key={i} className="text-sm p-2 rounded bg-zinc-900/50 flex justify-between">
              <span>{f.name}</span>
              <span className="text-red-400">${Math.round(f.contribution).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}