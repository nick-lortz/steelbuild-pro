import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';

const WAIVER_REASON_CODES = [
  { value: 'PROCEED_AT_RISK', label: 'Proceed at Risk' },
  { value: 'RFI_VERBAL_DIRECTION', label: 'RFI Verbal Direction' },
  { value: 'FAB_LEAD_TIME_PRESSURE', label: 'Fabrication Lead Time Pressure' },
  { value: 'FIELD_RESEQUENCE_REQUIRED', label: 'Field Resequence Required' },
  { value: 'MATERIAL_ONSITE_RISK', label: 'Material Onsite - Risk Accepted' },
  { value: 'SCHEDULE_CRITICAL', label: 'Schedule Critical Path' },
  { value: 'OWNER_DIRECTION', label: 'Owner/GC Direction' },
  { value: 'OTHER', label: 'Other' }
];

export default function WaiverDialog({ open, onOpenChange, constraint, onWaive }) {
  const [reasonCode, setReasonCode] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWaive = async () => {
    if (!reasonCode || !notes.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onWaive({
        constraint_id: constraint.id,
        reason_code: reasonCode,
        notes: notes.trim()
      });
      // Reset form
      setReasonCode('');
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to waive constraint:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = reasonCode && notes.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#0A0A0A] border-[rgba(255,255,255,0.1)]">
        <DialogHeader>
          <DialogTitle className="text-[#E5E7EB] flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={20} />
            Waive Constraint
          </DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            Waiving this constraint will allow work to proceed at risk. Document justification and accept responsibility.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Constraint Details */}
          <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
            <div className="text-xs text-[#6B7280] mb-1">Constraint</div>
            <div className="text-sm text-[#E5E7EB] font-medium">
              {constraint?.constraint_type?.replace(/_/g, ' ')}
            </div>
            {constraint?.notes && (
              <div className="text-xs text-[#9CA3AF] mt-1">{constraint.notes}</div>
            )}
          </div>

          {/* Reason Code Selection */}
          <div className="space-y-2">
            <Label htmlFor="reason-code" className="text-[#E5E7EB]">
              Waiver Reason Code <span className="text-red-500">*</span>
            </Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger 
                id="reason-code"
                className="bg-[#151515] border-[rgba(255,255,255,0.1)] text-[#E5E7EB]"
              >
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent className="bg-[#151515] border-[rgba(255,255,255,0.1)]">
                {WAIVER_REASON_CODES.map((code) => (
                  <SelectItem 
                    key={code.value} 
                    value={code.value}
                    className="text-[#E5E7EB] focus:bg-[rgba(255,157,66,0.1)] focus:text-[#FF9D42]"
                  >
                    {code.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Justification Notes */}
          <div className="space-y-2">
            <Label htmlFor="waiver-notes" className="text-[#E5E7EB]">
              Justification & Risk Acceptance <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="waiver-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document why this constraint is being waived, risks accepted, and any mitigation measures..."
              className="min-h-[120px] bg-[#151515] border-[rgba(255,255,255,0.1)] text-[#E5E7EB] placeholder:text-[#6B7280]"
            />
            <div className="text-xs text-[#6B7280]">
              Minimum 10 characters required. This will be logged in the audit trail.
            </div>
          </div>

          {/* Warning */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex gap-2">
              <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-amber-200">
                <strong>PM Authorization Required:</strong> By waiving this constraint, you accept full responsibility for any resulting schedule delays, rework, or safety issues.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleWaive}
            disabled={!canSubmit || isSubmitting}
            className="bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-700 hover:to-amber-600"
          >
            {isSubmitting ? 'Waiving...' : 'Waive Constraint'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}