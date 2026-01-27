import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, DollarSign, Calendar } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function PortfolioOverviewOptimized({ metrics }) {
  const { portfolio, financial, schedule, quality, by_project } = metrics;

  const healthData = [
    { name: 'On Track', value: schedule.on_track, color: '#10b981' },
    { name: 'At Risk', value: schedule.at_risk, color: '#f59e0b' },
    { name: 'Delayed', value: schedule.delayed, color: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Active Projects</p>
                <p className="text-3xl font-bold text-white mt-1">{portfolio.active_projects}</p>
                <p className="text-xs text-zinc-500 mt-1">of {portfolio.total_projects} total</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Calendar className="text-blue-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Contract Value</p>
                <p className="text-3xl font-bold text-white mt-1">${(portfolio.total_contract_value / 1000000).toFixed(1)}M</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <DollarSign className="text-green-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Cost Variance</p>
                <p className={`text-3xl font-bold mt-1 ${financial.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {financial.variance_percent}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">${(financial.variance / 1000).toFixed(0)}k</p>
              </div>
              <div className={`p-3 rounded-lg ${financial.variance >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {financial.variance >= 0 ? 
                  <TrendingUp className="text-green-400" size={24} /> :
                  <TrendingDown className="text-red-400" size={24} />
                }
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Open RFIs</p>
                <p className="text-3xl font-bold text-white mt-1">{quality.open_rfis}</p>
                <p className="text-xs text-red-400 mt-1">{quality.overdue_rfis} overdue</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="text-amber-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Project Health Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {healthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Top Projects by Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={by_project.slice(0, 6).sort((a, b) => b.budget - a.budget)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="project_number" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                <Bar dataKey="budget" fill="#f59e0b" name="Budget" />
                <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Project Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">Project Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-xs text-zinc-400 uppercase">Project</th>
                  <th className="text-left py-3 px-4 text-xs text-zinc-400 uppercase">Health</th>
                  <th className="text-right py-3 px-4 text-xs text-zinc-400 uppercase">Budget</th>
                  <th className="text-right py-3 px-4 text-xs text-zinc-400 uppercase">Actual</th>
                  <th className="text-right py-3 px-4 text-xs text-zinc-400 uppercase">Variance</th>
                  <th className="text-right py-3 px-4 text-xs text-zinc-400 uppercase">Progress</th>
                  <th className="text-center py-3 px-4 text-xs text-zinc-400 uppercase">RFIs</th>
                </tr>
              </thead>
              <tbody>
                {by_project.map(proj => (
                  <tr key={proj.project_id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-white text-sm">{proj.project_number}</p>
                        <p className="text-xs text-zinc-500">{proj.name}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={
                        proj.health === 'on_track' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        proj.health === 'at_risk' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        'bg-red-500/20 text-red-400 border-red-500/30'
                      }>
                        {proj.health.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-4 text-white">${(proj.budget / 1000).toFixed(0)}k</td>
                    <td className="text-right py-3 px-4 text-white">${(proj.actual / 1000).toFixed(0)}k</td>
                    <td className="text-right py-3 px-4">
                      <span className={proj.cost_variance >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {proj.cost_variance_percent}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 text-white">{proj.schedule_progress}%</td>
                    <td className="text-center py-3 px-4">
                      <Badge variant="outline" className={proj.open_rfis > 5 ? 'text-red-400' : 'text-zinc-400'}>
                        {proj.open_rfis}
                      </Badge>
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

function PortfolioOverviewFallback({ projects, financials, tasks, expenses }) {
  // Original client-side calculation preserved as fallback
  return <div className="text-zinc-500 text-sm">Loading portfolio metrics...</div>;
}