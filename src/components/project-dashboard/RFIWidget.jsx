import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageSquareWarning, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function RFIWidget({ projectId }) {
  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', projectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: projectId })
  });

  const openRFIs = rfis.filter(r => !['answered', 'closed'].includes(r.status));
  const overdueRFIs = openRFIs.filter(r => r.due_date && new Date(r.due_date) < new Date());
  const criticalRFIs = openRFIs.filter(r => r.priority === 'critical');

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquareWarning size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-white">Open RFIs</h3>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Total Open</span>
          <span className="text-3xl font-bold text-white">{openRFIs.length}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={12} className="text-red-400" />
              <span className="text-[10px] text-red-400 uppercase font-semibold">Overdue</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{overdueRFIs.length}</div>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={12} className="text-orange-400" />
              <span className="text-[10px] text-orange-400 uppercase font-semibold">Critical</span>
            </div>
            <div className="text-2xl font-bold text-orange-400">{criticalRFIs.length}</div>
          </div>
        </div>
        {openRFIs.slice(0, 3).map(rfi => (
          <div key={rfi.id} className="bg-zinc-800/30 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-white">RFI-{rfi.rfi_number}</span>
              <Badge variant="outline" className="text-[10px]">
                {rfi.status}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400 truncate">{rfi.subject}</p>
          </div>
        ))}
      </div>
    </div>
  );
}