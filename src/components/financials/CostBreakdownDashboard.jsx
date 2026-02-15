import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const formatCurrency = (value) => {
  if (!value) return '$0';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function CostBreakdownDashboard({ expenses, expenseSplits, tasks = [], phases = [] }) {
  const breakdowns = useMemo(() => {
    const byPhase = {};
    const byTask = {};
    const bySovCode = {};
    const byCostCode = {};

    expenseSplits.forEach(split => {
      const amount = split.amount || 0;

      if (split.phase) {
        byPhase[split.phase] = (byPhase[split.phase] || 0) + amount;
      }

      if (split.task_id) {
        const task = tasks.find(t => t.id === split.task_id);
        const taskName = task?.name || split.task_id;
        byTask[taskName] = (byTask[taskName] || 0) + amount;
      }

      if (split.sov_code) {
        bySovCode[split.sov_code] = (bySovCode[split.sov_code] || 0) + amount;
      }

      if (split.cost_code_id) {
        byCostCode[split.cost_code_id] = (byCostCode[split.cost_code_id] || 0) + amount;
      }
    });

    return {
      byPhase: Object.entries(byPhase).map(([name, value]) => ({ name, value })),
      byTask: Object.entries(byTask).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
      bySovCode: Object.entries(bySovCode).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
      byCostCode: Object.entries(byCostCode).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)
    };
  }, [expenseSplits, tasks]);

  const totalCost = expenseSplits.reduce((sum, s) => sum + (s.amount || 0), 0);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Cost Breakdown Dashboard</CardTitle>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
            Total: {formatCurrency(totalCost)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="phase">
          <TabsList className="bg-zinc-950 border border-zinc-800 mb-6">
            <TabsTrigger value="phase">By Phase</TabsTrigger>
            <TabsTrigger value="task">By Task</TabsTrigger>
            <TabsTrigger value="sov">By SOV Line</TabsTrigger>
            <TabsTrigger value="costcode">By Cost Code</TabsTrigger>
          </TabsList>

          <TabsContent value="phase" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={breakdowns.byPhase}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                    >
                      {breakdowns.byPhase.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">Totals</h3>
                <div className="space-y-2">
                  {breakdowns.byPhase.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-zinc-950 border border-zinc-800 rounded">
                      <span className="text-white capitalize text-sm">{item.name}</span>
                      <span className="font-mono font-bold text-white">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="task">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={breakdowns.byTask}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" angle={-45} textAnchor="end" height={120} style={{ fontSize: 11 }} />
                <YAxis stroke="#71717a" style={{ fontSize: 11 }} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="sov">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={breakdowns.bySovCode}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" angle={-45} textAnchor="end" height={120} style={{ fontSize: 11 }} />
                <YAxis stroke="#71717a" style={{ fontSize: 11 }} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="costcode">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={breakdowns.byCostCode}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" angle={-45} textAnchor="end" height={120} style={{ fontSize: 11 }} />
                <YAxis stroke="#71717a" style={{ fontSize: 11 }} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                <Bar dataKey="value" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}