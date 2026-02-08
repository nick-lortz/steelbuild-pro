import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Play, XCircle, FileText, Loader } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function SteelQAPanel({ drawingSet }) {
  const [running, setRunning] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const queryClient = useQueryClient();

  const runQAMutation = useMutation({
    mutationFn: async () => {
      setRunning(true);
      const result = await base44.functions.invoke('runSteelQA', {
        drawing_set_id: drawingSet.id
      });
      return result.data;
    },
    onSuccess: (data) => {
      setRunning(false);
      queryClient.invalidateQueries(['drawingSet', drawingSet.id]);
      if (data.qa_status === 'pass') {
        toast.success('Steel QA passed — ready for fabrication');
      } else {
        toast.error(`QA failed — ${data.qa_blockers.length} blockers found`);
      }
    },
    onError: () => {
      setRunning(false);
      toast.error('QA check failed');
    }
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      setGeneratingReport(true);
      const result = await base44.functions.invoke('generateSteelQAReport', {
        drawing_set_id: drawingSet.id
      });
      return result.data;
    },
    onSuccess: (data) => {
      setGeneratingReport(false);
      queryClient.invalidateQueries(['documents']);
      toast.success('QA report generated');
      // Download report
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SteelQA_${drawingSet.set_name}_${drawingSet.current_revision}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    },
    onError: () => {
      setGeneratingReport(false);
      toast.error('Report generation failed');
    }
  });

  const p0Blockers = (drawingSet.qa_blockers || []).filter(b => b.severity === 'P0');
  const p1Blockers = (drawingSet.qa_blockers || []).filter(b => b.severity === 'P1');

  const canReleaseFab = drawingSet.qa_status === 'pass' && p0Blockers.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {drawingSet.qa_status === 'pass' && <CheckCircle size={18} className="text-green-500" />}
            {drawingSet.qa_status === 'fail' && <XCircle size={18} className="text-red-500" />}
            Steel QA Gate
          </CardTitle>
          <Button
            onClick={() => runQAMutation.mutate()}
            disabled={running}
            size="sm"
          >
            <Play size={14} className="mr-1" />
            {running ? 'Running...' : 'Run Steel QA'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {drawingSet.qa_status === 'not_run' && (
          <div className="text-sm text-muted-foreground">
            QA checks not yet run
          </div>
        )}

        {drawingSet.qa_status === 'pass' && (
          <div className="bg-green-950/20 border border-green-800 rounded-md p-3">
            <p className="text-sm text-green-400">✓ All checks passed</p>
          </div>
        )}

        {p0Blockers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-500 font-medium">
              <AlertCircle size={16} />
              P0 Blockers ({p0Blockers.length})
            </div>
            {p0Blockers.map((blocker, idx) => (
              <div key={idx} className="bg-red-950/20 border border-red-800 rounded p-2 text-sm">
                <div className="font-mono text-xs text-red-400">{blocker.sheet_number}{blocker.detail_number ? ` / ${blocker.detail_number}` : ''}</div>
                <div>{blocker.message}</div>
              </div>
            ))}
          </div>
        )}

        {p1Blockers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-yellow-500 font-medium">
              <AlertCircle size={16} />
              P1 Warnings ({p1Blockers.length})
            </div>
            {p1Blockers.map((blocker, idx) => (
              <div key={idx} className="bg-yellow-950/20 border border-yellow-800 rounded p-2 text-sm">
                <div className="font-mono text-xs text-yellow-400">{blocker.sheet_number}{blocker.detail_number ? ` / ${blocker.detail_number}` : ''}</div>
                <div>{blocker.message}</div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t space-y-2">
          <Button
            onClick={() => generateReportMutation.mutate()}
            disabled={generatingReport || drawingSet.qa_status === 'not_run'}
            variant="outline"
            className="w-full"
          >
            {generatingReport ? (
              <>
                <Loader size={14} className="mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText size={14} className="mr-1" />
                Download QA Report
              </>
            )}
          </Button>
          <Button
            variant={canReleaseFab ? 'default' : 'outline'}
            disabled={!canReleaseFab}
            className="w-full"
          >
            {canReleaseFab ? '✓ Release for Fabrication' : '🔒 QA Required Before FFF'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}