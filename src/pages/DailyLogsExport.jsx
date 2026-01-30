import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar, FileDown, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';

export default function DailyLogsExport() {
  const { activeProjectId } = useActiveProject();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const handleExport = async () => {
    if (!activeProjectId) {
      toast.error('Select a project first');
      return;
    }

    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportDailyLogsPDF', {
        project_id: activeProjectId,
        start_date: startDate || null,
        end_date: endDate || null
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const project = projects.find(p => p.id === activeProjectId);
      a.download = `DailyLogs-${project?.project_number || 'Report'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Daily logs exported');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-600/10 via-zinc-900/50 to-amber-600/5">
        <div className="max-w-[1200px] mx-auto px-6 py-6">
          <h1 className="text-xl font-bold text-white uppercase tracking-wide">Daily Logs Export</h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">Generate PDF reports by date range</p>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={18} />
              Export Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-zinc-400 uppercase">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2 bg-zinc-950 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-400 uppercase">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-2 bg-zinc-950 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setStartDate(today);
                  setEndDate(today);
                }}
                variant="outline"
                size="sm"
                className="border-zinc-700"
              >
                Today
              </Button>
              <Button
                onClick={() => {
                  const today = new Date();
                  const weekAgo = new Date(today);
                  weekAgo.setDate(today.getDate() - 7);
                  setStartDate(weekAgo.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}
                variant="outline"
                size="sm"
                className="border-zinc-700"
              >
                Last 7 Days
              </Button>
              <Button
                onClick={() => {
                  const today = new Date();
                  const monthAgo = new Date(today);
                  monthAgo.setMonth(today.getMonth() - 1);
                  setStartDate(monthAgo.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}
                variant="outline"
                size="sm"
                className="border-zinc-700"
              >
                Last 30 Days
              </Button>
            </div>

            <Button
              onClick={handleExport}
              disabled={!activeProjectId || exporting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
              size="lg"
            >
              {exporting ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileDown size={18} className="mr-2" />
                  Export Daily Logs to PDF
                </>
              )}
            </Button>

            <div className="text-xs text-zinc-500 text-center">
              Leave dates blank to export all daily logs for the selected project
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}