import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle } from 'lucide-react';

export default function ResourceAllocationHeatmap({ resources, projects, tasks, allocations }) {
  const heatmapData = useMemo(() => {
    if (!resources.length || !projects.length) return { matrix: [], maxValue: 0 };

    const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'awarded');
    const matrix = [];
    let maxValue = 0;

    // Create resource types grouping
    const resourceTypes = ['labor', 'equipment', 'subcontractor'];
    
    resourceTypes.forEach(type => {
      const typeResources = resources.filter(r => r.type === type);
      
      if (typeResources.length === 0) return;

      const row = {
        resourceType: type,
        allocations: {}
      };

      activeProjects.forEach(project => {
        // Count resources of this type assigned to this project
        const assignedCount = typeResources.filter(resource => {
          const hasTasks = tasks.some(task => 
            task.project_id === project.id && 
            (task.status === 'in_progress' || task.status === 'not_started') &&
            ((task.assigned_resources || []).includes(resource.id) || 
             (task.assigned_equipment || []).includes(resource.id))
          );
          return hasTasks || resource.current_project_id === project.id;
        }).length;

        row.allocations[project.id] = assignedCount;
        maxValue = Math.max(maxValue, assignedCount);
      });

      matrix.push(row);
    });

    return { matrix, projects: activeProjects, maxValue };
  }, [resources, projects, tasks, allocations]);

  const getHeatColor = (value, max) => {
    if (value === 0) return 'bg-zinc-800 text-zinc-600';
    const intensity = max > 0 ? (value / max) : 0;
    
    if (intensity >= 0.75) return 'bg-red-500 text-white';
    if (intensity >= 0.5) return 'bg-amber-500 text-black';
    if (intensity >= 0.25) return 'bg-yellow-500 text-black';
    return 'bg-green-500 text-white';
  };

  if (!heatmapData.matrix.length) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-12 text-center">
          <p className="text-zinc-500">No allocation data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users size={16} className="text-amber-500" />
          Resource Allocation Heatmap
        </CardTitle>
        <p className="text-xs text-zinc-500 mt-1">Resource count by type across active projects</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-3 text-xs font-bold text-zinc-400 uppercase border-b border-zinc-800 sticky left-0 bg-zinc-900 z-10">
                  Resource Type
                </th>
                {heatmapData.projects.map(project => (
                  <th key={project.id} className="text-center p-3 text-xs font-bold text-zinc-400 uppercase border-b border-zinc-800 min-w-[100px]">
                    <div className="truncate">{project.project_number}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.matrix.map(row => (
                <tr key={row.resourceType} className="border-b border-zinc-800">
                  <td className="p-3 text-sm font-medium text-white capitalize border-r border-zinc-800 sticky left-0 bg-zinc-900 z-10">
                    {row.resourceType}
                  </td>
                  {heatmapData.projects.map(project => {
                    const value = row.allocations[project.id] || 0;
                    return (
                      <td key={project.id} className="p-2 text-center">
                        <div className={`
                          ${getHeatColor(value, heatmapData.maxValue)}
                          rounded px-3 py-2 font-bold text-sm
                          transition-all hover:scale-110 cursor-default
                        `}>
                          {value}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
          <span className="text-xs text-zinc-500 font-bold uppercase">Intensity:</span>
          <div className="flex items-center gap-2">
            <div className="bg-zinc-800 w-6 h-6 rounded" />
            <span className="text-xs text-zinc-500">None</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-green-500 w-6 h-6 rounded" />
            <span className="text-xs text-zinc-500">Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-yellow-500 w-6 h-6 rounded" />
            <span className="text-xs text-zinc-500">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 w-6 h-6 rounded" />
            <span className="text-xs text-zinc-500">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-red-500 w-6 h-6 rounded" />
            <span className="text-xs text-zinc-500">Critical</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}