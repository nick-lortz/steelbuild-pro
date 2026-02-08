import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from '@/api/client';
import { Send, UserPlus, CheckCircle, Clock, Mail, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function ApprovalWorkflowPanel({ document, onWorkflowUpdate }) {
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [approvers, setApprovers] = useState([]);
  const [newApprover, setNewApprover] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [routing, setRouting] = useState(false);

  const addApprover = () => {
    if (newApprover.trim() && !approvers.includes(newApprover.trim())) {
      setApprovers([...approvers, newApprover.trim()]);
      setNewApprover('');
    }
  };

  const removeApprover = (email) => {
    setApprovers(approvers.filter(a => a !== email));
  };

  const handleRoute = async () => {
    if (approvers.length === 0) {
      toast.error('Add at least one approver');
      return;
    }

    setRouting(true);
    try {
      await apiClient.functions.invoke('routeDocumentApproval', {
        documentId: document.id,
        approvers,
        dueDate: dueDate || null,
        notes: notes || null
      });

      toast.success(`Document routed to ${approvers.length} approver${approvers.length > 1 ? 's' : ''}`);
      setShowRouteDialog(false);
      setApprovers([]);
      setDueDate('');
      setNotes('');
      onWorkflowUpdate?.();
    } catch (error) {
      console.error('Routing failed:', error);
      toast.error('Failed to route document');
    } finally {
      setRouting(false);
    }
  };

  const workflowStages = {
    uploaded: { label: 'Uploaded', icon: Clock, color: 'text-zinc-400' },
    pending_review: { label: 'Pending Review', icon: Clock, color: 'text-amber-400' },
    in_review: { label: 'In Review', icon: Clock, color: 'text-blue-400' },
    approved: { label: 'Approved', icon: CheckCircle, color: 'text-green-400' },
    rejected: { label: 'Rejected', icon: CheckCircle, color: 'text-red-400' }
  };

  const currentStage = workflowStages[document.workflow_stage] || workflowStages.uploaded;
  const StageIcon = currentStage.icon;

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <StageIcon className={currentStage.color} size={20} />
            Approval Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Current Stage</span>
              <Badge className={`${currentStage.color} border`}>
                {currentStage.label}
              </Badge>
            </div>
            
            {document.reviewer && (
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Mail size={14} />
                <span>Reviewer: {document.reviewer}</span>
              </div>
            )}
            
            {document.review_due_date && (
              <div className="flex items-center gap-2 text-sm text-zinc-300 mt-1">
                <Clock size={14} />
                <span>Due: {document.review_due_date}</span>
              </div>
            )}
          </div>

          {/* Route for Approval Button */}
          {document.workflow_stage === 'uploaded' && (
            <Button
              onClick={() => setShowRouteDialog(true)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Send size={16} className="mr-2" />
              Route for Approval
            </Button>
          )}

          {/* Approval Actions */}
          {document.workflow_stage === 'pending_review' && (
            <div className="space-y-2">
              <p className="text-sm text-zinc-400 mb-2">Awaiting review response</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    // Handle approve action
                    onWorkflowUpdate?.();
                    toast.success('Document approved');
                  }}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle size={16} className="mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    // Handle reject action
                    onWorkflowUpdate?.();
                    toast.success('Document rejected');
                  }}
                  variant="outline"
                  className="flex-1 border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  Reject
                </Button>
              </div>
            </div>
          )}

          {document.workflow_stage === 'approved' && (
            <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle size={16} />
                <span className="text-sm font-medium">Document Approved</span>
              </div>
              {document.review_date && (
                <p className="text-xs text-zinc-400 mt-1">
                  Approved on {document.review_date}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Route Dialog */}
      <Dialog open={showRouteDialog} onOpenChange={setShowRouteDialog}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Route Document for Approval</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add Approvers</Label>
              <div className="flex gap-2">
                <Input
                  value={newApprover}
                  onChange={(e) => setNewApprover(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addApprover();
                    }
                  }}
                  placeholder="Email address"
                  className="bg-zinc-800 border-zinc-700 flex-1"
                />
                <Button 
                  type="button" 
                  onClick={addApprover}
                  className="bg-zinc-700 hover:bg-zinc-600"
                >
                  <UserPlus size={16} />
                </Button>
              </div>
              
              {approvers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {approvers.map((email, idx) => (
                    <Badge
                      key={idx}
                      className="bg-amber-500/20 text-amber-400 border-amber-500/40 cursor-pointer hover:bg-amber-500/30"
                      onClick={() => removeApprover(email)}
                    >
                      {email} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label>Review Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional instructions or context..."
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRouteDialog(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRoute}
                disabled={routing || approvers.length === 0}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {routing ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Routing...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Send for Approval
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}