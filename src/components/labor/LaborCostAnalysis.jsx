import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function LaborCostAnalysis({ laborEntries, crews, budget = 50000 }) {
  const costAnalysis = useMemo(() => {
    if (!laborEntries || !crews) return { byDay: [], byCrew: [], summary: {} };

    // Cost by day
    const byDayMap = {};
    let totalCost = 0;
    let totalHours = 0;

    laborEntries.forEach(entry => {
      const date = entry.work_date;
      const hours = entry.actual_hours + entry.overtime_hours;
      const cost = hours * (entry.crew_size || 1) * 50; // $50/hr blended
      
      byDayMap[date] = (byDayMap[date] || 0) + cost;
      totalCost += cost;
      totalHours += hours;
    });

    const byDay = Object.entries(byDayMap)
      .map(([date, cost]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cost: parseFloat(cost.toFixed(0)),
        budget_daily: budget / 30
      }))
      .slice(-21);

    // Cost by crew
    const byCrew = crews.map(crew => {
      const crewEntries = laborEntries.filter(e => e.crew_id === crew.id);
      const hours = crewEntries.reduce((sum, e) => sum + e.actual_hours + e.overtime_hours, 0);
      const cost = hours * (crewEntries[0]?.crew_size || 1) * 50;
      const tons = crewEntries.reduce((sum, e) => sum + (e.productivity?.tons_installed || 0), 0);
      
      return {
        name: crew.crew_name,
        cost: parseFloat(cost.toFixed(0)),
        tons: parseFloat(tons.toFixed(1)),
        cost_per_ton: tons > 0 ? parseFloat((cost / tons).toFixed(0)) : 0,
        hours: parseFloat(hours.toFixed(1))
      };
    }).sort((a, b) => b.cost - a.cost);

    const avgCostPerTon = laborEntries.reduce((sum, e) => sum + (e.productivity?.tons_installed || 0), 0) > 0
      ? totalCost / laborEntries.reduce((sum, e) => sum + (e.productivity?.tons_installed || 0), 0)
      : 0;

    const pctBudget = (totalCost / budget * 100).toFixed(1);
    const remaining = budget - totalCost;

    return {
      byDay,
      byCrew,
      summary: {
        total_cost: parseFloat(totalCost.toFixed(0)),
        total_hours: parseFloat(totalHours.toFixed(1)),
        budget,
        remaining: parseFloat(remaining.toFixed(0)),
        pct_spent: pctBudget,
        avg_cost_per_ton: parseFloat(avgCostPerTon.toFixed(0)),
        avg_hourly_rate: (totalCost / (totalHours || 1)).toFixed(0)
      }
    };
  }, [laborEntries, crews, budget]);

  const budgetStatus = parseFloat(costAnalysis.summary.pct_spent) > 80 ? 'danger' : 
                       parseFloat(costAnalysis.summary.pct_spent) > 60 ? 'warning' : 'good';

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Total Cost</p>
            <p className="text-2xl font-bold text-white">${costAnalysis.summary.total_cost}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Budget Spent</p>
            <div className="flex items-end gap-2">
              <p className={`text-2xl font-bold ${
                budgetStatus === 'danger' ? 'text-red-500' :
                budgetStatus === 'warning' ? 'text-yellow-500' :
                'text-green-500'
              }`}>
                {costAnalysis.summary.pct_spent}%
              </p>
              <span className="text-xs text-zinc-600 mb-1">of ${(costAnalysis.summary.budget / 1000).toFixed(0)}k</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Cost/Ton</p>
            <p className="text-2xl font-bold text-white">${costAnalysis.summary.avg_cost_per_ton}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Remaining</p>
            <p className={`text-2xl font-bold ${costAnalysis.summary.remaining < 0 ? 'text-red-500' : 'text-green-500'}`}>
              ${costAnalysis.summary.remaining}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Cost Trend */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Daily Labor Cost Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={costAnalysis.byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <YAxis tick={{ fill: '#a1a1aa' }} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
              <Legend />
              <Line type="monotone" dataKey="cost" stroke="#14b8a6" strokeWidth={2} name="Actual" />
              <Line type="monotone" dataKey="budget_daily" stroke="#6b7280" strokeDasharray="5 5" name="Daily Budget" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost by Crew */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Cost by Crew</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costAnalysis.byCrew} layout="vertical" margin={{ left: 150 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis type="number" tick={{ fill: '#a1a1aa' }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
              <Bar dataKey="cost" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>

          {/* Crew Details Table */}
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-2 text-zinc-500 font-bold">Crew</th>
                  <th className="text-right py-2 text-zinc-500 font-bold">Hours</th>
                  <th className="text-right py-2 text-zinc-500 font-bold">Tons</th>
                  <th className="text-right py-2 text-zinc-500 font-bold">$/Ton</th>
                  <th className="text-right py-2 text-zinc-500 font-bold">Cost</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                {costAnalysis.byCrew.map((crew, idx) => (
                  <tr key={idx} className="border-b border-zinc-800 hover:bg-zinc-800">
                    <td className="py-2 text-zinc-300">{crew.name}</td>
                    <td className="text-right py-2 text-zinc-300">{crew.hours}</td>
                    <td className="text-right py-2 text-zinc-300">{crew.tons}</td>
                    <td className="text-right py-2 text-amber-500 font-bold">${crew.cost_per_ton}</td>
                    <td className="text-right py-2 font-bold text-white">${crew.cost}</td>
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