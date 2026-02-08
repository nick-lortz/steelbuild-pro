import React, { useMemo } from 'react';
import { apiClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

export default function ResourceAllocationView({ projectId }) {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => apiClient.entities.Task.filter({ project_id: projectId })
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => apiClient.entities.Resource.list()
  });

  // Aggregate allocations by resource and type
  const allocationData = useMemo(() => {
    const resourceAlloc = {};
    const typeAlloc = { labor: 0, equipment: 0, subcontractor: 0 };

    tasks.forEach(task => {
      if (task.assigned_resources) {
        task.assigned_resources.forEach(resourceId => {
          const resource = resources.find(r => r.id === resourceId);
          if (resource) {
            resourceAlloc[resource.name] = (resourceAlloc[resource.name] || 0) + 1;
            typeAlloc[resource.type] = (typeAlloc[resource.type] || 0) + 1;
          }
        });
      }
      if (task.assigned_equipment) {
        task.assigned_equipment.forEach(equipId => {
          const equip = resources.find(r => r.id === equipId);
          if (equip) {
            resourceAlloc[equip.name] = (resourceAlloc[equip.name] || 0) + 1;
            typeAlloc['equipment'] = (typeAlloc['equipment'] || 0) + 1;
          }
        });
      }
    });

    return {
      byResource: Object.entries(resourceAlloc).map(([name, count]) => ({
        name,
        tasks: count
      })).sort((a, b) => b.tasks - a.tasks).slice(0, 10),
      byType: Object.entries(typeAlloc).map(([type, count]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: count
      })).filter(t => t.value > 0)
    };
  }, [tasks, resources]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* By Resource */}
      <div>
        <h3 className="font-semibold mb-4">Top Assigned Resources</h3>
        {allocationData.byResource.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={allocationData.byResource}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="tasks" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-muted-foreground py-8">No resources assigned</p>
        )}
      </div>

      {/* By Type */}
      <div>
        <h3 className="font-semibold mb-4">Allocation by Resource Type</h3>
        {allocationData.byType.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={allocationData.byType} dataKey="value" label nameKey="name">
                {allocationData.byType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-muted-foreground py-8">No allocations</p>
        )}
      </div>
    </div>
  );
}