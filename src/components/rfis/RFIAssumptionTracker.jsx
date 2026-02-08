import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function RFIAssumptionTracker({ rfi, onUpdate }) {
  const queryClient = useQueryClient();
  const [showAssumptionForm, setShowAssumptionForm] = useState(false);
  const [assumptionText, setAssumptionText] = useState('');
  const [riskOwner, setRiskOwner] = useState('');

  const documentAssumptionMutation = useMutation({
    mutationFn: async () => {
      return apiClient.entities.RFI.update(rfi.id, {
        assumption_risk: {
          proceeding_with_assumption: true,
          documented_assumption: assumptionText,
          assumption_date: new Date().toISOString(),
          risk_owner: riskOwner
        }
      });
    },
    onSuccess: () => {
      toast.success('Assumption documented and tracked');
      setShowAssumptionForm(false);
      setAssumptionText('');
      setRiskOwner('');
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      onUpdate?.();
    },
    onError: (err) => toast.error(err.message)
  });

  if (!rfi) return null;

  if (rfi.assumption_risk?.proceeding_with_assumption) {
    return (
      <Card className="bg-orange-900/30 border border-orange-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle size={16} className="text-orange-500" />
            ⚠️ Work Proceeding with Assumption (Risk Documented)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-zinc-800 rounded text-sm">
            <div className="text-zinc-300 font-semibold mb-1">Assumption:</div>
            <p className="text-zinc-200 italic">"{rfi.assumption_risk.documented_assumption}"</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-zinc-500 font-bold">Risk Owner</div>
              <div className="text-orange-300">{rfi.assumption_risk.risk_owner || 'Not specified'}</div>
            </div>
            <div>
              <div className="text-zinc-500 font-bold">Documented</div>
              <div className="text-orange-300">
                {new Date(rfi.assumption_risk.assumption_date).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-300">
            <AlertCircle size={12} className="inline mr-1" />
            Risk exposure tracked. RFI resolution needed to close this.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rfi.status === 'draft' || rfi.status === 'internal_review') {
    return null; // Don't show assumption tracker until submitted
  }

  if (rfi.status === 'submitted' || rfi.status === 'under_review') {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle size={16} className="text-yellow-500" />
            No Answer Yet? Document Assumption
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showAssumptionForm ? (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowAssumptionForm(true)}
              className="text-yellow-500 border-yellow-600"
            >
              Document Work Assumption
            </Button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-2">What assumption are you making?</label>
                <Textarea
                  placeholder="e.g., 'Assuming connection detail per drawing DET-03-04 with standard fillet welds until clarified'"
                  value={assumptionText}
                  onChange={(e) => setAssumptionText(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-sm h-20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-2">Risk Owner (who approved this risk?)</label>
                <input
                  type="text"
                  placeholder="PM name / title"
                  value={riskOwner}
                  onChange={(e) => setRiskOwner(e.target.value)}
                  className="w-full px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded"
                />
              </div>

              <div className="p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-300">
                ⚠️ This documents risk exposure. RFI resolution is still required.
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowAssumptionForm(false)}>Cancel</Button>
                <Button 
                  size="sm" 
                  onClick={() => documentAssumptionMutation.mutate()}
                  disabled={!assumptionText || !riskOwner}
                  className="bg-yellow-600"
                >
                  Lock in Assumption
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}