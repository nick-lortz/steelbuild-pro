import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DrawingWidget({ projectId }) {
  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawing-sets', projectId],
    queryFn: () => apiClient.entities.DrawingSet.filter({ project_id: projectId })
  });

  const byStatus = drawingSets.reduce((acc, ds) => {
    acc[ds.status] = (acc[ds.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <FileText size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-white">Drawing Status</h3>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Total Sets</span>
          <span className="text-3xl font-bold text-white">{drawingSets.length}</span>
        </div>
        <div className="space-y-2">
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between bg-zinc-800/30 rounded p-2">
              <Badge variant="outline" className="text-xs">{status}</Badge>
              <span className="text-sm font-semibold text-white">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}