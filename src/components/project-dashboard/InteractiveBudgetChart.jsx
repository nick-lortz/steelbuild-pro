import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

export default function InteractiveBudgetChart({ projects, financials, expenses, sovItems }) {
  const [selectedProject, setSelectedProject] = useState(null);

  const chartData = projects.slice(0, 10).map(project => {
    const projectSOV = sovItems.filter(s => s.project_id === project.id);
    const projectExpenses = expenses.filter(e => e.project_id === project.id);
    const projectFinancials = financials.filter(f => f.project_id === project.id);

    let budget, actual;
    if (projectSOV.length > 0) {
      budget = projectSOV.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
      actual = projectExpenses
        .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    } else {
      budget = projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
      actual = projectExpenses
        .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    }

    return {
      name: project.project_number,
      fullName: project.name,
      budget: budget / 1000,
      actual: actual / 1000,
      variance: (budget - actual) / 1000,
      projectId: project.id
    };
  });

  const handleBarClick = (data) => {
    const project = projects.find(p => p.id === data.projectId);
    if (project) {
      setSelectedProject({
        ...project,
        ...data
      });
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-white mb-2">{payload[0].payload.fullName}</p>
          <p className="text-xs text-amber-400">
            Budget: ${payload[0].payload.budget.toFixed(1)}K
          </p>
          <p className="text-xs text-blue-400">
            Actual: ${payload[0].payload.actual.toFixed(1)}K
          </p>
          <p className={`text-xs ${payload[0].payload.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            Variance: ${payload[0].payload.variance.toFixed(1)}K
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">Click for details</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-500" />
            Budget vs Actuals
          </CardTitle>
          <p className="text-xs text-zinc-500">Click any bar for detailed breakdown</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis 
                dataKey="name" 
                stroke="#a1a1aa" 
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#a1a1aa" 
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                label={{ value: 'Amount ($K)', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar 
                dataKey="budget" 
                fill="#f59e0b" 
                name="Budget" 
                radius={[8, 8, 0, 0]}
                cursor="pointer"
                onClick={handleBarClick}
              />
              <Bar 
                dataKey="actual" 
                fill="#3b82f6" 
                name="Actual" 
                radius={[8, 8, 0, 0]}
                cursor="pointer"
                onClick={handleBarClick}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Drill-down Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>{selectedProject?.project_number} - Cost Breakdown</DialogTitle>
            <p className="text-sm text-zinc-400">{selectedProject?.fullName}</p>
          </DialogHeader>
          
          {selectedProject && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-zinc-800/50 border-zinc-700">
                  <CardContent className="p-4">
                    <p className="text-xs text-zinc-400 mb-1">Budget</p>
                    <p className="text-2xl font-bold text-amber-500">
                      ${selectedProject.budget.toFixed(1)}K
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-800/50 border-zinc-700">
                  <CardContent className="p-4">
                    <p className="text-xs text-zinc-400 mb-1">Actual</p>
                    <p className="text-2xl font-bold text-blue-400">
                      ${selectedProject.actual.toFixed(1)}K
                    </p>
                  </CardContent>
                </Card>
                <Card className={`${selectedProject.variance >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                  <CardContent className="p-4">
                    <p className="text-xs text-zinc-400 mb-1">Variance</p>
                    <p className={`text-2xl font-bold flex items-center gap-1 ${selectedProject.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedProject.variance >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                      ${Math.abs(selectedProject.variance).toFixed(1)}K
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3">Cost Analysis</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded">
                    <span className="text-sm text-zinc-400">Spend %</span>
                    <Badge className={selectedProject.budget > 0 && (selectedProject.actual / selectedProject.budget * 100) > 90 ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700'}>
                      {selectedProject.budget > 0 ? ((selectedProject.actual / selectedProject.budget) * 100).toFixed(1) : 0}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded">
                    <span className="text-sm text-zinc-400">Remaining Budget</span>
                    <span className="font-mono text-white">
                      ${(selectedProject.budget - selectedProject.actual).toFixed(1)}K
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded">
                    <span className="text-sm text-zinc-400">Performance Index</span>
                    <Badge className={selectedProject.actual > 0 && (selectedProject.budget / selectedProject.actual) < 1 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                      {selectedProject.actual > 0 ? (selectedProject.budget / selectedProject.actual).toFixed(2) : 'N/A'}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedProject.variance < 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                  <p className="text-xs text-red-400 font-semibold">⚠️ Over Budget</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    This project has exceeded its budget. Review expenses and forecast.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}