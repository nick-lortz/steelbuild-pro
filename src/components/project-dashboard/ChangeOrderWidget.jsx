import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { FileCheck, DollarSign, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ChangeOrderWidget({ projectId }) {
  const { data: changeOrders = [] } = useQuery({
    queryKey: ['change-orders', projectId],
    queryFn: () => apiClient.entities.ChangeOrder.filter({ project_id: projectId })
  });

  const pending = changeOrders.filter(co => co.status === 'submitted' || co.status === 'under_review');
  const approved = changeOrders.filter(co => co.status === 'approved');
  const totalImpact = approved.reduce((sum, co) => sum + (co.cost_impact || 0), 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <FileCheck size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-white">Change Orders</h3>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Total Impact</span>
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className={totalImpact >= 0 ? 'text-green-400' : 'text-red-400'} />
            <span className={`text-xl font-bold ${totalImpact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${Math.abs(totalImpact).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3">
            <div className="text-[10px] text-amber-400 uppercase font-semibold mb-1">Pending</div>
            <div className="text-2xl font-bold text-amber-400">{pending.length}</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
            <div className="text-[10px] text-green-400 uppercase font-semibold mb-1">Approved</div>
            <div className="text-2xl font-bold text-green-400">{approved.length}</div>
          </div>
        </div>
        <div className="space-y-2">
          {pending.slice(0, 3).map(co => (
            <div key={co.id} className="bg-zinc-800/30 rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white">CO-{co.co_number}</span>
                <Badge variant="outline" className="text-[10px]">
                  {co.status}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 truncate">{co.title}</p>
              <div className="text-[10px] text-zinc-500 mt-1">
                ${(co.cost_impact || 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}