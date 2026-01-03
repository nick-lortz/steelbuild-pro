import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Clock } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const PHASES = [
  { id: 'detailing', label: 'Detailing', color: '#8b5cf6' },
  { id: 'fabrication', label: 'Fabrication', color: '#3b82f6' },
  { id: 'delivery', label: 'Delivery', color: '#f59e0b' },
  { id: 'erection', label: 'Erection', color: '#10b981' },
  { id: 'closeout', label: 'Closeout', color: '#6366f1' },
];

export default function ScheduleAdherenceWidget({ tasks }) {
  const phaseData = useMemo(() => {
    return PHASES.map(phase => {
      const phaseTasks = tasks.filter(t => t.phase === phase.id);
      const total = phaseTasks.length;
      const completed = phaseTasks.filter(t => t.status === 'completed').length;
      const onTime = phaseTasks.filter(t => {
        if (t.status === 'completed') return true;
        if (!t.end_date) return true;
        return new Date(t.end_date) > new Date();
      }).length;
      const overdue = phaseTasks.filter(t => {
        if (t.status === 'completed') return false;
        if (!t.end_date) return false;
        return new Date(t.end_date) < new Date();
      }).length;
      const adherence = total > 0 ? (onTime / total) * 100 : 100;

      return {
        ...phase,
        total,
        completed,
        onTime,
        overdue,
        adherence,
      };
    }).filter(p => p.total > 0);
  }, [tasks]);

  const chartData = phaseData.map(p => ({
    name: p.label,
    value: p.total,
    adherence: p.adherence,
    color: p.color,
  }));

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock size={18} className="text-blue-500" />
          Schedule Adherence by Phase
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Details */}
          <div className="space-y-3">
            {phaseData.map((phase) => (
              <div key={phase.id} className="p-3 bg-zinc-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: phase.color }}
                    />
                    <span className="text-white font-medium">{phase.label}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={phase.adherence >= 80 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}
                  >
                    {phase.adherence.toFixed(0)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-zinc-400">Total</p>
                    <p className="text-white font-medium">{phase.total}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Completed</p>
                    <p className="text-green-400 font-medium">{phase.completed}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Overdue</p>
                    <p className="text-red-400 font-medium">{phase.overdue}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}