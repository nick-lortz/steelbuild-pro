import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ResourceWorkloadChart({ resources = [], allocations = [], tasks = [] }) {
  const workloadData = useMemo(() => {
    return resources.map(resource => {
      // Calculate total allocation percentage
      const totalAllocation = allocations
        .filter(a => a.resource_id === resource.id)
        .reduce((sum, a) => sum + (a.allocation_percentage || 0), 0);

      // Calculate task count
      const assignedTasks = tasks.filter(t => 
        (t.assigned_resources || []).includes(resource.id)
      );

      // Calculate utilization
      const weeklyCapacity = resource.weekly_capacity_hours || 40;
      const estimatedHours = assignedTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
      const utilization = weeklyCapacity > 0 ? (estimatedHours / weeklyCapacity) * 100 : 0;

      // Status classification
      let status = 'optimal';
      if (utilization > 120) status = 'critical';
      else if (utilization > 100) status = 'overallocated';
      else if (utilization < 50) status = 'underutilized';

      return {
        name: resource.name,
        utilization: Math.round(utilization),
        allocation: Math.round(totalAllocation),
        capacity: 100,
        tasks: assignedTasks.length,
        status,
        resource
      };
    }).sort((a, b) => b.utilization - a.utilization);
  }, [resources, allocations, tasks]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return '#ef4444';
      case 'overallocated': return '#f59e0b';
      case 'underutilized': return '#6b7280';
      case 'optimal': return '#10b981';
      default: return '#3b82f6';
    }
  };

  const summary = useMemo(() => {
    const overallocated = workloadData.filter(d => d.utilization > 100).length;
    const underutilized = workloadData.filter(d => d.utilization < 50).length;
    const optimal = workloadData.filter(d => d.utilization >= 50 && d.utilization <= 100).length;
    const avgUtilization = workloadData.length > 0
      ? Math.round(workloadData.reduce((sum, d) => sum + d.utilization, 0) / workloadData.length)
      : 0;

    return { overallocated, underutilized, optimal, avgUtilization };
  }, [workloadData]);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity size={18} />
            Resource Workload
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-zinc-400">Optimal ({summary.optimal})</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-zinc-400">Overallocated ({summary.overallocated})</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-zinc-600" />
              <span className="text-zinc-400">Underutilized ({summary.underutilized})</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <Badge variant="outline" className="text-xs">
            Avg Utilization: {summary.avgUtilization}%
          </Badge>
          {summary.overallocated > 0 && (
            <Badge variant="warning" className="text-xs flex items-center gap-1">
              <AlertTriangle size={12} />
              {summary.overallocated} Overallocated
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {workloadData.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            No resource data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={workloadData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis 
                type="number" 
                stroke="#71717a"
                tick={{ fontSize: 12 }}
                label={{ value: 'Utilization %', position: 'insideBottom', offset: -5, style: { fill: '#71717a', fontSize: 12 } }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#71717a"
                tick={{ fontSize: 11 }}
                width={120}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#18181b', 
                  border: '1px solid #3f3f46',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
                        <div className="font-semibold text-white mb-2">{data.name}</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-400">Utilization:</span>
                            <span className={cn(
                              "font-semibold",
                              data.utilization > 100 ? "text-amber-400" : "text-emerald-400"
                            )}>{data.utilization}%</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-400">Allocation:</span>
                            <span className="text-white">{data.allocation}%</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-400">Tasks:</span>
                            <span className="text-white">{data.tasks}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-400">Status:</span>
                            <Badge 
                              variant={data.status === 'optimal' ? 'success' : data.status === 'critical' ? 'destructive' : 'warning'}
                              className="text-[10px]"
                            >
                              {data.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine x={100} stroke="#71717a" strokeDasharray="3 3" label={{ value: '100%', position: 'top', fill: '#71717a', fontSize: 10 }} />
              <Bar dataKey="utilization" radius={[0, 4, 4, 0]}>
                {workloadData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}