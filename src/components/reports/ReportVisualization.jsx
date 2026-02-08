import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function ReportVisualization({ data, chartType, reportName }) {
  // Prepare data for charts
  const chartData = data
    .filter(item => !item.isGrouped)
    .map(item => ({
      name: item.label,
      value: typeof item.value === 'number' ? Math.round(item.value * 100) / 100 : 0,
      module: item.module
    }));

  const groupedData = data.filter(item => item.isGrouped);

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis dataKey="name" stroke="#a1a1aa" tick={{ fill: '#a1a1aa' }} />
        <YAxis stroke="#a1a1aa" tick={{ fill: '#a1a1aa' }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
          labelStyle={{ color: '#f59e0b' }}
          itemStyle={{ color: '#fff' }}
        />
        <Legend wrapperStyle={{ color: '#a1a1aa' }} />
        <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis dataKey="name" stroke="#a1a1aa" tick={{ fill: '#a1a1aa' }} />
        <YAxis stroke="#a1a1aa" tick={{ fill: '#a1a1aa' }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
          labelStyle={{ color: '#f59e0b' }}
          itemStyle={{ color: '#fff' }}
        />
        <Legend wrapperStyle={{ color: '#a1a1aa' }} />
        <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
          itemStyle={{ color: '#fff' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left p-3 text-xs font-bold text-zinc-500 uppercase">Module</th>
            <th className="text-left p-3 text-xs font-bold text-zinc-500 uppercase">Metric</th>
            <th className="text-right p-3 text-xs font-bold text-zinc-500 uppercase">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx} className="border-b border-zinc-800 hover:bg-zinc-800/30">
              <td className="p-3">
                <Badge variant="outline" className="bg-zinc-800 border-zinc-700 text-xs">
                  {item.module}
                </Badge>
              </td>
              <td className="p-3 text-sm text-white">{item.label}</td>
              <td className="p-3 text-right">
                {item.isGrouped ? (
                  <div className="flex flex-wrap gap-1 justify-end">
                    {Object.entries(item.value).map(([key, val]) => (
                      <Badge key={key} className="bg-amber-500/20 text-amber-400 text-xs">
                        {key}: {val}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="font-mono text-lg text-amber-500">
                    {typeof item.value === 'number' 
                      ? item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : item.value
                    }
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderGroupedMetrics = () => {
    if (groupedData.length === 0) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {groupedData.map((item, idx) => {
          const entries = Object.entries(item.value);
          const total = entries.reduce((sum, [, val]) => sum + val, 0);

          return (
            <Card key={idx} className="bg-zinc-800/50 border-zinc-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{item.label}</CardTitle>
                <p className="text-xs text-zinc-500">{item.module}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {entries.map(([key, value]) => {
                    const percentage = total > 0 ? (value / total * 100).toFixed(1) : 0;
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 capitalize">{key}</span>
                          <span className="font-mono text-white">{value} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{reportName}</CardTitle>
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">
            {data.length} Metrics
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Key Metrics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {data.slice(0, 4).filter(item => !item.isGrouped).map((item, idx) => (
            <Card key={idx} className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">{item.label}</p>
                <p className="text-2xl font-bold font-mono text-amber-500">
                  {typeof item.value === 'number'
                    ? item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : item.value
                  }
                </p>
                <p className="text-[10px] text-zinc-600 mt-1">{item.module}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart Visualization */}
        {chartType === 'bar' && renderBarChart()}
        {chartType === 'line' && renderLineChart()}
        {chartType === 'pie' && renderPieChart()}
        {chartType === 'table' && renderTable()}

        {/* Grouped Metrics */}
        {renderGroupedMetrics()}
      </CardContent>
    </Card>
  );
}