import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

export default function ResourceOptimizationWidget({ projectId }) {
  const { data: optimization, isLoading } = useQuery({
    queryKey: ['resource-optimization', projectId],
    queryFn: async () => {
      const resources = await base44.entities.ResourceSOVAssignment.filter({ project_id: projectId });
      const tasks = await base44.entities.Task.filter({ project_id: projectId });
      
      // Calculate utilization
      const activeResources = resources.filter(r => r.status === 'active');
      const totalEstHours = activeResources.reduce((sum, r) => sum + (r.estimated_hours || 0), 0);
      const totalActHours = activeResources.reduce((sum, r) => sum + (r.actual_hours || 0), 0);
      const utilization = totalEstHours > 0 ? (totalActHours / totalEstHours) * 100 : 0;
      
      // Detect overallocations
      const overallocated = activeResources.filter(r => 
        (r.actual_hours || 0) > (r.estimated_hours || 0) * 1.1
      );
      
      // Detect underutilized
      const underutilized = activeResources.filter(r => 
        (r.actual_hours || 0) < (r.estimated_hours || 0) * 0.5 &&
        r.estimated_hours > 0
      );

      return {
        totalResources: activeResources.length,
        utilization,
        overallocated: overallocated.length,
        underutilized: underutilized.length,
        recommendations: []
      };
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-amber-500" />
      </div>
    );
  }

  const utilizationColor = 
    optimization.utilization > 90 ? 'text-red-400' :
    optimization.utilization > 75 ? 'text-amber-400' :
    'text-green-400';

  return (
    <div>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users size={16} className="text-purple-400" />
          Resource Optimization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500">Overall Utilization</span>
            <span className={`text-lg font-bold ${utilizationColor}`}>
              {optimization.utilization.toFixed(0)}%
            </span>
          </div>
          <Progress value={optimization.utilization} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-zinc-950 border border-zinc-800 rounded text-center">
            <p className="text-xs text-zinc-500 mb-1">Active</p>
            <p className="text-lg font-bold text-blue-400">{optimization.totalResources}</p>
          </div>
          <div className="p-2 bg-zinc-950 border border-zinc-800 rounded text-center">
            <p className="text-xs text-zinc-500 mb-1">Overrun</p>
            <p className="text-lg font-bold text-red-400">{optimization.overallocated}</p>
          </div>
          <div className="p-2 bg-zinc-950 border border-zinc-800 rounded text-center">
            <p className="text-xs text-zinc-500 mb-1">Under</p>
            <p className="text-lg font-bold text-amber-400">{optimization.underutilized}</p>
          </div>
        </div>

        {(optimization.overallocated > 0 || optimization.underutilized > 0) && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-400 mb-1">Optimization Opportunity</p>
                <p className="text-[10px] text-zinc-400">
                  {optimization.overallocated > 0 && `${optimization.overallocated} overallocated • `}
                  {optimization.underutilized > 0 && `${optimization.underutilized} underutilized`}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </div>
  );
}