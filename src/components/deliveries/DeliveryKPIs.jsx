import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { differenceInDays, parseISO, format } from 'date-fns';

export default function DeliveryKPIs({ deliveries, projects }) {
  const chartData = useMemo(() => {
    const projectStats = {};

    projects.forEach(project => {
      const projectDeliveries = deliveries.filter(d => d.project_id === project.id);
      const completed = projectDeliveries.filter(d => d.delivery_status === 'delivered');
      const onTime = completed.filter(d => {
        if (!d.actual_date) return false;
        const variance = differenceInDays(
          parseISO(d.actual_date),
          parseISO(d.scheduled_date)
        );
        return variance <= 0;
      });

      if (projectDeliveries.length > 0) {
        projectStats[project.id] = {
          name: project.project_number,
          total: projectDeliveries.length,
          completed: completed.length,
          onTime: onTime.length,
          delayed: completed.length - onTime.length,
        };
      }
    });

    return Object.values(projectStats);
  }, [deliveries, projects]);

  const statusData = useMemo(() => {
    const counts = {
      scheduled: 0,
      in_transit: 0,
      delivered: 0,
      delayed: 0,
      cancelled: 0,
    };

    deliveries.forEach(d => {
      if (counts.hasOwnProperty(d.delivery_status)) {
        counts[d.delivery_status]++;
      }
    });

    return [
      { name: 'Scheduled', value: counts.scheduled, color: '#3b82f6' },
      { name: 'In Transit', value: counts.in_transit, color: '#f59e0b' },
      { name: 'Delivered', value: counts.delivered, color: '#10b981' },
      { name: 'Delayed', value: counts.delayed, color: '#ef4444' },
      { name: 'Cancelled', value: counts.cancelled, color: '#6b7280' },
    ].filter(item => item.value > 0);
  }, [deliveries]);

  const varianceData = useMemo(() => {
    const completed = deliveries.filter(d => d.delivery_status === 'delivered' && d.actual_date);
    
    const buckets = {
      'Early (>2d)': 0,
      'On Time (±2d)': 0,
      'Late (2-7d)': 0,
      'Very Late (>7d)': 0,
    };

    completed.forEach(d => {
      const variance = differenceInDays(
        parseISO(d.actual_date),
        parseISO(d.scheduled_date)
      );

      if (variance < -2) buckets['Early (>2d)']++;
      else if (variance <= 2) buckets['On Time (±2d)']++;
      else if (variance <= 7) buckets['Late (2-7d)']++;
      else buckets['Very Late (>7d)']++;
    });

    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [deliveries]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Deliveries by Project */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">Deliveries by Project</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="onTime" fill="#10b981" name="On Time" />
              <Bar dataKey="delayed" fill="#ef4444" name="Delayed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">Delivery Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Variance Analysis */}
      <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Delivery Variance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={varianceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis type="number" stroke="#a1a1aa" />
              <YAxis type="category" dataKey="name" stroke="#a1a1aa" />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="value" fill="#f59e0b" name="Deliveries" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}