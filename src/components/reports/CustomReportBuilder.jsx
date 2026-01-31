import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, BarChart3, LineChart, PieChart as PieChartIcon, TrendingUp, Download } from 'lucide-react';
import ReportVisualization from './ReportVisualization';
import ReportExport from './ReportExport';
import { toast } from 'sonner';

const METRIC_DEFINITIONS = {
  budget: {
    label: 'Budget & Cost',
    icon: TrendingUp,
    metrics: [
      { id: 'total_budget', label: 'Total Budget', aggregation: 'sum', field: 'budgeted_amount' },
      { id: 'actual_cost', label: 'Actual Cost', aggregation: 'sum', field: 'actual_amount' },
      { id: 'variance', label: 'Budget Variance', aggregation: 'calculated', calculation: 'budget-actual' },
      { id: 'cost_by_category', label: 'Cost by Category', aggregation: 'group', groupBy: 'category' },
      { id: 'forecast_amount', label: 'Forecast EAC', aggregation: 'sum', field: 'forecast_amount' }
    ],
    entity: 'BudgetLineItem'
  },
  schedule: {
    label: 'Schedule & Tasks',
    icon: BarChart3,
    metrics: [
      { id: 'total_tasks', label: 'Total Tasks', aggregation: 'count' },
      { id: 'completed_tasks', label: 'Completed Tasks', aggregation: 'count', filter: { status: 'completed' } },
      { id: 'overdue_tasks', label: 'Overdue Tasks', aggregation: 'count', filter: 'overdue' },
      { id: 'tasks_by_status', label: 'Tasks by Status', aggregation: 'group', groupBy: 'status' },
      { id: 'avg_completion', label: 'Avg Progress %', aggregation: 'avg', field: 'progress' }
    ],
    entity: 'Task'
  },
  resources: {
    label: 'Resources',
    icon: LineChart,
    metrics: [
      { id: 'total_resources', label: 'Total Resources', aggregation: 'count' },
      { id: 'available_resources', label: 'Available', aggregation: 'count', filter: { status: 'available' } },
      { id: 'assigned_resources', label: 'Assigned', aggregation: 'count', filter: { status: 'assigned' } },
      { id: 'resources_by_type', label: 'Resources by Type', aggregation: 'group', groupBy: 'type' },
      { id: 'utilization_rate', label: 'Utilization Rate %', aggregation: 'calculated', calculation: 'assigned/total*100' }
    ],
    entity: 'Resource'
  },
  documents: {
    label: 'Documents',
    icon: PieChartIcon,
    metrics: [
      { id: 'total_docs', label: 'Total Documents', aggregation: 'count' },
      { id: 'pending_review', label: 'Pending Review', aggregation: 'count', filter: { workflow_stage: 'pending_review' } },
      { id: 'approved_docs', label: 'Approved', aggregation: 'count', filter: { status: 'approved' } },
      { id: 'docs_by_category', label: 'Docs by Category', aggregation: 'group', groupBy: 'category' },
      { id: 'docs_by_phase', label: 'Docs by Phase', aggregation: 'group', groupBy: 'phase' }
    ],
    entity: 'Document'
  },
  rfis: {
    label: 'RFIs & Issues',
    icon: BarChart3,
    metrics: [
      { id: 'total_rfis', label: 'Total RFIs', aggregation: 'count' },
      { id: 'open_rfis', label: 'Open RFIs', aggregation: 'count', filter: { status: 'submitted' } },
      { id: 'answered_rfis', label: 'Answered', aggregation: 'count', filter: { status: 'answered' } },
      { id: 'avg_response_days', label: 'Avg Response Days', aggregation: 'avg', field: 'response_days_actual' },
      { id: 'rfis_by_priority', label: 'RFIs by Priority', aggregation: 'group', groupBy: 'priority' }
    ],
    entity: 'RFI'
  },
  financials: {
    label: 'Financials',
    icon: TrendingUp,
    metrics: [
      { id: 'contract_value', label: 'Contract Value', aggregation: 'sum', field: 'contract_value', entity: 'Project' },
      { id: 'total_expenses', label: 'Total Expenses', aggregation: 'sum', field: 'amount', entity: 'Expense' },
      { id: 'sov_earned', label: 'SOV Earned to Date', aggregation: 'sum', field: 'earned_to_date', entity: 'SOVItem' },
      { id: 'sov_billed', label: 'SOV Billed to Date', aggregation: 'sum', field: 'billed_to_date', entity: 'SOVItem' },
      { id: 'ready_to_bill', label: 'Ready to Bill', aggregation: 'calculated', calculation: 'earned-billed' }
    ],
    entity: 'Financial'
  }
};

const CHART_TYPES = [
  { id: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { id: 'line', label: 'Line Chart', icon: LineChart },
  { id: 'pie', label: 'Pie Chart', icon: PieChartIcon },
  { id: 'table', label: 'Table', icon: BarChart3 }
];

export default function CustomReportBuilder() {
  const [reportName, setReportName] = useState('Custom Report');
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [chartType, setChartType] = useState('bar');
  const [generatedData, setGeneratedData] = useState(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name')
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const { data: budgetLineItems = [] } = useQuery({
    queryKey: ['budget-line-items'],
    queryFn: () => base44.entities.BudgetLineItem.list()
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list()
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list()
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list()
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list()
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items'],
    queryFn: () => base44.entities.SOVItem.list()
  });

  const addMetric = (moduleId, metricId) => {
    const module = METRIC_DEFINITIONS[moduleId];
    const metric = module.metrics.find(m => m.id === metricId);
    
    if (metric && !selectedMetrics.find(m => m.fullId === `${moduleId}.${metricId}`)) {
      setSelectedMetrics([...selectedMetrics, {
        ...metric,
        module: moduleId,
        moduleLabel: module.label,
        fullId: `${moduleId}.${metricId}`,
        entity: metric.entity || module.entity
      }]);
    }
  };

  const removeMetric = (fullId) => {
    setSelectedMetrics(selectedMetrics.filter(m => m.fullId !== fullId));
  };

  const calculateMetricValue = (metric, data) => {
    let filtered = data;

    // Apply project filter
    if (selectedProjects.length > 0) {
      filtered = filtered.filter(item => selectedProjects.includes(item.project_id));
    }

    // Apply date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_date || item.start_date || item.expense_date);
        return itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
      });
    }

    // Apply metric-specific filters
    if (metric.filter) {
      if (metric.filter === 'overdue') {
        filtered = filtered.filter(item => {
          if (!item.end_date) return false;
          return new Date(item.end_date) < new Date() && item.status !== 'completed';
        });
      } else if (typeof metric.filter === 'object') {
        Object.entries(metric.filter).forEach(([key, value]) => {
          filtered = filtered.filter(item => item[key] === value);
        });
      }
    }

    // Calculate based on aggregation type
    switch (metric.aggregation) {
      case 'count':
        return filtered.length;
      
      case 'sum':
        return filtered.reduce((sum, item) => sum + (Number(item[metric.field]) || 0), 0);
      
      case 'avg':
        if (filtered.length === 0) return 0;
        const total = filtered.reduce((sum, item) => sum + (Number(item[metric.field]) || 0), 0);
        return total / filtered.length;
      
      case 'group':
        const groups = {};
        filtered.forEach(item => {
          const key = item[metric.groupBy] || 'unknown';
          groups[key] = (groups[key] || 0) + 1;
        });
        return groups;
      
      case 'calculated':
        // Handle special calculations
        if (metric.calculation === 'budget-actual') {
          const budget = filtered.reduce((sum, item) => sum + (Number(item.budgeted_amount) || 0), 0);
          const actual = filtered.reduce((sum, item) => sum + (Number(item.actual_amount) || 0), 0);
          return budget - actual;
        }
        if (metric.calculation === 'assigned/total*100') {
          const total = data.length;
          const assigned = data.filter(r => r.status === 'assigned').length;
          return total > 0 ? (assigned / total * 100).toFixed(1) : 0;
        }
        if (metric.calculation === 'earned-billed') {
          const earned = filtered.reduce((sum, item) => sum + (Number(item.earned_to_date) || 0), 0);
          const billed = filtered.reduce((sum, item) => sum + (Number(item.billed_to_date) || 0), 0);
          return earned - billed;
        }
        return 0;
      
      default:
        return filtered.length;
    }
  };

  const generateReport = () => {
    if (selectedMetrics.length === 0) {
      toast.error('Add at least one metric to generate report');
      return;
    }

    const dataMap = {
      Task: tasks,
      BudgetLineItem: budgetLineItems,
      Resource: resources,
      Document: documents,
      RFI: rfis,
      Expense: expenses,
      SOVItem: sovItems,
      Project: projects
    };

    const results = selectedMetrics.map(metric => {
      const data = dataMap[metric.entity] || [];
      const value = calculateMetricValue(metric, data);
      
      return {
        label: metric.label,
        value: value,
        module: metric.moduleLabel,
        aggregation: metric.aggregation,
        isGrouped: metric.aggregation === 'group'
      };
    });

    setGeneratedData(results);
    toast.success('Report generated');
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-500" />
            Build Custom Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Name */}
          <div className="space-y-2">
            <Label>Report Name</Label>
            <Input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          {/* Project Filter */}
          <div className="space-y-2">
            <Label>Filter by Projects (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {projects.map(project => (
                <Badge
                  key={project.id}
                  variant={selectedProjects.includes(project.id) ? 'default' : 'outline'}
                  className={`cursor-pointer ${selectedProjects.includes(project.id) ? 'bg-amber-500 text-black' : 'bg-zinc-800 border-zinc-700'}`}
                  onClick={() => {
                    setSelectedProjects(prev =>
                      prev.includes(project.id)
                        ? prev.filter(id => id !== project.id)
                        : [...prev, project.id]
                    );
                  }}
                >
                  {project.project_number}
                </Badge>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date (optional)</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date (optional)</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          {/* Metric Selection */}
          <div className="space-y-3">
            <Label>Select Metrics</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(METRIC_DEFINITIONS).map(([moduleId, module]) => {
                const Icon = module.icon;
                return (
                  <Card key={moduleId} className="bg-zinc-800/50 border-zinc-700">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4 text-amber-500" />
                        <h4 className="font-semibold text-sm">{module.label}</h4>
                      </div>
                      <div className="space-y-1">
                        {module.metrics.map(metric => {
                          const isSelected = selectedMetrics.find(m => m.fullId === `${moduleId}.${metric.id}`);
                          return (
                            <button
                              key={metric.id}
                              onClick={() => addMetric(moduleId, metric.id)}
                              disabled={isSelected}
                              className={`w-full text-left text-xs p-2 rounded transition-colors ${
                                isSelected
                                  ? 'bg-amber-500/20 text-amber-400 cursor-not-allowed'
                                  : 'hover:bg-zinc-700'
                              }`}
                            >
                              {metric.label}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Selected Metrics */}
          {selectedMetrics.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Metrics ({selectedMetrics.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedMetrics.map(metric => (
                  <Badge
                    key={metric.fullId}
                    className="bg-amber-500 text-black flex items-center gap-2"
                  >
                    {metric.moduleLabel}: {metric.label}
                    <button
                      onClick={() => removeMetric(metric.fullId)}
                      className="hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Chart Type */}
          <div className="space-y-2">
            <Label>Visualization Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {CHART_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setChartType(type.id)}
                    className={`p-3 rounded border transition-all ${
                      chartType === type.id
                        ? 'bg-amber-500 text-black border-amber-500'
                        : 'bg-zinc-800 border-zinc-700 hover:border-amber-500/50'
                    }`}
                  >
                    <Icon className="h-5 w-5 mx-auto mb-1" />
                    <p className="text-xs">{type.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateReport}
            disabled={selectedMetrics.length === 0}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {/* Report Visualization */}
      {generatedData && (
        <>
          <ReportVisualization
            data={generatedData}
            chartType={chartType}
            reportName={reportName}
          />

          <ReportExport
            data={generatedData}
            reportName={reportName}
            chartType={chartType}
            projects={selectedProjects.map(id => projects.find(p => p.id === id)?.project_number).filter(Boolean)}
            dateRange={dateRange}
          />
        </>
      )}
    </div>
  );
}