import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Badge } from "@/components/ui/badge";

export default function ScheduleVarianceChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Schedule Variance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">No schedule data available for selected filters.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base">Schedule Variance Analysis</CardTitle>
        <p className="text-xs text-zinc-500 mt-1">Planned vs. actual progress by phase</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis 
              dataKey="phase" 
              stroke="#71717a"
              style={{ fontSize: '11px' }}
            />
            <YAxis 
              stroke="#71717a"
              style={{ fontSize: '11px' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#18181b', 
                border: '1px solid #27272a',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value) => [`${value}%`, '']}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <ReferenceLine y={0} stroke="#71717a" strokeDasharray="3 3" />
            <Bar dataKey="planned_progress" fill="#3b82f6" name="Planned Progress" />
            <Bar dataKey="actual_progress" fill="#10b981" name="Actual Progress" />
            <Bar dataKey="variance" fill="#ef4444" name="Variance" />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-3">Phase Status</p>
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-zinc-950 rounded border border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white capitalize">{item.phase}</span>
                <Badge className={
                  item.variance > 10 ? 'bg-red-500/20 text-red-400' :
                  item.variance < -10 ? 'bg-green-500/20 text-green-400' :
                  'bg-blue-500/20 text-blue-400'
                }>
                  {item.variance > 0 ? 'Behind' : item.variance < 0 ? 'Ahead' : 'On Track'}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Actual: {item.actual_progress}%</p>
                <p className="text-xs text-zinc-400">Planned: {item.planned_progress}%</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}