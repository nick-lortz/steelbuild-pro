import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function ProjectComparison() {
  const [selectedProjects, setSelectedProjects] = useState([]);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-updated_date')
  });

  const { data: allFinancials = [] } = useQuery({
    queryKey: ['allFinancials'],
    queryFn: () => base44.entities.Financial.list()
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['allTasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const comparisonData = useMemo(() => {
    return selectedProjects.map(projId => {
      const project = projects.find(p => p.id === projId);
      const financials = allFinancials.filter(f => f.project_id === projId);
      const tasks = allTasks.filter(t => t.project_id === projId);

      const actualCost = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const budget = project?.contract_value || 0;
      const budgetUsed = budget > 0 ? (actualCost / budget) * 100 : 0;

      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const totalTasks = tasks.length;
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      const daysToCompletion = project?.target_completion 
        ? Math.ceil((new Date(project.target_completion) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: projId,
        name: project?.project_number || 'Unknown',
        fullName: project?.name || 'Unknown',
        budget: budget / 1000,
        actualCost: actualCost / 1000,
        budgetUsed,
        progress,
        efficiency: progress / Math.max(budgetUsed, 1),
        daysRemaining: daysToCompletion,
        tonnage: project?.rough_square_footage || 0,
        status: project?.status
      };
    });
  }, [selectedProjects, projects, allFinancials, allTasks]);

  const chartData = comparisonData.map(p => ({
    name: p.name,
    Budget: p.budget,
    'Actual Cost': p.actualCost,
    Progress: p.progress,
    'Budget Used': p.budgetUsed
  }));

  const radarData = useMemo(() => {
    const metrics = ['Progress', 'Budget Efficiency', 'Schedule', 'Scope', 'Quality'];
    return metrics.map(metric => {
      const data = { metric };
      comparisonData.forEach(p => {
        data[p.name] = Math.random() * 100; // Placeholder - would calculate real metrics
      });
      return data;
    });
  }, [comparisonData]);

  const handleProjectToggle = (projId) => {
    if (selectedProjects.includes(projId)) {
      setSelectedProjects(selectedProjects.filter(id => id !== projId));
    } else if (selectedProjects.length < 4) {
      setSelectedProjects([...selectedProjects, projId]);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Projects to Compare (Max 4)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {projects.slice(0, 8).map(project => (
              <Button
                key={project.id}
                variant={selectedProjects.includes(project.id) ? "default" : "outline"}
                onClick={() => handleProjectToggle(project.id)}
                disabled={!selectedProjects.includes(project.id) && selectedProjects.length >= 4}
                className="justify-start text-xs"
              >
                {project.project_number}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {comparisonData.length > 0 && (
        <>
          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Side-by-Side Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 text-muted-foreground">Metric</th>
                      {comparisonData.map(p => (
                        <th key={p.id} className="text-left p-2">{p.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 text-muted-foreground">Status</td>
                      {comparisonData.map(p => (
                        <td key={p.id} className="p-2">
                          <Badge variant="outline" className="capitalize">{p.status}</Badge>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 text-muted-foreground">Budget</td>
                      {comparisonData.map(p => (
                        <td key={p.id} className="p-2 font-medium">${p.budget.toFixed(0)}K</td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 text-muted-foreground">Actual Cost</td>
                      {comparisonData.map(p => (
                        <td key={p.id} className="p-2">${p.actualCost.toFixed(0)}K</td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 text-muted-foreground">Budget Used</td>
                      {comparisonData.map(p => (
                        <td key={p.id} className="p-2">
                          <span className={p.budgetUsed > 100 ? 'text-red-500' : 'text-green-500'}>
                            {p.budgetUsed.toFixed(1)}%
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 text-muted-foreground">Progress</td>
                      {comparisonData.map(p => (
                        <td key={p.id} className="p-2 font-medium">{p.progress.toFixed(1)}%</td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 text-muted-foreground">Efficiency</td>
                      {comparisonData.map(p => (
                        <td key={p.id} className="p-2">
                          {p.efficiency >= 1 ? (
                            <ArrowUpRight className="inline text-green-500" size={16} />
                          ) : (
                            <ArrowDownRight className="inline text-red-500" size={16} />
                          )}
                          {p.efficiency.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2 text-muted-foreground">Days Remaining</td>
                      {comparisonData.map(p => (
                        <td key={p.id} className="p-2">{p.daysRemaining || 'N/A'}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Budget vs Actual Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Budget vs Actual Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1c1c1c', border: '1px solid #333' }}
                    formatter={(value, name) => name.includes('Budget') || name.includes('Cost') ? `$${value.toFixed(0)}K` : `${value.toFixed(1)}%`}
                  />
                  <Legend />
                  <Bar dataKey="Budget" fill="#8884d8" />
                  <Bar dataKey="Actual Cost" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress & Budget Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1c1c1c', border: '1px solid #333' }}
                    formatter={(value) => `${value.toFixed(1)}%`}
                  />
                  <Legend />
                  <Bar dataKey="Progress" fill="#82ca9d" />
                  <Bar dataKey="Budget Used" fill="#ff7c7c" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {comparisonData.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
            Select projects above to compare
          </CardContent>
        </Card>
      )}
    </div>
  );
}