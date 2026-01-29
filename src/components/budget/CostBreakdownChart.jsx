import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function CostBreakdownChart({ expenses = [] }) {
  const breakdown = expenses.reduce((acc, exp) => {
    const category = exp.category || 'other';
    const existing = acc.find(a => a.name === category);
    if (existing) {
      existing.value += exp.amount || 0;
    } else {
      acc.push({ name: category, value: exp.amount || 0 });
    }
    return acc;
  }, []).filter(d => d.value > 0);

  if (breakdown.length === 0) return null;

  const COLORS = ['#ea580c', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b'];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-sm">Cost Breakdown by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={breakdown}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: $${(value / 1000).toFixed(0)}k`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {breakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#27272a', border: '1px solid #52525b' }}
              labelStyle={{ color: '#f1f5f9' }}
              formatter={(value) => `$${value.toLocaleString()}`}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}