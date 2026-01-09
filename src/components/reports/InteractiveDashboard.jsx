import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, FileText, Clock, AlertTriangle, ChevronRight, X } from 'lucide-react';

export default function InteractiveDashboard({ projects, financials, expenses, resources, tasks, drawingSets }) {
  const [drillDownData, setDrillDownData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);

  // Portfolio-level KPIs
  const portfolioKPIs = useMemo(() => {
    const totalBudget = financials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
    const totalActual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const totalCommitted = financials.reduce((sum, f) => sum + (f.committed_amount || 0), 0);
    const totalForecast = financials.reduce((sum, f) => sum + (f.forecast_amount || 0), 0);

    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'in_progress').length,
      totalBudget,
      totalActual,
      totalCommitted,
      variance: totalBudget - totalActual,
      variancePercent: totalBudget > 0 ? ((totalBudget - totalActual) / totalBudget * 100).toFixed(1) : 0,
      totalResources: resources.length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      blockedTasks: tasks.filter(t => t.status === 'blocked').length
    };
  }, [projects, financials, resources, tasks]);

  // Project breakdown for charts
  const projectFinancialData = useMemo(() => {
    return projects.map(p => {
      const projectFinancials = financials.filter(f => f.project_id === p.id);
      const budget = projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
      const actual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const variance = budget - actual;

      return {
        name: p.project_number,
        fullName: p.name,
        projectId: p.id,
        budget,
        actual,
        variance,
        variancePercent: budget > 0 ? ((variance / budget) * 100).toFixed(1) : 0
      };
    }).sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)).slice(0, 10);
  }, [projects, financials]);

  const resourceUtilizationData = useMemo(() => {
    const utilizationByProject = {};
    
    projects.forEach(p => {
      const projectTasks = tasks.filter(t => t.project_id === p.id);
      const assignedResources = new Set();
      
      projectTasks.forEach(task => {
        (task.assigned_resources || []).forEach(r => assignedResources.add(r));
        (task.assigned_equipment || []).forEach(r => assignedResources.add(r));
      });
      
      utilizationByProject[p.id] = {
        name: p.project_number,
        fullName: p.name,
        projectId: p.id,
        resourceCount: assignedResources.size,
        taskCount: projectTasks.length
      };
    });
    
    return Object.values(utilizationByProject).sort((a, b) => b.resourceCount - a.resourceCount).slice(0, 10);
  }, [projects, tasks]);

  const projectStatusData = useMemo(() => {
    const statusCounts = {};
    projects.forEach(p => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });
    
    const colors = {
      bidding: '#3b82f6',
      awarded: '#10b981',
      in_progress: '#f59e0b',
      on_hold: '#ef4444',
      completed: '#22c55e',
      closed: '#6b7280'
    };
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count,
      fill: colors[status] || '#6b7280'
    }));
  }, [projects]);

  const handleDrillDown = (metric, projectId = null) => {
    let drillData = {};

    switch (metric) {
      case 'financial':
        if (projectId) {
          const project = projects.find(p => p.id === projectId);
          const projectFinancials = financials.filter(f => f.project_id === projectId);
          const projectExpenses = expenses.filter(e => e.project_id === projectId);
          
          drillData = {
            title: `Financial Details - ${project.project_number}`,
            project: project.name,
            details: projectFinancials.map(f => ({
              category: f.category,
              budget: f.current_budget || 0,
              committed: f.committed_amount || 0,
              actual: f.actual_amount || 0,
              forecast: f.forecast_amount || 0,
              variance: (f.current_budget || 0) - (f.actual_amount || 0)
            })),
            expenses: projectExpenses.map(e => ({
              date: e.expense_date,
              description: e.description,
              category: e.category,
              amount: e.amount,
              vendor: e.vendor,
              status: e.payment_status
            }))
          };
        }
        break;
        
      case 'resources':
        if (projectId) {
          const project = projects.find(p => p.id === projectId);
          const projectTasks = tasks.filter(t => t.project_id === projectId);
          const resourceIds = new Set();
          
          projectTasks.forEach(task => {
            (task.assigned_resources || []).forEach(r => resourceIds.add(r));
            (task.assigned_equipment || []).forEach(r => resourceIds.add(r));
          });
          
          const projectResources = resources.filter(r => resourceIds.has(r.id));
          
          drillData = {
            title: `Resource Allocation - ${project.project_number}`,
            project: project.name,
            resources: projectResources.map(r => ({
              name: r.name,
              type: r.type,
              status: r.status,
              taskCount: projectTasks.filter(t => 
                (t.assigned_resources || []).includes(r.id) || 
                (t.assigned_equipment || []).includes(r.id)
              ).length
            })),
            tasks: projectTasks.map(t => ({
              name: t.name,
              status: t.status,
              startDate: t.start_date,
              endDate: t.end_date,
              assignedCount: (t.assigned_resources || []).length + (t.assigned_equipment || []).length
            }))
          };
        }
        break;
        
      case 'detailing':
        if (projectId) {
          const project = projects.find(p => p.id === projectId);
          const projectDrawings = drawingSets.filter(d => d.project_id === projectId);
          
          drillData = {
            title: `Detailing Status - ${project.project_number}`,
            project: project.name,
            drawings: projectDrawings.map(d => ({
              name: d.set_name,
              number: d.set_number,
              status: d.status,
              revision: d.current_revision,
              sheetCount: d.sheet_count,
              dueDate: d.due_date,
              reviewer: d.reviewer
            })),
            statusSummary: {
              IFA: projectDrawings.filter(d => d.status === 'IFA').length,
              BFA: projectDrawings.filter(d => d.status === 'BFA').length,
              BFS: projectDrawings.filter(d => d.status === 'BFS').length,
              FFF: projectDrawings.filter(d => d.status === 'FFF').length
            }
          };
        }
        break;
    }

    setSelectedMetric(metric);
    setDrillDownData(drillData);
  };

  return (
    <div className="space-y-6">
      {/* Portfolio KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800 cursor-pointer hover:border-amber-500 transition-colors"
              onClick={() => handleDrillDown('projects')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm font-medium">Active Projects</p>
                <p className="text-3xl font-bold text-white">{portfolioKPIs.activeProjects}</p>
                <p className="text-xs text-zinc-500 mt-1">of {portfolioKPIs.totalProjects} total</p>
              </div>
              <FileText className="text-amber-500" size={28} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 cursor-pointer hover:border-amber-500 transition-colors"
              onClick={() => handleDrillDown('financial')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm font-medium">Budget Variance</p>
                <p className={`text-3xl font-bold ${portfolioKPIs.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {portfolioKPIs.variancePercent}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  ${Math.abs(portfolioKPIs.variance).toLocaleString()}
                </p>
              </div>
              {portfolioKPIs.variance >= 0 ? 
                <TrendingUp className="text-green-500" size={28} /> :
                <TrendingDown className="text-red-500" size={28} />
              }
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 cursor-pointer hover:border-amber-500 transition-colors"
              onClick={() => handleDrillDown('resources')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm font-medium">Resources</p>
                <p className="text-3xl font-bold text-white">{portfolioKPIs.totalResources}</p>
                <p className="text-xs text-zinc-500 mt-1">allocated across projects</p>
              </div>
              <Users className="text-blue-500" size={28} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 cursor-pointer hover:border-amber-500 transition-colors"
              onClick={() => handleDrillDown('tasks')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm font-medium">Task Progress</p>
                <p className="text-3xl font-bold text-white">
                  {portfolioKPIs.totalTasks > 0 ? 
                    ((portfolioKPIs.completedTasks / portfolioKPIs.totalTasks) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {portfolioKPIs.completedTasks} / {portfolioKPIs.totalTasks}
                </p>
              </div>
              {portfolioKPIs.blockedTasks > 0 ? 
                <AlertTriangle className="text-red-500" size={28} /> :
                <Clock className="text-green-500" size={28} />
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Variance by Project */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Top 10 Projects by Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectFinancialData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="name" stroke="#a1a1aa" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#a1a1aa" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                  cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }}
                  formatter={(value, name, props) => {
                    if (name === 'variance') return [`$${value.toLocaleString()}`, 'Variance'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="variance" 
                  fill="#f59e0b" 
                  onClick={(data) => handleDrillDown('financial', data.projectId)}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Status Distribution */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {projectStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resource Allocation by Project */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Resource Allocation by Project</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={resourceUtilizationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="name" stroke="#a1a1aa" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#a1a1aa" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Legend />
                <Bar 
                  dataKey="resourceCount" 
                  fill="#3b82f6" 
                  name="Resources"
                  onClick={(data) => handleDrillDown('resources', data.projectId)}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Drill-down Dialog */}
      <Dialog open={!!drillDownData} onOpenChange={() => setDrillDownData(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{drillDownData?.title}</DialogTitle>
              <Button variant="ghost" size="sm" onClick={() => setDrillDownData(null)}>
                <X size={18} />
              </Button>
            </div>
          </DialogHeader>
          
          {drillDownData && (
            <div className="space-y-6">
              {/* Financial Drill-down */}
              {selectedMetric === 'financial' && drillDownData.details && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Financial Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="text-left py-2 px-3 text-zinc-400">Category</th>
                          <th className="text-right py-2 px-3 text-zinc-400">Budget</th>
                          <th className="text-right py-2 px-3 text-zinc-400">Committed</th>
                          <th className="text-right py-2 px-3 text-zinc-400">Actual</th>
                          <th className="text-right py-2 px-3 text-zinc-400">Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drillDownData.details.map((item, idx) => (
                          <tr key={idx} className="border-b border-zinc-800">
                            <td className="py-2 px-3 capitalize">{item.category}</td>
                            <td className="text-right py-2 px-3">${item.budget.toLocaleString()}</td>
                            <td className="text-right py-2 px-3">${item.committed.toLocaleString()}</td>
                            <td className="text-right py-2 px-3">${item.actual.toLocaleString()}</td>
                            <td className={`text-right py-2 px-3 ${item.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${item.variance.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {drillDownData.expenses && drillDownData.expenses.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">Recent Expenses</h3>
                      <div className="space-y-2">
                        {drillDownData.expenses.slice(0, 10).map((expense, idx) => (
                          <div key={idx} className="p-3 bg-zinc-800 rounded-lg flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{expense.description || 'No description'}</p>
                              <p className="text-xs text-zinc-400">
                                {expense.date} • {expense.vendor || 'No vendor'} • {expense.category}
                              </p>
                            </div>
                            <Badge variant="outline">${expense.amount.toLocaleString()}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resource Drill-down */}
              {selectedMetric === 'resources' && drillDownData.resources && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Resource Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {drillDownData.resources.map((resource, idx) => (
                      <div key={idx} className="p-4 bg-zinc-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{resource.name}</p>
                          <Badge variant="outline" className="capitalize">{resource.type}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <Badge className="capitalize">{resource.status}</Badge>
                          <span>•</span>
                          <span>{resource.taskCount} tasks</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailing Drill-down */}
              {selectedMetric === 'detailing' && drillDownData.drawings && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Drawing Sets</h3>
                  
                  {drillDownData.statusSummary && (
                    <div className="grid grid-cols-4 gap-3 mb-6">
                      <Card className="bg-blue-900/20 border-blue-500/30">
                        <CardContent className="p-3 text-center">
                          <p className="text-2xl font-bold text-blue-400">{drillDownData.statusSummary.IFA}</p>
                          <p className="text-xs text-zinc-400">IFA</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-amber-900/20 border-amber-500/30">
                        <CardContent className="p-3 text-center">
                          <p className="text-2xl font-bold text-amber-400">{drillDownData.statusSummary.BFA}</p>
                          <p className="text-xs text-zinc-400">BFA</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-purple-900/20 border-purple-500/30">
                        <CardContent className="p-3 text-center">
                          <p className="text-2xl font-bold text-purple-400">{drillDownData.statusSummary.BFS}</p>
                          <p className="text-xs text-zinc-400">BFS</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-900/20 border-green-500/30">
                        <CardContent className="p-3 text-center">
                          <p className="text-2xl font-bold text-green-400">{drillDownData.statusSummary.FFF}</p>
                          <p className="text-xs text-zinc-400">FFF</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {drillDownData.drawings.map((drawing, idx) => (
                      <div key={idx} className="p-3 bg-zinc-800 rounded-lg flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{drawing.name}</p>
                          <p className="text-xs text-zinc-400">
                            {drawing.number} • Rev {drawing.revision || '—'} • {drawing.sheetCount || 0} sheets
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{drawing.status}</Badge>
                          {drawing.dueDate && (
                            <Badge variant="outline" className="text-xs">{drawing.dueDate}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}