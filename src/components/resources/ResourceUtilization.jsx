import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from 'lucide-react';
import { isWithinInterval, differenceInDays } from 'date-fns';

export default function ResourceUtilization() {
  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => apiClient.entities.Resource.list('name'),
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['resourceAllocations'],
    queryFn: () => apiClient.entities.ResourceAllocation.list(),
  });

  const { data: laborHours = [] } = useQuery({
    queryKey: ['laborHours'],
    queryFn: () => apiClient.entities.LaborHours.list(),
  });

  // Calculate utilization for each resource
  const utilizationData = resources.map(resource => {
    const resourceAllocations = allocations.filter(a => a.resource_id === resource.id);
    
    // Current allocation percentage
    const currentAllocation = resourceAllocations.find(a => 
      isWithinInterval(new Date(), {
        start: new Date(a.start_date),
        end: new Date(a.end_date)
      })
    );
    
    // Actual hours worked (last 30 days)
    const recentHours = laborHours.filter(l => {
      if (l.resource_id !== resource.id) return false;
      const daysAgo = differenceInDays(new Date(), new Date(l.work_date));
      return daysAgo <= 30;
    });
    
    const totalHours = recentHours.reduce((sum, l) => sum + (l.hours || 0), 0);
    const avgDailyHours = totalHours / 30;
    const utilizationRate = (avgDailyHours / 8) * 100; // Assuming 8-hour workday
    
    return {
      resource,
      currentAllocationPercent: currentAllocation?.allocation_percentage || 0,
      totalHours,
      avgDailyHours: avgDailyHours.toFixed(1),
      utilizationRate: Math.min(utilizationRate, 100).toFixed(1),
      status: utilizationRate >= 80 ? 'high' : utilizationRate >= 50 ? 'medium' : 'low'
    };
  }).filter(d => d.resource.type === 'labor' || d.resource.type === 'equipment');

  const getUtilizationColor = (rate) => {
    if (rate >= 80) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (rate >= 50) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity size={18} />
          Resource Utilization (30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {utilizationData.map(data => (
            <div key={data.resource.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-white">{data.resource.name}</p>
                <p className="text-xs text-zinc-500">{data.resource.classification}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-zinc-400">
                    {data.totalHours.toFixed(0)}h total • {data.avgDailyHours}h/day
                  </p>
                  {data.currentAllocationPercent > 0 && (
                    <p className="text-xs text-zinc-500">
                      {data.currentAllocationPercent}% allocated
                    </p>
                  )}
                </div>
                <Badge variant="outline" className={`${getUtilizationColor(data.utilizationRate)} border`}>
                  {data.utilizationRate}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}