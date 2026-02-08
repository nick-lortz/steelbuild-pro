import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { AlertCircle } from 'lucide-react';

export default function RFIRevisionBinding({ 
  open, 
  onClose, 
  drawingSheetId, 
  drawingSetId, 
  projectId, 
  revisionHash,
  sheetNumber,
  onCreated 
}) {
  const [formData, setFormData] = useState({
    subject: '',
    question: '',
    rfi_type: 'connection_detail',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get next RFI number for project
      const existingRFIs = await base44.entities.RFI.filter(
        { project_id: projectId },
        '-rfi_number',
        1
      );
      const nextNumber = (existingRFIs[0]?.rfi_number || 0) + 1;

      const rfiData = {
        project_id: projectId,
        rfi_number: nextNumber,
        subject: formData.subject,
        question: formData.question,
        rfi_type: formData.rfi_type,
        priority: formData.priority,
        status: 'draft',
        origin_drawing_id: drawingSheetId,
        origin_revision_id: drawingSetId,
        revision_hash: revisionHash,
        submitted_date: new Date().toISOString().split('T')[0],
        ball_in_court: 'internal'
      };

      await base44.entities.RFI.create(rfiData);
      setFormData({ subject: '', question: '', rfi_type: 'connection_detail', priority: 'medium' });
      onClose();
      if (onCreated) onCreated();
    } catch (error) {
      console.error('Failed to create RFI:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create RFI from Drawing</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 text-xs text-muted-foreground mb-4 p-2 bg-blue-950/20 border border-blue-800 rounded">
          <div className="flex gap-1">
            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
            <span>RFI will be bound to Sheet {sheetNumber} revision hash for tracking</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1">Subject</label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Clarify bolt grade at Column C2 base plate"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Question/Issue</label>
            <Textarea
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="Describe the issue or clarification needed"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">RFI Type</label>
              <select
                value={formData.rfi_type}
                onChange={(e) => setFormData({ ...formData, rfi_type: e.target.value })}
                className="w-full px-2 py-1.5 text-xs border border-input rounded bg-background"
              >
                <option value="connection_detail">Connection Detail</option>
                <option value="member_size_length">Member Size/Length</option>
                <option value="embed_anchor">Embed/Anchor</option>
                <option value="coating_finish">Coating/Finish</option>
                <option value="tolerance_fitup">Tolerance/Fit-up</option>
                <option value="erection_sequence">Erection Sequence</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-2 py-1.5 text-xs border border-input rounded bg-background"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !formData.subject || !formData.question}>
              {loading ? 'Creating...' : 'Create RFI'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}