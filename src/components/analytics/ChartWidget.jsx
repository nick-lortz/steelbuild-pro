import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ChartWidget({ chartType, metrics, data, timeRange, title, tasks, financials, expenses }) {
  const chartData = useMemo(() => {
    // Generate time-series data based on timeRange
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const dataPoints = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const point = { date: dateStr };
      
      // Calculate metrics for this date
      if (expenses) {
        const dayExpenses = expenses.filter(e => e.expense_date <= dateStr);
        point.actual_cost = dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      }
      
      if (tasks) {
        point.tasks_completed = tasks.filter(t => 
          t.status === 'completed' && t.updated_date && t.updated_date.split('T')[0] <= dateStr
        ).length;
      }

      dataPoints.push(point);
    }

    return dataPoints;
  }, [timeRange, tasks, expenses]);

  const aggregateData = useMemo(() => {
    return metrics.map((metricId, idx) => ({
      name: metricId.replace(/_/g, ' '),
      value: data[metricId] || 0,
      color: COLORS[idx % COLORS.length]
    }));
  }, [metrics, data]);

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
          <YAxis stroke="#9ca3af" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#f3f4f6' }}
          />
          <Legend />
          {metrics.map((metric, idx) => (
            <Line 
              key={metric}
              type="monotone" 
              dataKey={metric} 
              stroke={COLORS[idx % COLORS.length]} 
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
          <YAxis stroke="#9ca3af" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#f3f4f6' }}
          />
          <Legend />
          {metrics.map((metric, idx) => (
            <Bar 
              key={metric}
              dataKey={metric} 
              fill={COLORS[idx % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
          <YAxis stroke="#9ca3af" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#f3f4f6' }}
          />
          <Legend />
          {metrics.map((metric, idx) => (
            <Area 
              key={metric}
              type="monotone" 
              dataKey={metric} 
              stroke={COLORS[idx % COLORS.length]} 
              fill={COLORS[idx % COLORS.length]}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={aggregateData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${entry.value}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {aggregateData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return null;
}