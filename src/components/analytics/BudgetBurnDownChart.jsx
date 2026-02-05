import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function BudgetBurnDownChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Budget Burn-Down Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">No budget data available for selected filters.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base">Budget Burn-Down Analysis</CardTitle>
        <p className="text-xs text-zinc-500 mt-1">Planned vs. actual spending over time</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="budgetPlanned" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="budgetActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis 
              dataKey="date" 
              stroke="#71717a"
              style={{ fontSize: '11px' }}
            />
            <YAxis 
              stroke="#71717a"
              style={{ fontSize: '11px' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#18181b', 
                border: '1px solid #27272a',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value) => [`$${value.toLocaleString()}`, '']}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area 
              type="monotone" 
              dataKey="planned_cumulative" 
              stroke="#3b82f6" 
              fill="url(#budgetPlanned)"
              strokeWidth={2}
              name="Planned Budget"
            />
            <Area 
              type="monotone" 
              dataKey="actual_cumulative" 
              stroke="#f59e0b" 
              fill="url(#budgetActual)"
              strokeWidth={2}
              name="Actual Spend"
            />
            <Line 
              type="monotone" 
              dataKey="forecast" 
              stroke="#ef4444" 
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
              name="Forecast"
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-zinc-800">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Total Budget</p>
            <p className="text-lg font-bold text-white mt-1">
              ${data[data.length - 1]?.total_budget?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Spent to Date</p>
            <p className="text-lg font-bold text-amber-500 mt-1">
              ${data[data.length - 1]?.actual_cumulative?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Variance</p>
            <p className={`text-lg font-bold mt-1 ${
              (data[data.length - 1]?.variance || 0) > 0 ? 'text-red-500' : 'text-green-500'
            }`}>
              ${Math.abs(data[data.length - 1]?.variance || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}