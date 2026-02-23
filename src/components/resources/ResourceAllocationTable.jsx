import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Edit, Trash2, AlertTriangle, Clock } from 'lucide-react';

export default function ResourceAllocationTable({ resources, tasks, projects, onEdit, onDelete, onResourceClick }) {
  const enrichedResources = useMemo(() => {
    return resources.map(resource => {
      const assignedTasks = tasks.filter(task => {
        return (task.assigned_resources || []).includes(resource.id) || 
               (task.assigned_equipment || []).includes(resource.id);
      });

      const activeTasks = assignedTasks.filter(t => 
        t.status === 'in_progress' || t.status === 'not_started'
      );

      const maxConcurrent = resource.max_concurrent_assignments || 3;
      const utilization = Math.min((activeTasks.length / maxConcurrent) * 100, 100);
      const isOverallocated = activeTasks.length > maxConcurrent;

      const uniqueProjects = [...new Set(assignedTasks.map(t => t.project_id))];

      return {
        ...resource,
        assignedTasks,
        activeTasks,
        utilization: Math.round(utilization),
        isOverallocated,
        projectCount: uniqueProjects.length,
        projects: uniqueProjects.map(pid => projects.find(p => p.id === pid)).filter(Boolean)
      };
    });
  }, [resources, tasks, projects]);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle>Resource Allocations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Resource
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Active Tasks
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Projects
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {enrichedResources.map(resource => (
                <tr 
                  key={resource.id} 
                  className={cn(
                    "border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors",
                    resource.isOverallocated && "bg-red-500/5"
                  )}
                >
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onResourceClick?.(resource)}
                      className="text-left hover:text-amber-400 transition-colors"
                    >
                      <div className="font-medium text-sm text-white">{resource.name}</div>
                      {resource.classification && (
                        <div className="text-xs text-zinc-500">{resource.classification}</div>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="text-xs capitalize">{resource.type}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={cn(
                      "text-xs",
                      resource.status === 'available' ? 'bg-green-500/20 text-green-400' :
                      resource.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                      resource.status === 'unavailable' ? 'bg-zinc-700 text-zinc-400' :
                      'bg-amber-500/20 text-amber-400'
                    )}>
                      {resource.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {resource.isOverallocated && <AlertTriangle size={12} className="text-red-400" />}
                      <span className={cn(
                        "text-sm font-mono",
                        resource.isOverallocated ? "text-red-400 font-bold" : "text-white"
                      )}>
                        {resource.activeTasks.length}
                      </span>
                      <span className="text-zinc-500 text-sm">/ {resource.max_concurrent_assignments || 3}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-[120px]">
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all",
                              resource.utilization > 80 ? 'bg-red-500' :
                              resource.utilization > 50 ? 'bg-amber-500' :
                              'bg-green-500'
                            )}
                            style={{ width: `${Math.min(resource.utilization, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-mono text-zinc-300 min-w-[45px]">
                        {resource.utilization}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="outline" className="text-xs">
                      {resource.projectCount} {resource.projectCount === 1 ? 'project' : 'projects'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit?.(resource)}
                        className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete?.(resource)}
                        className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {enrichedResources.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No resources available
          </div>
        )}
      </CardContent>
    </Card>
  );
}