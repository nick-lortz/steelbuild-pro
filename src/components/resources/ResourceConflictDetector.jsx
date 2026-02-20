import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, Users, Calendar, TrendingUp, 
  CheckCircle2, XCircle, AlertCircle 
} from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ResourceConflictDetector({ projectId, startDate, endDate }) {
  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list()
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['resource-allocations', projectId],
    queryFn: () => base44.entities.ResourceAllocation.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const conflictAnalysis = useMemo(() => {
    const analysis = {
      overallocated: [],
      underutilized: [],
      conflicts: [],
      optimal: []
    };

    resources.forEach(resource => {
      const resourceAllocations = allocations.filter(a => a.resource_id === resource.id);
      
      // Calculate total hours allocated
      let totalHours = 0;
      const allocationsByDate = {};
      
      resourceAllocations.forEach(allocation => {
        const start = parseISO(allocation.allocated_start_date);
        const end = parseISO(allocation.allocated_end_date);
        
        // Check if allocation overlaps with our analysis period
        if (startDate && endDate) {
          const overlaps = isWithinInterval(start, { start: startDate, end: endDate }) ||
                          isWithinInterval(end, { start: startDate, end: endDate });
          if (!overlaps) return;
        }
        
        totalHours += allocation.allocated_hours || 0;
        
        // Track daily allocations
        const dateKey = format(start, 'yyyy-MM-dd');
        if (!allocationsByDate[dateKey]) {
          allocationsByDate[dateKey] = [];
        }
        allocationsByDate[dateKey].push(allocation);
      });

      // Calculate capacity
      const weeklyCapacity = resource.weekly_capacity_hours || 40;
      const utilizationPercent = (totalHours / weeklyCapacity) * 100;

      // Detect conflicts (multiple assignments on same day)
      const dailyConflicts = Object.entries(allocationsByDate)
        .filter(([date, allocs]) => allocs.length > 1)
        .map(([date, allocs]) => ({
          date,
          allocations: allocs,
          totalHours: allocs.reduce((sum, a) => sum + (a.hours_per_day || 8), 0)
        }));

      const resourceData = {
        resource,
        totalHours,
        utilizationPercent,
        allocations: resourceAllocations,
        conflicts: dailyConflicts
      };

      // Categorize
      if (dailyConflicts.length > 0 || utilizationPercent > 120) {
        analysis.overallocated.push(resourceData);
      } else if (utilizationPercent < 40 && resourceAllocations.length > 0) {
        analysis.underutilized.push(resourceData);
      } else if (utilizationPercent >= 40 && utilizationPercent <= 100) {
        analysis.optimal.push(resourceData);
      }

      if (dailyConflicts.length > 0) {
        analysis.conflicts.push(...dailyConflicts.map(c => ({
          ...c,
          resource
        })));
      }
    });

    return analysis;
  }, [resources, allocations, startDate, endDate]);

  const getTasks = (allocationIds) => {
    return tasks.filter(t => allocationIds.some(aid => {
      const alloc = allocations.find(a => a.id === aid);
      return alloc?.task_id === t.id;
    }));
  };

  return (
    <div className="space-y-4">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-red-950/20 border-red-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-400">{conflictAnalysis.overallocated.length}</p>
                <p className="text-xs text-red-300">Overallocated</p>
              </div>
              <XCircle className="text-red-400" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-950/20 border-amber-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-400">{conflictAnalysis.conflicts.length}</p>
                <p className="text-xs text-amber-300">Scheduling Conflicts</p>
              </div>
              <AlertCircle className="text-amber-400" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-950/20 border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-400">{conflictAnalysis.underutilized.length}</p>
                <p className="text-xs text-blue-300">Underutilized</p>
              </div>
              <TrendingUp className="text-blue-400" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-950/20 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-400">{conflictAnalysis.optimal.length}</p>
                <p className="text-xs text-green-300">Optimally Allocated</p>
              </div>
              <CheckCircle2 className="text-green-400" size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overallocated Resources */}
      {conflictAnalysis.overallocated.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle size={20} />
              Overallocated Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conflictAnalysis.overallocated.map(({ resource, totalHours, utilizationPercent, allocations, conflicts }) => (
              <div key={resource.id} className="p-4 rounded-lg bg-red-950/10 border border-red-500/30">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-white">{resource.name}</p>
                    <p className="text-sm text-zinc-400">{resource.classification}</p>
                  </div>
                  <Badge className="bg-red-500/20 text-red-400">
                    {utilizationPercent.toFixed(0)}% Utilized
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <div>Total Hours: {totalHours}</div>
                  <div>Capacity: {resource.weekly_capacity_hours || 40} hrs/week</div>
                  <div>Assignments: {allocations.length}</div>
                  <div className="text-red-400">Conflicts: {conflicts.length}</div>
                </div>
                {conflicts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-red-500/20">
                    <p className="text-xs font-medium text-red-400 mb-2">Scheduling Conflicts:</p>
                    {conflicts.map((conflict, idx) => (
                      <div key={idx} className="text-xs text-zinc-400 mb-1">
                        {format(parseISO(conflict.date), 'MMM d, yyyy')}: {conflict.allocations.length} overlapping assignments ({conflict.totalHours} hrs)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Underutilized Resources */}
      {conflictAnalysis.underutilized.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-400">
              <TrendingUp size={20} />
              Underutilized Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conflictAnalysis.underutilized.map(({ resource, totalHours, utilizationPercent, allocations }) => (
              <div key={resource.id} className="p-4 rounded-lg bg-blue-950/10 border border-blue-500/30">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-white">{resource.name}</p>
                    <p className="text-sm text-zinc-400">{resource.classification}</p>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400">
                    {utilizationPercent.toFixed(0)}% Utilized
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <div>Total Hours: {totalHours}</div>
                  <div>Capacity: {resource.weekly_capacity_hours || 40} hrs/week</div>
                  <div>Assignments: {allocations.length}</div>
                  <div>Available: {((resource.weekly_capacity_hours || 40) - totalHours).toFixed(0)} hrs</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Clear */}
      {conflictAnalysis.overallocated.length === 0 && conflictAnalysis.conflicts.length === 0 && (
        <Alert className="bg-green-950/20 border-green-500/30">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-300">
            No resource conflicts detected. All resources are optimally allocated.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}