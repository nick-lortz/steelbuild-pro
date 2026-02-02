import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';

export default function RFIHubForm({ rfi, projects, allRFIs, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    project_id: rfi?.project_id || projects[0]?.id || '',
    rfi_number: rfi?.rfi_number || 0,
    subject: rfi?.subject || '',
    question: rfi?.question || '',
    rfi_type: rfi?.rfi_type || 'other',
    category: rfi?.category || 'structural',
    discipline: rfi?.discipline || '',
    location_area: rfi?.location_area || '',
    status: rfi?.status || 'draft',
    priority: rfi?.priority || 'medium',
    ball_in_court: rfi?.ball_in_court || 'internal',
    assigned_to: rfi?.assigned_to || '',
    due_date: rfi?.due_date || '',
    response_owner: rfi?.response_owner || '',
    created_date: rfi?.created_date || new Date().toISOString().split('T')[0],
    notes: rfi?.notes || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate RFI number for new RFIs
  useEffect(() => {
    if (!rfi && formData.project_id) {
      const projectRFIs = allRFIs.filter(r => r.project_id === formData.project_id);
      const maxNumber = projectRFIs.reduce((max, r) => Math.max(max, r.rfi_number || 0), 0);
      setFormData(prev => ({ ...prev, rfi_number: maxNumber + 1 }));
    }
  }, [formData.project_id, rfi, allRFIs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.project_id) {
      toast.error('Project is required');
      return;
    }
    if (!formData.subject) {
      toast.error('Subject is required');
      return;
    }
    if (!formData.question) {
      toast.error('Question is required');
      return;
    }

    setIsSubmitting(true);

    try {
      if (rfi) {
        // Update existing RFI
        await base44.entities.RFI.update(rfi.id, formData);
        toast.success('RFI updated');
      } else {
        // Create new RFI
        await base44.entities.RFI.create(formData);
        toast.success('RFI created');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.message || 'Failed to save RFI');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {rfi ? `Edit RFI #${rfi.rfi_number}` : 'Create New RFI'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Project */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Project *</label>
              <Select 
                value={formData.project_id} 
                onValueChange={(v) => setFormData({ ...formData, project_id: v })}
                disabled={!!rfi}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_number} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* RFI Number */}
            <div className="space-y-2">
              <label className="text-sm font-medium">RFI Number</label>
              <Input
                type="number"
                value={formData.rfi_number}
                disabled
                className="bg-zinc-800 border-zinc-700 text-zinc-500"
              />
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject / Title *</label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Brief description of the issue"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          {/* Question */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Question / Request *</label>
            <Textarea
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="Detailed question or clarification needed"
              className="bg-zinc-800 border-zinc-700 min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* RFI Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select 
                value={formData.rfi_type} 
                onValueChange={(v) => setFormData({ ...formData, rfi_type: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="connection_detail">Connection Detail</SelectItem>
                  <SelectItem value="member_size_length">Member Size/Length</SelectItem>
                  <SelectItem value="embed_anchor">Embed/Anchor</SelectItem>
                  <SelectItem value="tolerance_fitup">Tolerance/Fitup</SelectItem>
                  <SelectItem value="coating_finish">Coating/Finish</SelectItem>
                  <SelectItem value="erection_sequence">Erection Sequence</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="structural">Structural</SelectItem>
                  <SelectItem value="architectural">Architectural</SelectItem>
                  <SelectItem value="mep">MEP</SelectItem>
                  <SelectItem value="coordination">Coordination</SelectItem>
                  <SelectItem value="clarification">Clarification</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select 
                value={formData.priority} 
                onValueChange={(v) => setFormData({ ...formData, priority: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Discipline */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Discipline</label>
              <Input
                value={formData.discipline}
                onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
                placeholder="e.g., Steel Erection, Connections"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location / Area</label>
              <Input
                value={formData.location_area}
                onChange={(e) => setFormData({ ...formData, location_area: e.target.value })}
                placeholder="e.g., Grid A-B/1-3, Level 2"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="internal_review">Internal Review</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ball in Court */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ball in Court</label>
              <Select 
                value={formData.ball_in_court} 
                onValueChange={(v) => setFormData({ ...formData, ball_in_court: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                  <SelectItem value="gc">GC</SelectItem>
                  <SelectItem value="architect">Architect</SelectItem>
                  <SelectItem value="engineer">Engineer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Assigned To */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned To</label>
              <Input
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                placeholder="Internal owner"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Response Owner */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Response Owner</label>
              <Input
                value={formData.response_owner}
                onChange={(e) => setFormData({ ...formData, response_owner: e.target.value })}
                placeholder="External responder"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or context"
              className="bg-zinc-800 border-zinc-700"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
            >
              {isSubmitting ? 'Saving...' : rfi ? 'Update RFI' : 'Create RFI'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}