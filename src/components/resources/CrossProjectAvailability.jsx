import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Calendar, Building, Clock, TrendingUp } from 'lucide-react';
import { parseISO, isWithinInterval, format, differenceInDays } from 'date-fns';

export default function CrossProjectAvailability({ 
  resource, 
  startDate, 
  endDate, 
  allocations, 
  tasks, 
  projects 
}) {
  const conflictAnalysis = useMemo(() => {
    if (!resource || !startDate || !endDate) return null;

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    // Find all allocations for this resource in the date range
    const conflictingAllocations = allocations.filter(alloc => {
      if (alloc.resource_id !== resource.id) return false;
      
      const allocStart = parseISO(alloc.start_date);
      const allocEnd = parseISO(alloc.end_date);

      return (
        isWithinInterval(allocStart, { start, end }) ||
        isWithinInterval(allocEnd, { start, end }) ||
        (allocStart <= start && allocEnd >= end)
      );
    });

    // Find assigned tasks in the date range
    const assignedTasks = tasks.filter(task => {
      if (!task.start_date || !task.end_date) return false;
      
      const assignedResources = task.assigned_resources || [];
      const assignedEquipment = task.assigned_equipment || [];
      
      if (!assignedResources.includes(resource.id) && !assignedEquipment.includes(resource.id)) {
        return false;
      }

      const taskStart = parseISO(task.start_date);
      const taskEnd = parseISO(task.end_date);

      return (
        isWithinInterval(taskStart, { start, end }) ||
        isWithinInterval(taskEnd, { start, end }) ||
        (taskStart <= start && taskEnd >= end)
      );
    });

    // Calculate total allocation percentage
    const totalAllocation = conflictingAllocations.reduce(
      (sum, alloc) => sum + (alloc.allocation_percentage || 0),
      0
    );

    // Calculate hours demand
    const weeklyCapacity = resource.weekly_capacity_hours || 40;
    const durationDays = differenceInDays(end, start);
    const weeksInPeriod = Math.ceil(durationDays / 7);
    const totalCapacityHours = weeksInPeriod * weeklyCapacity;

    const estimatedHoursDemand = assignedTasks.reduce((sum, task) => {
      return sum + (task.estimated_hours || task.planned_shop_hours || task.planned_field_hours || 0);
    }, 0);

    const utilizationPercent = totalCapacityHours > 0 
      ? Math.round((estimatedHoursDemand / totalCapacityHours) * 100)
      : 0;

    // Determine conflict level
    let conflictLevel = 'none';
    if (totalAllocation > 100 || utilizationPercent > 100) {
      conflictLevel = 'critical';
    } else if (totalAllocation > 80 || utilizationPercent > 80) {
      conflictLevel = 'warning';
    } else if (totalAllocation > 50 || utilizationPercent > 50) {
      conflictLevel = 'caution';
    }

    return {
      conflictingAllocations,
      assignedTasks,
      totalAllocation,
      estimatedHoursDemand,
      totalCapacityHours,
      utilizationPercent,
      conflictLevel,
      availableCapacityHours: Math.max(0, totalCapacityHours - estimatedHoursDemand),
      projectCount: new Set(conflictingAllocations.map(a => a.project_id)).size
    };
  }, [resource, startDate, endDate, allocations, tasks]);

  if (!conflictAnalysis) {
    return null;
  }

  const getConflictColor = (level) => {
    const colors = {
      none: 'bg-green-500/10 border-green-500/30 text-green-400',
      caution: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      critical: 'bg-red-500/10 border-red-500/30 text-red-400'
    };
    return colors[level] || colors.none;
  };

  const getConflictIcon = (level) => {
    if (level === 'critical' || level === 'warning') {
      return <AlertTriangle size={16} className="text-red-400" />;
    }
    return <TrendingUp size={16} className="text-green-400" />;
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar size={18} className="text-amber-500" />
          Cross-Project Availability: {resource.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Capacity Summary */}
        <div className={`p-4 rounded-lg border ${getConflictColor(conflictAnalysis.conflictLevel)}`}>
          <div className="flex items-center gap-2 mb-3">
            {getConflictIcon(conflictAnalysis.conflictLevel)}
            <span className="font-bold text-sm">
              {conflictAnalysis.conflictLevel === 'none' && 'Available'}
              {conflictAnalysis.conflictLevel === 'caution' && 'Moderate Load'}
              {conflictAnalysis.conflictLevel === 'warning' && 'Heavy Load'}
              {conflictAnalysis.conflictLevel === 'critical' && 'Overallocated'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-zinc-500 mb-1">Total Allocation</p>
              <p className="font-bold text-lg">{conflictAnalysis.totalAllocation}%</p>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">Utilization</p>
              <p className="font-bold text-lg">{conflictAnalysis.utilizationPercent}%</p>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">Hours Demand</p>
              <p className="font-bold text-lg">{conflictAnalysis.estimatedHoursDemand}h</p>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">Available</p>
              <p className="font-bold text-lg text-green-400">{conflictAnalysis.availableCapacityHours}h</p>
            </div>
          </div>
        </div>

        {/* Existing Allocations */}
        {conflictAnalysis.conflictingAllocations.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Building size={14} />
              Current Allocations ({conflictAnalysis.projectCount} project{conflictAnalysis.projectCount !== 1 ? 's' : ''})
            </h4>
            <div className="space-y-2">
              {conflictAnalysis.conflictingAllocations.map(alloc => {
                const project = projects.find(p => p.id === alloc.project_id);
                return (
                  <div key={alloc.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white">{project?.name || 'Unknown Project'}</span>
                      <Badge variant="outline" className="text-xs">
                        {alloc.allocation_percentage}%
                      </Badge>
                    </div>
                    <p className="text-zinc-500">
                      {format(parseISO(alloc.start_date), 'MMM d')} - {format(parseISO(alloc.end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Assigned Tasks */}
        {conflictAnalysis.assignedTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Clock size={14} />
              Assigned Tasks ({conflictAnalysis.assignedTasks.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {conflictAnalysis.assignedTasks.map(task => {
                const project = projects.find(p => p.id === task.project_id);
                return (
                  <div key={task.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white">{task.name}</span>
                      <Badge variant="outline" className={`text-xs ${
                        task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400'
                      }`}>
                        {task.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-zinc-500">{project?.name}</p>
                    <p className="text-zinc-600 mt-1">
                      {format(parseISO(task.start_date), 'MMM d')} - {format(parseISO(task.end_date), 'MMM d')} • 
                      {task.estimated_hours || task.planned_shop_hours || task.planned_field_hours || 0}h
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {conflictAnalysis.conflictLevel === 'critical' && (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400 text-xs">
              <strong>Overallocation detected.</strong> This resource is allocated {conflictAnalysis.totalAllocation}% 
              across {conflictAnalysis.projectCount} project{conflictAnalysis.projectCount !== 1 ? 's' : ''}. 
              Consider reassigning tasks or hiring additional resources.
            </AlertDescription>
          </Alert>
        )}

        {conflictAnalysis.conflictLevel === 'warning' && (
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-amber-400 text-xs">
              <strong>High utilization.</strong> Resource has limited capacity remaining. 
              Monitor closely to prevent overload.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}