import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, AlertTriangle, Loader2, Lock } from 'lucide-react';

export default function SteelQAGate({ drawingSetId, onQAComplete, disableRFF }) {
  const [running, setRunning] = useState(false);

  const { data: drawingSet, isLoading } = useQuery({
    queryKey: ['drawingSet', drawingSetId],
    queryFn: () => base44.entities.DrawingSet.filter({ id: drawingSetId }),
    select: (data) => data?.[0] || null
  });

  const runQA = async () => {
    setRunning(true);
    try {
      const result = await base44.functions.invoke('runSteelQA', { drawing_set_id: drawingSetId });
      if (onQAComplete) onQAComplete(result.data);
    } catch (error) {
      console.error('QA run failed:', error);
    } finally {
      setRunning(false);
    }
  };

  const qaStatus = drawingSet?.qa_status || 'not_run';
  const blockers = drawingSet?.qa_blockers || [];
  const p0Blockers = blockers.filter(b => b.severity === 'P0');
  const p1Blockers = blockers.filter(b => b.severity === 'P1');

  const canReleaseForFab = qaStatus === 'pass' && p0Blockers.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Steel QA Gate</CardTitle>
          <div className="flex items-center gap-2">
            {qaStatus === 'pass' && <CheckCircle2 size={16} className="text-green-500" />}
            {qaStatus === 'fail' && <AlertCircle size={16} className="text-red-500" />}
            {qaStatus === 'not_run' && <AlertTriangle size={16} className="text-yellow-500" />}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status */}
        <div className="space-y-2">
          {qaStatus === 'pass' && (
            <div className="p-2 bg-green-950/20 border border-green-800 rounded text-xs text-green-300">
              ✓ All QA checks passed. Ready for fabrication release.
            </div>
          )}
          {qaStatus === 'fail' && (
            <div className="p-2 bg-red-950/20 border border-red-800 rounded text-xs text-red-300">
              ✗ QA blocked. {p0Blockers.length} critical issue(s) must be resolved.
            </div>
          )}
          {qaStatus === 'not_run' && (
            <div className="p-2 bg-yellow-950/20 border border-yellow-800 rounded text-xs text-yellow-300">
              QA not yet run. Click below to scan drawing.
            </div>
          )}
        </div>

        {/* Blockers */}
        {blockers.length > 0 && (
          <div className="space-y-2">
            {p0Blockers.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-red-400 mb-1.5">
                  Critical Issues ({p0Blockers.length})
                </div>
                <div className="space-y-1">
                  {p0Blockers.map((blocker, idx) => (
                    <div key={idx} className="text-xs p-2 bg-red-950/30 border border-red-800 rounded text-red-300">
                      <div className="font-medium">{blocker.rule.replace(/_/g, ' ')}</div>
                      <div className="mt-0.5">{blocker.message}</div>
                      {blocker.sheet_number && (
                        <div className="text-xs mt-1 text-red-300/70">Sheet {blocker.sheet_number}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {p1Blockers.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-yellow-400 mb-1.5">
                  Warnings ({p1Blockers.length})
                </div>
                <div className="space-y-1">
                  {p1Blockers.map((blocker, idx) => (
                    <div key={idx} className="text-xs p-2 bg-yellow-950/30 border border-yellow-800 rounded text-yellow-300">
                      <div className="font-medium">{blocker.rule.replace(/_/g, ' ')}</div>
                      <div className="mt-0.5">{blocker.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action */}
        <Button
          onClick={runQA}
          disabled={running || isLoading}
          variant="outline"
          className="w-full"
        >
          {running && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          {running ? 'Running QA...' : 'Run Steel QA'}
        </Button>

        {/* RFF Status */}
        {disableRFF !== false && (
          <div className={`p-2 rounded text-xs flex items-center gap-2 ${
            canReleaseForFab 
              ? 'bg-green-950/20 border border-green-800 text-green-300' 
              : 'bg-red-950/20 border border-red-800 text-red-300'
          }`}>
            {!canReleaseForFab && <Lock size={13} />}
            {canReleaseForFab 
              ? '✓ Release for Fabrication enabled' 
              : '🔒 Blocked until P0 issues resolved'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}