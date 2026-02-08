import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const STATUS_COLORS = {
  idle: '#f97316',
  productive: '#10b981',
  setup: '#3b82f6',
  breakdown: '#6b7280'
};

export default function EquipmentDashboard({ logs, equipment }) {
  const metrics = useMemo(() => {
    if (!logs) return {};

    const byEquip = {};

    logs.forEach(log => {
      if (!byEquip[log.equipment_id]) {
        byEquip[log.equipment_id] = {
          name: log.equipment_id,
          total_hours: 0,
          productive_hours: 0,
          idle_hours: 0,
          setup_hours: 0,
          breakdown_hours: 0,
          entries: 0,
          conflicts: 0,
          idle_reasons: {},
          last_used: null
        };
      }

      byEquip[log.equipment_id].total_hours += log.setup_time_hours + log.productive_hours + log.breakdown_time_hours + log.idle_hours;
      byEquip[log.equipment_id].productive_hours += log.productive_hours;
      byEquip[log.equipment_id].idle_hours += log.idle_hours;
      byEquip[log.equipment_id].setup_hours += log.setup_time_hours;
      byEquip[log.equipment_id].breakdown_hours += log.breakdown_time_hours;
      byEquip[log.equipment_id].entries += 1;
      byEquip[log.equipment_id].conflicts += log.conflicts?.length || 0;
      byEquip[log.equipment_id].last_used = log.log_date;

      if (log.idle_reason) {
        byEquip[log.equipment_id].idle_reasons[log.idle_reason] = (byEquip[log.equipment_id].idle_reasons[log.idle_reason] || 0) + log.idle_hours;
      }
    });

    return Object.entries(byEquip).map(([id, data]) => ({
      ...data,
      utilization: data.total_hours > 0 ? ((data.productive_hours / data.total_hours) * 100).toFixed(0) : 0,
      idle_rate: data.total_hours > 0 ? ((data.idle_hours / data.total_hours) * 100).toFixed(0) : 0,
      cost_idle: (data.idle_hours * 150).toFixed(0) // $150/hr idle equipment cost
    })).sort((a, b) => b.total_hours - a.total_hours);
  }, [logs]);

  if (!metrics || Object.keys(metrics).length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <p className="text-sm text-zinc-500">No equipment logs recorded</p>
        </CardContent>
      </Card>
    );
  }

  // Utilization chart
  const chartData = metrics.map(m => ({
    name: m.name,
    productive: parseFloat(m.productive_hours),
    setup: parseFloat(m.setup_hours),
    breakdown: parseFloat(m.breakdown_hours),
    idle: parseFloat(m.idle_hours)
  }));

  // Idle reasons pie
  const allIdleReasons = {};
  metrics.forEach(m => {
    Object.entries(m.idle_reasons).forEach(([reason, hours]) => {
      allIdleReasons[reason] = (allIdleReasons[reason] || 0) + hours;
    });
  });
  const idleData = Object.entries(allIdleReasons).map(([reason, hours]) => ({
    name: reason.replace(/_/g, ' ').toUpperCase(),
    value: parseFloat(hours.toFixed(1))
  }));

  const IDLE_COLORS = ['#f97316', '#ef4444', '#fbbf24', '#a78bfa', '#38bdf8'];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Total Hours</p>
            <p className="text-2xl font-bold text-white">
              {metrics.reduce((sum, m) => sum + parseFloat(m.total_hours), 0).toFixed(0)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Avg Utilization</p>
            <p className="text-2xl font-bold text-green-500">
              {(metrics.reduce((sum, m) => sum + parseFloat(m.utilization), 0) / metrics.length).toFixed(0)}%
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Total Idle Cost</p>
            <p className="text-2xl font-bold text-orange-500">
              ${metrics.reduce((sum, m) => sum + parseFloat(m.cost_idle), 0).toFixed(0)}
            </p>
          </CardContent>
        </Card>
        <Card className={`bg-zinc-900 border-zinc-800 ${metrics.some(m => m.conflicts > 0) ? 'border-red-800' : ''}`}>
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Active Conflicts</p>
            <p className={`text-2xl font-bold ${metrics.some(m => m.conflicts > 0) ? 'text-red-500' : 'text-green-500'}`}>
              {metrics.reduce((sum, m) => sum + m.conflicts, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Breakdown Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Equipment Hours Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <YAxis tick={{ fill: '#a1a1aa' }} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
              <Bar dataKey="productive" fill="#10b981" name="Productive" />
              <Bar dataKey="setup" fill="#3b82f6" name="Setup" />
              <Bar dataKey="breakdown" fill="#6b7280" name="Breakdown" />
              <Bar dataKey="idle" fill="#f97316" name="Idle" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Idle Reasons */}
      {idleData.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Idle Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={idleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}h`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {idleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={IDLE_COLORS[index % IDLE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {idleData.map((reason, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-zinc-800 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: IDLE_COLORS[idx % IDLE_COLORS.length] }}
                      />
                      <span>{reason.name}</span>
                    </div>
                    <Badge>{reason.value.toFixed(1)}h</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Equipment Details */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Equipment Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-2 text-zinc-500 font-bold">Equipment</th>
                  <th className="text-right py-2 text-zinc-500 font-bold">Total Hrs</th>
                  <th className="text-right py-2 text-zinc-500 font-bold">Productive</th>
                  <th className="text-right py-2 text-zinc-500 font-bold">Idle</th>
                  <th className="text-right py-2 text-zinc-500 font-bold">Utilization</th>
                  <th className="text-right py-2 text-zinc-500 font-bold">Idle Cost</th>
                  <th className="text-center py-2 text-zinc-500 font-bold">Conflicts</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                {metrics.map((eq, idx) => (
                  <tr key={idx} className="border-b border-zinc-800 hover:bg-zinc-800">
                    <td className="py-2 text-zinc-300 font-medium">{eq.name}</td>
                    <td className="text-right py-2 text-zinc-300">{eq.total_hours.toFixed(1)}</td>
                    <td className="text-right py-2 text-green-400">{eq.productive_hours.toFixed(1)}</td>
                    <td className="text-right py-2 text-orange-400">{eq.idle_hours.toFixed(1)}</td>
                    <td className="text-right py-2">
                      <Badge variant={eq.utilization >= 70 ? 'default' : 'outline'}>
                        {eq.utilization}%
                      </Badge>
                    </td>
                    <td className="text-right py-2 text-red-400">${eq.cost_idle}</td>
                    <td className="text-center py-2">
                      {eq.conflicts > 0 ? (
                        <Badge variant="destructive">{eq.conflicts}</Badge>
                      ) : (
                        <span className="text-green-500">✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}