import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function BudgetOverviewChart({ financials = [], expenses = [] }) {
  const data = financials.map(fin => {
    const projExpenses = expenses.filter(e => e.cost_code_id === fin.cost_code_id)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    return {
      code: fin.cost_code_id?.substring(0, 8) || 'Other',
      budget: fin.current_budget || 0,
      actual: projExpenses,
      variance: (fin.current_budget || 0) - projExpenses
    };
  }).filter(d => d.budget > 0);

  if (data.length === 0) return null;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-sm">Budget vs Actual by Cost Code</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis dataKey="code" stroke="#a1a1aa" />
            <YAxis stroke="#a1a1aa" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#27272a', border: '1px solid #52525b' }}
              labelStyle={{ color: '#f1f5f9' }}
              formatter={(value) => `$${value.toLocaleString()}`}
            />
            <Legend />
            <Bar dataKey="budget" fill="#ea580c" name="Budget" />
            <Bar dataKey="actual" fill="#71717a" name="Actual" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}