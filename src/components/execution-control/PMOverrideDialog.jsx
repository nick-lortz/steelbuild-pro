import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PMOverrideDialog({ 
  open, 
  onClose, 
  onConfirm, 
  assessment,
  workPackage 
}) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!notes.trim()) {
      alert('Approval notes are required for override');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(notes);
      setNotes('');
      onClose();
    } catch (error) {
      alert('Override failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">PM Override: Release Work Package</DialogTitle>
          <DialogDescription>
            You are about to override execution controls for {workPackage?.package_number}
          </DialogDescription>
        </DialogHeader>

        {assessment && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="destructive">
                    Risk Score: {assessment.risk_score}
                  </Badge>
                  <Badge variant="destructive">
                    {assessment.risk_level}
                  </Badge>
                  <Badge variant="outline">
                    Margin at Risk: ${assessment.margin_at_risk?.toLocaleString() || 0}
                  </Badge>
                </div>
                
                <div>
                  <p className="text-xs font-semibold mb-1">Risk Drivers:</p>
                  <ul className="text-xs list-disc list-inside space-y-0.5">
                    {(assessment.drivers || []).map((driver, idx) => (
                      <li key={idx}>{driver}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 mt-4">
          <Label htmlFor="approval-notes">
            Approval Notes <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="approval-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document your decision to override execution controls. Include:
- Why you're accepting this risk
- What mitigations are in place
- Expected timeline for resolving drivers
- Authority for this decision"
            rows={8}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This override will be logged in the audit trail. All stakeholders will be notified.
          </p>
        </div>

        <DialogFooter className="gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !notes.trim()}
            className="bg-gradient-to-r from-amber-600 to-orange-600"
          >
            {loading ? 'Processing...' : 'Override & Release'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}