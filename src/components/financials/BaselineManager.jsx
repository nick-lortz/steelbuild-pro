import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Save, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function BaselineManager({ 
  projectId, 
  baseline, 
  sovItems, 
  tasks = [],
  onCreateBaseline, 
  canEdit 
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [baselineData, setBaselineData] = useState({
    baseline_date: new Date().toISOString().split('T')[0],
    planned_start_date: new Date().toISOString().split('T')[0],
    planned_end_date: '',
    notes: ''
  });

  const calculatePlannedValue = (startDate, endDate, totalBudget) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMs = end - start;
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    
    const curve = [];
    for (let i = 0; i <= durationDays; i += 7) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const progress = i / durationDays;
      curve.push({
        date: currentDate.toISOString().split('T')[0],
        cumulative_pv: totalBudget * progress,
        period_pv: i === 0 ? 0 : (totalBudget * progress) - (curve[curve.length - 1]?.cumulative_pv || 0)
      });
    }
    return curve;
  };

  const handleCreate = async () => {
    const totalBudget = sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
    const sovSnapshot = sovItems.map(s => ({
      sov_code: s.sov_code,
      description: s.description,
      scheduled_value: s.scheduled_value,
      percent_complete: s.percent_complete || 0
    }));

    const taskSnapshot = tasks.map(t => ({
      id: t.id,
      name: t.name,
      start_date: t.start_date,
      end_date: t.end_date,
      estimated_cost: t.estimated_cost || 0
    }));

    const pvCurve = calculatePlannedValue(
      baselineData.planned_start_date,
      baselineData.planned_end_date,
      totalBudget
    );

    const start = new Date(baselineData.planned_start_date);
    const end = new Date(baselineData.planned_end_date);
    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    await onCreateBaseline({
      project_id: projectId,
      baseline_date: baselineData.baseline_date,
      baseline_type: baseline ? 'revised' : 'original',
      total_budget: totalBudget,
      planned_start_date: baselineData.planned_start_date,
      planned_end_date: baselineData.planned_end_date,
      planned_duration_days: durationDays,
      sov_snapshot: JSON.stringify(sovSnapshot),
      task_snapshot: JSON.stringify(taskSnapshot),
      planned_value_curve: pvCurve,
      is_active: true,
      notes: baselineData.notes
    });

    setShowDialog(false);
  };

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-white">Project Baseline</CardTitle>
              {baseline && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                  Active
                </Badge>
              )}
            </div>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => setShowDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save size={14} className="mr-1" />
                {baseline ? 'Revise Baseline' : 'Set Baseline'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {baseline ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
                <p className="text-xs text-zinc-500 mb-1">Baseline Date</p>
                <p className="text-sm text-white font-medium">
                  {format(new Date(baseline.baseline_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
                <p className="text-xs text-zinc-500 mb-1">Total Budget</p>
                <p className="text-sm text-white font-mono font-bold">
                  ${baseline.total_budget?.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
                <p className="text-xs text-zinc-500 mb-1">Duration</p>
                <p className="text-sm text-white font-medium">
                  {baseline.planned_duration_days} days
                </p>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
                <p className="text-xs text-zinc-500 mb-1">Type</p>
                <Badge variant="outline" className="capitalize text-xs">
                  {baseline.baseline_type}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded">
              <AlertCircle size={20} className="text-amber-400" />
              <p className="text-sm text-zinc-300">
                No baseline set. Set a baseline to track planned value and schedule performance.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {baseline ? 'Revise Project Baseline' : 'Set Project Baseline'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Baseline Date</label>
                <Input
                  type="date"
                  value={baselineData.baseline_date}
                  onChange={(e) => setBaselineData({ ...baselineData, baseline_date: e.target.value })}
                  className="bg-zinc-950 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Planned Start</label>
                <Input
                  type="date"
                  value={baselineData.planned_start_date}
                  onChange={(e) => setBaselineData({ ...baselineData, planned_start_date: e.target.value })}
                  className="bg-zinc-950 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Planned End</label>
              <Input
                type="date"
                value={baselineData.planned_end_date}
                onChange={(e) => setBaselineData({ ...baselineData, planned_end_date: e.target.value })}
                className="bg-zinc-950 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Notes</label>
              <Input
                value={baselineData.notes}
                onChange={(e) => setBaselineData({ ...baselineData, notes: e.target.value })}
                placeholder="Optional baseline notes"
                className="bg-zinc-950 border-zinc-700 text-white"
              />
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
              <p className="text-xs text-blue-400">
                <TrendingUp size={12} className="inline mr-1" />
                Baseline will capture current SOV and task state for planned value tracking
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setShowDialog(false)}
                variant="outline"
                className="flex-1 border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!baselineData.planned_end_date}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Create Baseline
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}