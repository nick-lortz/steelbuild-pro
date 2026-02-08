import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, AlertTriangle, TrendingUp, Clock, Wrench, Package } from 'lucide-react';
import { parseISO, isAfter } from 'date-fns';

export default function ResourceDashboard({ resources, tasks, projects }) {
  const metrics = useMemo(() => {
    const byType = { labor: 0, equipment: 0, subcontractor: 0 };
    const byStatus = { available: 0, assigned: 0, unavailable: 0, on_leave: 0 };
    const conflicts = [];
    const skillsInventory = {};
    
    resources.forEach(resource => {
      byType[resource.type] = (byType[resource.type] || 0) + 1;
      byStatus[resource.status] = (byStatus[resource.status] || 0) + 1;
      
      // Skills inventory
      if (resource.skills && Array.isArray(resource.skills)) {
        resource.skills.forEach(skill => {
          if (!skillsInventory[skill]) {
            skillsInventory[skill] = [];
          }
          skillsInventory[skill].push(resource);
        });
      }
      
      // Detect overallocation
      const resourceTasks = tasks.filter(task => {
        const isAssigned = 
          (task.assigned_resources || []).includes(resource.id) ||
          (task.assigned_equipment || []).includes(resource.id);
        
        if (!isAssigned || task.status === 'completed') return false;
        
        try {
          if (task.start_date) {
            const startDate = parseISO(task.start_date);
            const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            return !isAfter(startDate, thirtyDaysOut);
          }
        } catch {
          return false;
        }
        
        return true;
      });
      
      const maxConcurrent = resource.max_concurrent_assignments || 3;
      const activeTaskCount = resourceTasks.filter(t => t.status === 'in_progress').length;
      
      if (activeTaskCount > maxConcurrent) {
        conflicts.push({
          resource,
          taskCount: activeTaskCount,
          maxAllowed: maxConcurrent,
          tasks: resourceTasks
        });
      }
    });
    
    return {
      byType,
      byStatus,
      conflicts,
      skillsInventory,
      totalResources: resources.length
    };
  }, [resources, tasks]);

  const utilizationData = useMemo(() => {
    return resources.map(resource => {
      const resourceTasks = tasks.filter(task => {
        const isAssigned = 
          (task.assigned_resources || []).includes(resource.id) ||
          (task.assigned_equipment || []).includes(resource.id);
        return isAssigned && task.status !== 'completed';
      });
      
      const activeTaskCount = resourceTasks.filter(t => t.status === 'in_progress').length;
      const maxConcurrent = resource.max_concurrent_assignments || 3;
      const utilization = Math.min((activeTaskCount / maxConcurrent) * 100, 100);
      
      return {
        id: resource.id,
        name: resource.name,
        type: resource.type,
        status: resource.status,
        utilization: Math.round(utilization),
        activeTasks: activeTaskCount,
        totalTasks: resourceTasks.length
      };
    }).sort((a, b) => b.utilization - a.utilization);
  }, [resources, tasks]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Total Resources</p>
                <p className="text-3xl font-bold text-white">{metrics.totalResources}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px]">
                    <Wrench size={8} className="mr-1" />
                    {metrics.byType.labor} Labor
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    <Package size={8} className="mr-1" />
                    {metrics.byType.equipment} Equip
                  </Badge>
                </div>
              </div>
              <Users size={24} className="text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Available</p>
                <p className="text-3xl font-bold text-green-400">{metrics.byStatus.available}</p>
                <p className="text-xs text-zinc-500 mt-2">
                  {metrics.totalResources > 0 
                    ? Math.round((metrics.byStatus.available / metrics.totalResources) * 100)
                    : 0}% ready
                </p>
              </div>
              <Clock size={24} className="text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Assigned</p>
                <p className="text-3xl font-bold text-blue-400">{metrics.byStatus.assigned}</p>
                <p className="text-xs text-zinc-500 mt-2">
                  {metrics.totalResources > 0 
                    ? Math.round((metrics.byStatus.assigned / metrics.totalResources) * 100)
                    : 0}% utilized
                </p>
              </div>
              <TrendingUp size={24} className="text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Conflicts</p>
                <p className={`text-3xl font-bold ${metrics.conflicts.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {metrics.conflicts.length}
                </p>
                <p className="text-xs text-zinc-500 mt-2">
                  {metrics.conflicts.length > 0 ? 'Needs attention' : 'All clear'}
                </p>
              </div>
              <AlertTriangle size={24} className={metrics.conflicts.length > 0 ? 'text-red-500' : 'text-green-500'} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conflict Alerts */}
      {metrics.conflicts.length > 0 && (
        <Card className="bg-red-500/5 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-400">
              <AlertTriangle size={18} />
              Resource Overallocation Detected ({metrics.conflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.conflicts.map((conflict, idx) => (
                <div key={idx} className="p-4 bg-zinc-900 rounded-lg border border-red-500/20">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-white">{conflict.resource.name}</p>
                      <p className="text-sm text-zinc-400 capitalize">{conflict.resource.type}</p>
                    </div>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      {conflict.taskCount} / {conflict.maxAllowed} tasks
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Active Tasks:</p>
                    {conflict.tasks.slice(0, 5).map(task => {
                      const project = projects.find(p => p.id === task.project_id);
                      return (
                        <div key={task.id} className="flex items-center justify-between text-xs py-1">
                          <span className="text-zinc-300">{task.name}</span>
                          <span className="text-zinc-500">{project?.project_number}</span>
                        </div>
                      );
                    })}
                    {conflict.tasks.length > 5 && (
                      <p className="text-xs text-zinc-600 italic">+{conflict.tasks.length - 5} more</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills Inventory */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">Skills Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(metrics.skillsInventory).map(([skill, resourceList]) => (
              <div key={skill} className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-white">{skill}</p>
                  <Badge variant="outline" className="text-xs">
                    {resourceList.length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {resourceList.slice(0, 3).map(r => (
                    <Badge key={r.id} className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                      {r.name}
                    </Badge>
                  ))}
                  {resourceList.length > 3 && (
                    <Badge className="text-[10px] bg-zinc-700 text-zinc-400">
                      +{resourceList.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {Object.keys(metrics.skillsInventory).length === 0 && (
              <div className="col-span-full text-center py-8 text-zinc-500">
                No skills data available. Add skills to resources to build inventory.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Utilization Overview */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">Resource Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {utilizationData.slice(0, 15).map(resource => (
              <div key={resource.id} className="flex items-center gap-4">
                <div className="w-40 truncate">
                  <p className="text-sm font-medium text-white truncate">{resource.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {resource.type}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] ${
                        resource.status === 'available' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                        resource.status === 'assigned' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                        'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      {resource.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500">
                      {resource.activeTasks} active • {resource.totalTasks} total
                    </span>
                    <span className={`text-xs font-medium ${
                      resource.utilization > 80 ? 'text-red-400' :
                      resource.utilization > 50 ? 'text-amber-400' :
                      'text-green-400'
                    }`}>
                      {resource.utilization}%
                    </span>
                  </div>
                  <Progress 
                    value={resource.utilization} 
                    className={`h-2 ${
                      resource.utilization > 80 ? '[&>div]:bg-red-500' :
                      resource.utilization > 50 ? '[&>div]:bg-amber-500' :
                      '[&>div]:bg-green-500'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}