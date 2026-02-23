import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert, ShieldCheck, ShieldX, Lock, Unlock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ExecutionGatePanel({ entityType, entityId, gateTypes = ['fabricate'] }) {
  const [overrideDialog, setOverrideDialog] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { data: gates, isLoading, refetch } = useQuery({
    queryKey: ['executionGates', entityType, entityId],
    queryFn: async () => {
      const results = await base44.entities.ExecutionGate.filter({
        entity_type: entityType,
        entity_id: entityId
      });
      return results;
    }
  });
  
  const getGateIcon = (status) => {
    switch (status) {
      case 'open': return <ShieldCheck className="w-5 h-5 text-green-500" />;
      case 'conditional': return <ShieldAlert className="w-5 h-5 text-yellow-500" />;
      case 'blocked': return <ShieldX className="w-5 h-5 text-red-500" />;
      case 'approved_override': return <Unlock className="w-5 h-5 text-blue-500" />;
      default: return <Lock className="w-5 h-5 text-gray-400" />;
    }
  };
  
  const getGateBadgeVariant = (status) => {
    switch (status) {
      case 'open': return 'success';
      case 'conditional': return 'warning';
      case 'blocked': return 'destructive';
      case 'approved_override': return 'secondary';
      default: return 'outline';
    }
  };
  
  const handleRequestOverride = (gate) => {
    setOverrideDialog(gate);
    setOverrideReason('');
  };
  
  const handleSubmitOverride = async () => {
    if (!overrideReason.trim()) {
      toast.error('Override reason required');
      return;
    }
    
    setSubmitting(true);
    try {
      await base44.entities.ExecutionGate.update(overrideDialog.id, {
        gate_status: 'approved_override',
        approved_override_by: (await base44.auth.me()).email,
        approved_override_at: new Date().toISOString(),
        override_reason: overrideReason
      });
      
      toast.success('Gate override approved');
      setOverrideDialog(null);
      setOverrideReason('');
      refetch();
    } catch (error) {
      toast.error('Failed to override gate');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Execution Gates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading gate status...</p>
        </CardContent>
      </Card>
    );
  }
  
  const displayGates = gateTypes.map(gateType => {
    const gate = gates?.find(g => g.gate_type === gateType);
    return { gateType, gate };
  });
  
  return (
    <>
      <Card className="border-amber-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Execution Gates
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {displayGates.map(({ gateType, gate }) => (
            <div key={gateType} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getGateIcon(gate?.gate_status || 'unknown')}
                  <span className="font-semibold text-sm uppercase">{gateType} Gate</span>
                </div>
                <Badge variant={getGateBadgeVariant(gate?.gate_status || 'unknown')}>
                  {gate?.gate_status?.toUpperCase().replace('_', ' ') || 'NOT EVALUATED'}
                </Badge>
              </div>
              
              {gate && gate.gate_status !== 'open' && (
                <div className="ml-7 space-y-2">
                  {gate.blockers?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Blockers:</p>
                      {gate.blockers.map((blocker, idx) => (
                        <Alert key={idx} variant="destructive" className="py-2">
                          <AlertDescription className="text-xs">
                            <span className="font-medium">{blocker.entity}:</span> {blocker.reason}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                  
                  {gate.required_actions?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Required Actions:</p>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        {gate.required_actions.map((action, idx) => (
                          <li key={idx}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {gate.gate_status === 'approved_override' && (
                    <Alert className="py-2">
                      <AlertDescription className="text-xs">
                        <p><strong>Override Approved</strong></p>
                        <p>By: {gate.approved_override_by}</p>
                        <p>Reason: {gate.override_reason}</p>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {(gate.gate_status === 'blocked' || gate.gate_status === 'conditional') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestOverride(gate)}
                      className="w-full">
                      Request Override
                    </Button>
                  )}
                </div>
              )}
              
              {!gate && (
                <p className="ml-7 text-xs text-muted-foreground">
                  Gate will be evaluated on status transition
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      
      <Dialog open={!!overrideDialog} onOpenChange={(open) => !open && setOverrideDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Execution Gate</DialogTitle>
            <DialogDescription>
              You are requesting to override the {overrideDialog?.gate_type} gate. This action will be audited.
              Provide a clear business justification.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Override Reason (Required)</Label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Enter detailed justification for override..."
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialog(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitOverride} disabled={submitting}>
              {submitting ? 'Approving...' : 'Approve Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}