import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle, User } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { format } from 'date-fns';

export default function ApprovalWorkflow({ improvement }) {
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const updates = {
        status: 'approved',
        approval_date: new Date().toISOString()
      };

      // Set appropriate approver field
      if (improvement.approval_threshold === 'detailing_lead_only') {
        updates.approved_by_detailing_lead = currentUser?.email;
      } else if (improvement.approval_threshold === 'requires_pm_approval') {
        updates.approved_by_pm = currentUser?.email;
      } else if (improvement.approval_threshold === 'requires_eor_review') {
        updates.approved_by_eor = currentUser?.email;
      }

      return base44.entities.DetailImprovement.update(improvement.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detail-improvements'] });
      toast.success('Improvement approved');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: () => base44.entities.DetailImprovement.update(improvement.id, {
      status: 'rejected',
      rejection_reason: rejectionReason
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detail-improvements'] });
      toast.success('Improvement rejected');
      setShowRejectForm(false);
    }
  });

  const canApprove = currentUser?.role === 'admin' || improvement.created_by !== currentUser?.email;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock size={16} className="text-amber-500" />
          Approval Workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Approval Path */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-400">Required Approvals</div>
          
          <div className="flex items-center gap-2 p-2 bg-zinc-800/50 border border-zinc-700 rounded">
            {improvement.approved_by_detailing_lead ? (
              <CheckCircle size={14} className="text-green-500" />
            ) : (
              <Clock size={14} className="text-amber-500" />
            )}
            <div className="flex-1">
              <div className="text-xs font-medium text-white">Detailing Lead</div>
              {improvement.approved_by_detailing_lead && (
                <div className="text-[10px] text-zinc-500">{improvement.approved_by_detailing_lead}</div>
              )}
            </div>
            {improvement.approved_by_detailing_lead && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                Approved
              </Badge>
            )}
          </div>

          {improvement.approval_threshold === 'requires_pm_approval' && (
            <div className="flex items-center gap-2 p-2 bg-zinc-800/50 border border-zinc-700 rounded">
              {improvement.approved_by_pm ? (
                <CheckCircle size={14} className="text-green-500" />
              ) : (
                <Clock size={14} className="text-amber-500" />
              )}
              <div className="flex-1">
                <div className="text-xs font-medium text-white">Project Manager</div>
                {improvement.approved_by_pm && (
                  <div className="text-[10px] text-zinc-500">{improvement.approved_by_pm}</div>
                )}
              </div>
              {improvement.approved_by_pm && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                  Approved
                </Badge>
              )}
            </div>
          )}

          {improvement.approval_threshold === 'requires_eor_review' && (
            <div className="flex items-center gap-2 p-2 bg-zinc-800/50 border border-zinc-700 rounded">
              {improvement.approved_by_eor ? (
                <CheckCircle size={14} className="text-green-500" />
              ) : (
                <Clock size={14} className="text-amber-500" />
              )}
              <div className="flex-1">
                <div className="text-xs font-medium text-white">Engineer of Record</div>
                {improvement.approved_by_eor && (
                  <div className="text-[10px] text-zinc-500">{improvement.approved_by_eor}</div>
                )}
              </div>
              {improvement.approved_by_eor && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                  Approved
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Design Intent Warning */}
        {improvement.design_intent_change && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs">
            <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
              <AlertTriangle size={14} />
              Design Intent Change
            </div>
            <div className="text-zinc-400">
              This change affects structural design. EOR review required before implementation.
            </div>
          </div>
        )}

        {/* Impact Summary */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-400">Impact Assessment</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-zinc-800/50 border border-zinc-700 rounded">
              <div className="text-zinc-500 mb-1">Cost Impact</div>
              <div className="font-semibold text-white">
                ${improvement.cost_impact_estimate?.toLocaleString() || '0'}
              </div>
            </div>
            <div className="p-2 bg-zinc-800/50 border border-zinc-700 rounded">
              <div className="text-zinc-500 mb-1">Schedule Impact</div>
              <div className="font-semibold text-white">
                {improvement.schedule_impact_estimate || 0} days
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {improvement.status === 'pending_review' && canApprove && (
          <div className="space-y-2">
            {!showRejectForm ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-black"
                >
                  <CheckCircle size={16} className="mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => setShowRejectForm(true)}
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <XCircle size={16} className="mr-2" />
                  Reject
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  className="bg-zinc-800 border-zinc-700 min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowRejectForm(false)}
                    variant="outline"
                    className="flex-1 border-zinc-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => rejectMutation.mutate()}
                    disabled={!rejectionReason.trim() || rejectMutation.isPending}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  >
                    Confirm Rejection
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {improvement.status === 'rejected' && improvement.rejection_reason && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs">
            <div className="font-semibold text-red-400 mb-1">Rejection Reason</div>
            <div className="text-zinc-400">{improvement.rejection_reason}</div>
          </div>
        )}

        {improvement.status === 'approved' && improvement.approval_date && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded text-xs">
            <div className="font-semibold text-green-400 mb-1">Approved</div>
            <div className="text-zinc-400">
              {format(new Date(improvement.approval_date), 'MMM d, yyyy')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}