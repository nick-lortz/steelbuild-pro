import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, TrendingUp, AlertCircle, Download, Users } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, parseISO, isWithinInterval, addDays } from 'date-fns';

export default function DetailedCapacityPlanner({ 
  resources, 
  tasks, 
  allocations, 
  projects,
  startDate,
  endDate 
}) {
  const [viewBy, setViewBy] = useState('week');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');

  const capacityData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const weeks = eachWeekOfInterval({ start, end });

    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart);

      const byResource = resources
        .filter(r => resourceTypeFilter === 'all' || r.type === resourceTypeFilter)
        .map(resource => {
          const weeklyCapacity = resource.weekly_capacity_hours || 40;

          // Find allocations for this week
          const weekAllocations = allocations.filter(alloc => {
            if (alloc.resource_id !== resource.id) return false;
            const allocStart = parseISO(alloc.start_date);
            const allocEnd = parseISO(alloc.end_date);
            return isWithinInterval(weekStart, { start: allocStart, end: allocEnd }) ||
                   isWithinInterval(allocStart, { start: weekStart, end: weekEnd });
          });

          // Find assigned tasks for this week
          const weekTasks = tasks.filter(task => {
            if (!task.start_date || !task.end_date) return false;
            
            const assignedResources = task.assigned_resources || [];
            const assignedEquipment = task.assigned_equipment || [];
            
            if (!assignedResources.includes(resource.id) && !assignedEquipment.includes(resource.id)) {
              return false;
            }

            const taskStart = parseISO(task.start_date);
            const taskEnd = parseISO(task.end_date);

            return isWithinInterval(weekStart, { start: taskStart, end: taskEnd }) ||
                   isWithinInterval(taskStart, { start: weekStart, end: weekEnd });
          });

          // Calculate demand
          const allocatedPercent = weekAllocations.reduce((sum, a) => sum + (a.allocation_percentage || 0), 0);
          
          const taskHours = weekTasks.reduce((sum, task) => {
            const taskHours = task.estimated_hours || task.planned_shop_hours || task.planned_field_hours || 0;
            const taskDurationDays = task.duration_days || 5;
            const weeklyHours = taskHours / (taskDurationDays / 7);
            return sum + weeklyHours;
          }, 0);

          const demandHours = Math.max(taskHours, (allocatedPercent / 100) * weeklyCapacity);
          const utilizationPercent = weeklyCapacity > 0 ? Math.round((demandHours / weeklyCapacity) * 100) : 0;

          return {
            resource,
            weeklyCapacity,
            demandHours: Math.round(demandHours),
            availableHours: Math.max(0, weeklyCapacity - demandHours),
            utilizationPercent,
            allocations: weekAllocations.length,
            tasks: weekTasks.length,
            isOverallocated: utilizationPercent > 100,
            isNearCapacity: utilizationPercent > 80 && utilizationPercent <= 100,
            isUnderutilized: utilizationPercent < 50
          };
        });

      const totalCapacity = byResource.reduce((sum, r) => sum + r.weeklyCapacity, 0);
      const totalDemand = byResource.reduce((sum, r) => sum + r.demandHours, 0);
      const overallocatedCount = byResource.filter(r => r.isOverallocated).length;
      const nearCapacityCount = byResource.filter(r => r.isNearCapacity).length;

      return {
        weekStart,
        weekEnd,
        label: format(weekStart, 'MMM d') + ' - ' + format(weekEnd, 'MMM d'),
        resources: byResource,
        totalCapacity,
        totalDemand,
        totalUtilization: totalCapacity > 0 ? Math.round((totalDemand / totalCapacity) * 100) : 0,
        overallocatedCount,
        nearCapacityCount,
        hasIssues: overallocatedCount > 0 || nearCapacityCount > 0
      };
    });
  }, [resources, tasks, allocations, startDate, endDate, resourceTypeFilter]);

  const summary = useMemo(() => {
    const peakUtilization = Math.max(...capacityData.map(w => w.totalUtilization), 0);
    const avgUtilization = capacityData.length > 0 
      ? Math.round(capacityData.reduce((sum, w) => sum + w.totalUtilization, 0) / capacityData.length)
      : 0;
    const weeksOverallocated = capacityData.filter(w => w.overallocatedCount > 0).length;
    const totalResourceWeeks = capacityData.reduce((sum, w) => sum + w.resources.length, 0);

    return { peakUtilization, avgUtilization, weeksOverallocated, totalResourceWeeks };
  }, [capacityData]);

  const exportToCSV = () => {
    const rows = [
      ['Week', 'Total Capacity (hrs)', 'Total Demand (hrs)', 'Utilization %', 'Overallocated Resources', 'Near Capacity Resources']
    ];

    capacityData.forEach(week => {
      rows.push([
        week.label,
        week.totalCapacity,
        week.totalDemand,
        week.totalUtilization,
        week.overallocatedCount,
        week.nearCapacityCount
      ]);
    });

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capacity_plan_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock size={20} className="text-amber-500" />
            Detailed Capacity Planning
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
              <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="labor">Labor Only</SelectItem>
                <SelectItem value="equipment">Equipment Only</SelectItem>
                <SelectItem value="subcontractor">Subcontractors</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={exportToCSV}
              className="border-zinc-700"
            >
              <Download size={14} className="mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase mb-1">Peak Utilization</p>
            <p className={`text-2xl font-bold ${summary.peakUtilization > 100 ? 'text-red-400' : 'text-white'}`}>
              {summary.peakUtilization}%
            </p>
          </div>
          <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase mb-1">Avg Utilization</p>
            <p className="text-2xl font-bold text-white">{summary.avgUtilization}%</p>
          </div>
          <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase mb-1">Overallocated Weeks</p>
            <p className={`text-2xl font-bold ${summary.weeksOverallocated > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {summary.weeksOverallocated}
            </p>
          </div>
          <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase mb-1">Total Resource-Weeks</p>
            <p className="text-2xl font-bold text-white">{summary.totalResourceWeeks}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border border-zinc-800 rounded overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950">
              <tr className="text-xs text-zinc-400 uppercase">
                <th className="text-left p-3 sticky left-0 bg-zinc-950">Week</th>
                <th className="text-right p-3">Capacity</th>
                <th className="text-right p-3">Demand</th>
                <th className="text-right p-3">Utilization</th>
                <th className="text-right p-3">Issues</th>
              </tr>
            </thead>
            <tbody>
              {capacityData.map((week, idx) => (
                <tr 
                  key={idx} 
                  className={`border-t border-zinc-800 ${
                    week.hasIssues ? 'bg-red-500/5' : ''
                  }`}
                >
                  <td className="p-3 text-sm text-white sticky left-0 bg-zinc-900">
                    {week.label}
                  </td>
                  <td className="p-3 text-sm text-right text-zinc-400">
                    {week.totalCapacity}h
                  </td>
                  <td className="p-3 text-sm text-right text-white font-mono">
                    {week.totalDemand}h
                  </td>
                  <td className="p-3 text-sm text-right">
                    <Badge className={
                      week.totalUtilization > 100 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      week.totalUtilization > 80 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      'bg-green-500/20 text-green-400 border-green-500/30'
                    }>
                      {week.totalUtilization}%
                    </Badge>
                  </td>
                  <td className="p-3 text-sm text-right">
                    {week.overallocatedCount > 0 && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                        {week.overallocatedCount} over
                      </Badge>
                    )}
                    {week.overallocatedCount === 0 && week.nearCapacityCount > 0 && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                        {week.nearCapacityCount} near
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}