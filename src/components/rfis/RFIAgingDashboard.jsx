import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';

export default function RFIAgingDashboard({ rfis = [], projects = [] }) {
  const openRFIs = rfis.filter(r => r.status === 'pending' || r.status === 'submitted');

  const agingRFIs = openRFIs.map(rfi => {
    const daysOpen = rfi.submitted_date 
      ? differenceInDays(new Date(), new Date(rfi.submitted_date))
      : 0;
    
    return {
      ...rfi,
      daysOpen,
      agingCategory: daysOpen > 30 ? 'critical' : daysOpen > 14 ? 'warning' : daysOpen > 7 ? 'watch' : 'new'
    };
  }).sort((a, b) => b.daysOpen - a.daysOpen);

  const agingStats = {
    critical: agingRFIs.filter(r => r.agingCategory === 'critical').length,
    warning: agingRFIs.filter(r => r.agingCategory === 'warning').length,
    watch: agingRFIs.filter(r => r.agingCategory === 'watch').length,
    new: agingRFIs.filter(r => r.agingCategory === 'new').length,
  };

  const getAgingColor = (category) => {
    switch (category) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'watch': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Aging Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
          <p className="text-xs text-zinc-500">Critical ({">"}30d)</p>
          <p className="text-2xl font-bold text-red-400">{agingStats.critical}</p>
        </div>
        <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
          <p className="text-xs text-zinc-500">Warning ({">"}14d)</p>
          <p className="text-2xl font-bold text-orange-400">{agingStats.warning}</p>
        </div>
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-zinc-500">Watch ({">"}7d)</p>
          <p className="text-2xl font-bold text-amber-400">{agingStats.watch}</p>
        </div>
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
          <p className="text-xs text-zinc-500">New ({"<"}7d)</p>
          <p className="text-2xl font-bold text-white">{agingStats.new}</p>
        </div>
      </div>

      {/* Aging RFI List */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={18} />
            Open RFIs by Age
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {agingRFIs.length === 0 ? (
              <p className="text-center text-zinc-500 py-4">No open RFIs</p>
            ) : (
              agingRFIs.slice(0, 10).map(rfi => {
                const project = projects.find(p => p.id === rfi.project_id);
                return (
                  <div key={rfi.id} className="flex items-start justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-amber-500 text-sm">
                          RFI-{String(rfi.rfi_number).padStart(3, '0')}
                        </span>
                        <Badge variant="outline" className={`${getAgingColor(rfi.agingCategory)} border text-xs`}>
                          {rfi.daysOpen}d
                        </Badge>
                        {rfi.priority === 'critical' && (
                          <AlertTriangle size={14} className="text-red-500" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-white line-clamp-1">{rfi.subject}</p>
                      <p className="text-xs text-zinc-500">{project?.name}</p>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      {rfi.submitted_date && (
                        <p>Submitted: {format(new Date(rfi.submitted_date), 'MMM d')}</p>
                      )}
                      {rfi.due_date && (
                        <p className={new Date(rfi.due_date) < new Date() ? 'text-red-400' : ''}>
                          Due: {format(new Date(rfi.due_date), 'MMM d')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}