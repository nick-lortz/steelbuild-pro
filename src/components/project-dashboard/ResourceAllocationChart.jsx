import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function ResourceAllocationChart() {
  const [selectedType, setSelectedType] = useState(null);

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => apiClient.entities.Resource.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.list(),
    staleTime: 5 * 60 * 1000
  });

  const chartData = useMemo(() => {
    const typeCount = {};
    resources.forEach(resource => {
      const type = resource.type || 'unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    return Object.entries(typeCount).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      type: type,
      resources: resources.filter(r => r.type === type)
    }));
  }, [resources]);

  const statusData = useMemo(() => {
    const statusCount = {
      available: 0,
      assigned: 0,
      unavailable: 0,
      on_leave: 0
    };
    resources.forEach(resource => {
      const status = resource.status || 'available';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      value: count,
      status: status
    }));
  }, [resources]);

  const handlePieClick = (data) => {
    setSelectedType(data);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-white mb-1">{payload[0].name}</p>
          <p className="text-xs text-amber-400">Count: {payload[0].value}</p>
          <p className="text-[10px] text-zinc-500 mt-1">Click for details</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-500" />
              Resources by Type
            </CardTitle>
            <p className="text-xs text-zinc-500">Click any segment for breakdown</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={handlePieClick}
                  cursor="pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Resource Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.status === 'available' ? '#10b981' :
                        entry.status === 'assigned' ? '#3b82f6' :
                        entry.status === 'unavailable' ? '#ef4444' :
                        '#f59e0b'
                      } 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Drill-down Dialog */}
      <Dialog open={!!selectedType} onOpenChange={() => setSelectedType(null)}>
        <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 text-white max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedType?.name} Resources</DialogTitle>
            <p className="text-sm text-zinc-400">Total: {selectedType?.value}</p>
          </DialogHeader>
          
          {selectedType && (
            <div className="space-y-3">
              {selectedType.resources.map(resource => {
                const project = resource.current_project_id ? projects.find(p => p.id === resource.current_project_id) : null;
                return (
                  <div key={resource.id} className="p-4 bg-zinc-800/50 rounded border border-zinc-700">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-white">{resource.name}</p>
                        {resource.classification && (
                          <p className="text-xs text-zinc-400 mt-1">{resource.classification}</p>
                        )}
                      </div>
                      <Badge className={
                        resource.status === 'available' ? 'bg-green-500/20 text-green-400' :
                        resource.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                        resource.status === 'unavailable' ? 'bg-red-500/20 text-red-400' :
                        'bg-amber-500/20 text-amber-400'
                      }>
                        {resource.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {resource.rate && (
                        <div className="text-xs">
                          <span className="text-zinc-500">Rate:</span>
                          <span className="text-white ml-1">
                            ${resource.rate}/{resource.rate_type || 'hr'}
                          </span>
                        </div>
                      )}
                      {resource.contact_name && (
                        <div className="text-xs">
                          <span className="text-zinc-500">Contact:</span>
                          <span className="text-white ml-1">{resource.contact_name}</span>
                        </div>
                      )}
                    </div>

                    {project && (
                      <div className="mt-3 pt-3 border-t border-zinc-700">
                        <p className="text-xs text-zinc-500">Current Project:</p>
                        <p className="text-sm text-amber-400 font-medium">
                          {project.project_number} - {project.name}
                        </p>
                      </div>
                    )}

                    {resource.skills && resource.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {resource.skills.map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-zinc-700 border-zinc-600">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}