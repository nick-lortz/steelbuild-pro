import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function RFIBlockerDashboard({ rfis = [], crews = [], tasks = [] }) {
  const blockers = useMemo(() => {
    return rfis.filter(rfi => rfi.blocker_info?.is_blocker).sort((a, b) => {
      const aPriority = { critical: 0, high: 1, medium: 2, low: 3 };
      return (aPriority[a.priority] || 99) - (aPriority[b.priority] || 99);
    });
  }, [rfis]);

  const blockingSummary = useMemo(() => {
    const summary = {
      fabrication: [],
      delivery: [],
      erection: [],
      total_crews_waiting: new Set()
    };

    blockers.forEach(rfi => {
      if (rfi.blocker_info?.blocked_work) {
        summary[rfi.blocker_info.blocked_work]?.push(rfi);
        if (rfi.linked_task_ids) {
          rfi.linked_task_ids.forEach(taskId => {
            const task = tasks.find(t => t.id === taskId);
            if (task?.assigned_resources) {
              task.assigned_resources.forEach(r => summary.total_crews_waiting.add(r));
            }
          });
        }
      }
    });

    return {
      ...summary,
      total_crews_waiting: summary.total_crews_waiting.size
    };
  }, [blockers, tasks]);

  if (blockers.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <p className="text-sm text-zinc-500">No active blockers</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="bg-red-900/20 border-red-700">
          <CardContent className="pt-3">
            <div className="text-xs text-red-400 uppercase font-bold">Total Blockers</div>
            <div className="text-2xl font-bold text-red-500">{blockers.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-900/20 border-red-700">
          <CardContent className="pt-3">
            <div className="text-xs text-red-400 uppercase font-bold">Crews Waiting</div>
            <div className="text-2xl font-bold text-red-500">{blockingSummary.total_crews_waiting}</div>
          </CardContent>
        </Card>
        <Card className={blockingSummary.fabrication.length > 0 ? "bg-red-900/20 border-red-700" : "bg-zinc-800 border-zinc-700"}>
          <CardContent className="pt-3">
            <div className="text-xs text-zinc-400 uppercase font-bold">Fab Blockers</div>
            <div className={`text-2xl font-bold ${blockingSummary.fabrication.length > 0 ? 'text-red-500' : 'text-zinc-500'}`}>
              {blockingSummary.fabrication.length}
            </div>
          </CardContent>
        </Card>
        <Card className={blockingSummary.erection.length > 0 ? "bg-red-900/20 border-red-700" : "bg-zinc-800 border-zinc-700"}>
          <CardContent className="pt-3">
            <div className="text-xs text-zinc-400 uppercase font-bold">Erection Blockers</div>
            <div className={`text-2xl font-bold ${blockingSummary.erection.length > 0 ? 'text-red-500' : 'text-zinc-500'}`}>
              {blockingSummary.erection.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blocker Cards */}
      <div className="space-y-2">
        {blockers.map(rfi => (
          <Card key={rfi.id} className={`bg-zinc-800 border ${
            rfi.priority === 'critical' ? 'border-red-600' : 'border-yellow-700'
          }`}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className={rfi.priority === 'critical' ? 'text-red-500' : 'text-yellow-500'} />
                    <span className="font-bold text-white">RFI #{rfi.rfi_number}: {rfi.subject}</span>
                    <Badge className={rfi.priority === 'critical' ? 'bg-red-700' : 'bg-yellow-700'}>
                      {rfi.priority.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="text-sm text-zinc-400 space-y-1">
                    <div>
                      <strong>Blocks:</strong> {rfi.blocker_info?.blocked_work} • {rfi.blocker_info?.blocked_team || 'Multiple'}
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Clock size={12} />
                      Blocked since {formatDistanceToNow(new Date(rfi.blocker_info?.blocked_since || rfi.created_date), { addSuffix: true })}
                    </div>
                    {rfi.blocker_info?.impact_summary && (
                      <div className="text-xs italic text-orange-400 mt-2">"{rfi.blocker_info.impact_summary}"</div>
                    )}
                  </div>

                  {rfi.linked_task_ids && rfi.linked_task_ids.length > 0 && (
                    <div className="text-xs text-zinc-500 mt-2">
                      Affects: {rfi.linked_task_ids.length} task(s)
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-white mb-2">
                    {rfi.smart_due_date?.days_until_impact || '?'} days to impact
                  </div>
                  <div className="text-xs text-zinc-400 mb-3">
                    Due: {rfi.smart_due_date?.calculated_due_date || rfi.due_date}
                  </div>
                  <Button size="sm" variant="outline" className="text-xs">View</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}