import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, User, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ApprovalWorkflow({ changeOrder, currentUser, onApprovalComplete }) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState(null);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  const applyCascadeMutation = useMutation({
    mutationFn: async ({ change_order_id }) => {
      return await apiClient.functions.invoke('applyCOApproval', { change_order_id });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', 'sov-items', 'financials', 'tasks'] });
      const updates = response.data.updates;
      toast.success(
        `CO applied: ${updates.sov_items.length} SOV, ${updates.financials.length} budgets, ${updates.tasks.length} tasks updated`
      );
      if (onApprovalComplete) onApprovalComplete();
    },
    onError: (error) => toast.error(error.message)
  });

  const approvalChain = changeOrder.approval_chain || [];
  const costImpact = Math.abs(changeOrder.cost_impact || 0);
  
  // Determine required approvers
  const getRequiredApprovers = () => {
    if (costImpact < 5000) return 1; // PM only
    if (costImpact < 25000) return 2; // PM + Super
    return 3; // PM + Super + Admin
  };

  const requiredApprovals = getRequiredApprovers();
  const isFullyApproved = approvalChain.length >= requiredApprovals && 
                          approvalChain.every(a => a.action === 'approved');
  const isRejected = approvalChain.some(a => a.action === 'rejected');
  const canApprove = changeOrder.status === 'submitted' && !isRejected && !isFullyApproved;

  const handleApproval = async () => {
    if (!action) return;
    
    setProcessing(true);
    try {
      const response = await apiClient.functions.invoke('routeChangeOrderApproval', {
        changeOrderId: changeOrder.id,
        action,
        comments
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setAction(null);
        setComments('');
        if (onApprovalComplete) {
          onApprovalComplete();
        }
      } else {
        throw new Error(response.data.error || 'Approval failed');
      }
    } catch (error) {
      toast.error('Approval failed: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg">Approval Workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Banner */}
        <div className={`p-3 rounded-lg border ${
          isFullyApproved ? 'bg-green-500/10 border-green-500/30' :
          isRejected ? 'bg-red-500/10 border-red-500/30' :
          'bg-amber-500/10 border-amber-500/30'
        }`}>
          <div className="flex items-center gap-2">
            {isFullyApproved ? (
              <>
                <CheckCircle2 className="text-green-400" size={20} />
                <span className="font-semibold text-green-400">Fully Approved</span>
              </>
            ) : isRejected ? (
              <>
                <XCircle className="text-red-400" size={20} />
                <span className="font-semibold text-red-400">Rejected</span>
              </>
            ) : (
              <>
                <Clock className="text-amber-400" size={20} />
                <span className="font-semibold text-amber-400">
                  Pending Approval ({approvalChain.length}/{requiredApprovals})
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {costImpact < 5000 
              ? 'Requires: Project Manager approval'
              : costImpact < 25000
              ? 'Requires: PM + Superintendent approval'
              : 'Requires: PM + Superintendent + Admin approval'}
          </p>
        </div>

        {/* Approval Chain History */}
        {approvalChain.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-400">Approval History</h4>
            {approvalChain.map((approval, idx) => (
              <div key={idx} className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-zinc-400" />
                    <span className="text-sm font-medium">{approval.approver}</span>
                  </div>
                  <Badge 
                    variant="outline"
                    className={approval.action === 'approved' 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }
                  >
                    {approval.action}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-500">
                  {format(new Date(approval.timestamp), 'MMM d, yyyy h:mm a')}
                </p>
                {approval.comments && (
                  <div className="mt-2 flex items-start gap-2 text-xs">
                    <MessageSquare size={12} className="text-zinc-500 mt-0.5" />
                    <p className="text-zinc-400">{approval.comments}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Apply CO Button (after approval) */}
        {isFullyApproved && changeOrder.status === 'approved' && (
          <div className="pt-4 border-t border-zinc-800">
            <Button
              onClick={() => applyCascadeMutation.mutate({ change_order_id: changeOrder.id })}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
              disabled={applyCascadeMutation.isPending}
            >
              {applyCascadeMutation.isPending ? 'Applying Updates...' : 'Apply CO Updates to SOV/Budget/Schedule'}
            </Button>
            <p className="text-xs text-zinc-500 mt-2">
              Cascades cost/schedule impacts to SOV items, financials, and tasks
            </p>
          </div>
        )}

        {/* Approval Action */}
        {canApprove && (
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            {!action ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => setAction('approve')}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 size={16} className="mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => setAction('reject')}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle size={16} className="mr-2" />
                  Reject
                </Button>
              </div>
            ) : (
              <>
                <div className={`p-3 rounded border ${
                  action === 'approve' 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <p className="text-sm font-semibold">
                    {action === 'approve' ? 'Approving' : 'Rejecting'} Change Order
                  </p>
                </div>
                
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">
                    Comments {action === 'reject' && '(required)'}
                  </label>
                  <Textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder={action === 'approve' 
                      ? 'Optional comments...'
                      : 'Reason for rejection...'}
                    className="bg-zinc-800 border-zinc-700"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleApproval}
                    disabled={processing || (action === 'reject' && !comments.trim())}
                    className={action === 'approve' 
                      ? 'flex-1 bg-green-600 hover:bg-green-700'
                      : 'flex-1 bg-red-600 hover:bg-red-700'
                    }
                  >
                    {processing ? 'Processing...' : `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}`}
                  </Button>
                  <Button
                    onClick={() => {
                      setAction(null);
                      setComments('');
                    }}
                    variant="outline"
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}