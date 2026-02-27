import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileDown, Loader2, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportPanel({ project, reportData, filters, timeframe, onClose }) {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState('pdf'); // pdf or csv

  const exportReport = async () => {
    setExporting(true);
    try {
      const { data } = await base44.functions.invoke('exportProjectReport', {
        project_id: project?.id,
        format,
        filters,
        timeframe,
        reportData
      });

      if (data?.file_url) {
        // Trigger download
        const a = document.createElement('a');
        a.href = data.file_url;
        a.download = `${project?.project_number}_report_${timeframe}.${format === 'pdf' ? 'pdf' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Report exported successfully');
        onClose();
      }
    } catch (err) {
      toast.error('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileDown className="w-5 h-5 text-blue-400" />
            Export Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          <div>
            <p className="text-sm text-zinc-300 mb-3">Select export format:</p>
            <div className="flex gap-3">
              {[
                { id: 'pdf', label: 'PDF (Formatted)', desc: 'For presentations' },
                { id: 'csv', label: 'CSV (Spreadsheet)', desc: 'For analysis' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFormat(opt.id)}
                  className={`flex-1 p-3 rounded border text-center transition-all ${
                    format === opt.id
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <div className="font-semibold text-xs">{opt.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-3 text-xs text-zinc-400">
              <p className="mb-2 font-semibold text-zinc-300">Will include:</p>
              <ul className="space-y-1 text-[10px]">
                <li>✓ KPI summary (cost, schedule, risk)</li>
                <li>✓ Trend charts ({timeframe})</li>
                <li>✓ RFI/CO blockers</li>
                <li>✓ Critical alerts</li>
                <li>✓ Work package status</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 border-zinc-700">
              Cancel
            </Button>
            <Button onClick={exportReport} disabled={exporting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export {format.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}