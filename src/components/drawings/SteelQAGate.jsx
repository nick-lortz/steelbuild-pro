import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, AlertTriangle, Loader2, Lock, Zap, ZapOff } from 'lucide-react';

export default function SteelQAGate({ drawingSetId, onQAComplete, disableRFF }) {
  const [running, setRunning] = useState(false);
  const [lastTransition, setLastTransition] = useState(null);
  const queryClient = useQueryClient();

  const { data: drawingSet, isLoading } = useQuery({
    queryKey: ['drawingSet', drawingSetId],
    queryFn: () => base44.entities.DrawingSet.filter({ id: drawingSetId }),
    select: (data) => data?.[0] || null
  });

  const toggleAutoTransition = useMutation({
    mutationFn: (enabled) => base44.entities.DrawingSet.update(drawingSetId, { qa_auto_transition: enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drawingSet', drawingSetId] })
  });

  const runQA = async () => {
    setRunning(true);
    setLastTransition(null);
    try {
      const result = await base44.functions.invoke('runSteelQA', { drawing_set_id: drawingSetId });
      if (result?.data?.drawing_set_status_update) {
        setLastTransition(result.data.drawing_set_status_update);
      }
      queryClient.invalidateQueries({ queryKey: ['drawingSet', drawingSetId] });
      queryClient.invalidateQueries({ queryKey: ['drawing-sets'] });
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
        {/* Auto-transition toggle */}
        <div className="flex items-center justify-between p-2.5 rounded bg-zinc-900 border border-zinc-700">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            {drawingSet?.qa_auto_transition !== false
              ? <Zap size={13} className="text-amber-400" />
              : <ZapOff size={13} className="text-zinc-500" />
            }
            <span>Auto-transition set status on QA result</span>
          </div>
          <button
            onClick={() => toggleAutoTransition.mutate(drawingSet?.qa_auto_transition === false)}
            className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
              drawingSet?.qa_auto_transition !== false
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
            }`}
          >
            {drawingSet?.qa_auto_transition !== false ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Last auto-transition result */}
        {lastTransition && (
          <div className="text-xs p-2 bg-blue-950/30 border border-blue-700 rounded text-blue-300 flex items-center gap-2">
            <Zap size={12} />
            Set status auto-updated: <span className="font-mono font-bold">{lastTransition.from}</span> → <span className="font-mono font-bold text-amber-400">{lastTransition.to}</span>
          </div>
        )}

        {/* QA → Status mapping reference */}
        {drawingSet?.qa_auto_transition !== false && (
          <div className="text-[10px] text-zinc-600 grid grid-cols-2 gap-1 px-1">
            <span>QA pass → <span className="text-amber-400 font-mono">IFA</span></span>
            <span>QA fail → <span className="text-red-400 font-mono">BFA</span></span>
          </div>
        )}

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