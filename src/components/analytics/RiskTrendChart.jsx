import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from "@/components/ui/badge";

export default function RiskTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Risk Assessment Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">No risk data available for selected filters.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base">Risk Assessment Trends</CardTitle>
        <p className="text-xs text-zinc-500 mt-1">Risk levels and mitigation progress over time</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis 
              dataKey="date" 
              stroke="#71717a"
              style={{ fontSize: '11px' }}
            />
            <YAxis 
              stroke="#71717a"
              style={{ fontSize: '11px' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#18181b', 
                border: '1px solid #27272a',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line 
              type="monotone" 
              dataKey="high_risk" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="High Risk"
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="medium_risk" 
              stroke="#f59e0b" 
              strokeWidth={2}
              name="Medium Risk"
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="low_risk" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Low Risk"
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="mitigated" 
              stroke="#3b82f6" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Mitigated"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Current Risk Summary */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-zinc-800">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">High Risk</p>
            <p className="text-2xl font-bold text-red-500 mt-1">
              {data[data.length - 1]?.high_risk || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Medium Risk</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">
              {data[data.length - 1]?.medium_risk || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Low Risk</p>
            <p className="text-2xl font-bold text-green-500 mt-1">
              {data[data.length - 1]?.low_risk || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Mitigated</p>
            <p className="text-2xl font-bold text-blue-500 mt-1">
              {data[data.length - 1]?.mitigated || 0}
            </p>
          </div>
        </div>

        {/* Trend Indicator */}
        {data.length >= 2 && (
          <div className="mt-4 p-3 bg-zinc-950 rounded border border-zinc-800">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">30-Day Trend</p>
              <Badge className={
                (data[data.length - 1]?.high_risk || 0) > (data[0]?.high_risk || 0)
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-green-500/20 text-green-400'
              }>
                {(data[data.length - 1]?.high_risk || 0) > (data[0]?.high_risk || 0)
                  ? 'Increasing Risk'
                  : 'Decreasing Risk'}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}