import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Package, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function WorkPackageWidget({ projectId }) {
  const { data: workPackages = [] } = useQuery({
    queryKey: ['work-packages', projectId],
    queryFn: () => base44.entities.WorkPackage.filter({ project_id: projectId })
  });

  const byPhase = workPackages.reduce((acc, wp) => {
    acc[wp.phase] = (acc[wp.phase] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Package size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-white">Work Packages</h3>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Total Packages</span>
          <span className="text-3xl font-bold text-white">{workPackages.length}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(byPhase).map(([phase, count]) => (
            <div key={phase} className="bg-zinc-800/50 rounded p-2">
              <div className="text-[10px] text-zinc-500 uppercase">{phase}</div>
              <div className="text-xl font-bold text-zinc-300">{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}