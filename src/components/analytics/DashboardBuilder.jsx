import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Settings, Save, Trash2, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import MetricCard from './MetricCard';
import ChartWidget from './ChartWidget';
import HeatmapWidget from './HeatmapWidget';
import TableWidget from './TableWidget';

const AVAILABLE_METRICS = [
  { id: 'total_value', label: 'Total Contract Value', category: 'financial', type: 'currency' },
  { id: 'earned_value', label: 'Earned Value', category: 'financial', type: 'currency' },
  { id: 'actual_cost', label: 'Actual Cost', category: 'financial', type: 'currency' },
  { id: 'budget_variance', label: 'Budget Variance', category: 'financial', type: 'currency' },
  { id: 'margin', label: 'Margin %', category: 'financial', type: 'percent' },
  { id: 'active_projects', label: 'Active Projects', category: 'project', type: 'count' },
  { id: 'tasks_overdue', label: 'Overdue Tasks', category: 'schedule', type: 'count' },
  { id: 'tasks_completed', label: 'Completed Tasks', category: 'schedule', type: 'count' },
  { id: 'avg_task_duration', label: 'Avg Task Duration', category: 'schedule', type: 'days' },
  { id: 'resource_utilization', label: 'Resource Utilization', category: 'resource', type: 'percent' },
  { id: 'rfi_open', label: 'Open RFIs', category: 'quality', type: 'count' },
  { id: 'change_orders', label: 'Change Orders', category: 'quality', type: 'count' },
];

const CHART_TYPES = [
  { id: 'line', label: 'Line Chart', icon: '📈' },
  { id: 'bar', label: 'Bar Chart', icon: '📊' },
  { id: 'pie', label: 'Pie Chart', icon: '🥧' },
  { id: 'area', label: 'Area Chart', icon: '📉' },
  { id: 'heatmap', label: 'Heatmap', icon: '🔥' },
  { id: 'table', label: 'Table', icon: '📋' },
];

const TIME_RANGES = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '1y', label: 'Last Year' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' },
];

export default function DashboardBuilder({ 
  projectData, 
  tasks, 
  financials, 
  resources,
  expenses,
  onSaveConfig
}) {
  const [widgets, setWidgets] = useState([]);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [editingWidget, setEditingWidget] = useState(null);
  const [globalTimeRange, setGlobalTimeRange] = useState('30d');

  const [newWidget, setNewWidget] = useState({
    type: 'metric',
    metrics: [],
    chartType: 'line',
    timeRange: 'inherit',
    title: '',
    size: 'medium'
  });

  const calculatedMetrics = useMemo(() => {
    if (!projectData) return {};

    const totalValue = financials?.reduce((sum, f) => sum + (f.current_budget || 0), 0) || 0;
    const actualCost = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const earnedValue = financials?.reduce((sum, f) => sum + (f.actual_amount || 0), 0) || 0;
    
    return {
      total_value: totalValue,
      earned_value: earnedValue,
      actual_cost: actualCost,
      budget_variance: totalValue - actualCost,
      margin: totalValue > 0 ? ((totalValue - actualCost) / totalValue * 100) : 0,
      active_projects: projectData.filter(p => p.status === 'in_progress').length,
      tasks_overdue: tasks?.filter(t => {
        const today = new Date().toISOString().split('T')[0];
        return t.status !== 'completed' && t.end_date && t.end_date < today;
      }).length || 0,
      tasks_completed: tasks?.filter(t => t.status === 'completed').length || 0,
      avg_task_duration: tasks?.length > 0 
        ? tasks.reduce((sum, t) => sum + (t.duration_days || 0), 0) / tasks.length 
        : 0,
      resource_utilization: resources?.length > 0
        ? (resources.filter(r => r.status === 'assigned').length / resources.length * 100)
        : 0,
      rfi_open: 0, // Would fetch from RFI data
      change_orders: 0, // Would fetch from CO data
    };
  }, [projectData, tasks, financials, resources, expenses]);

  const handleAddWidget = () => {
    const widget = {
      ...newWidget,
      id: Date.now(),
      timeRange: newWidget.timeRange === 'inherit' ? globalTimeRange : newWidget.timeRange
    };
    setWidgets([...widgets, widget]);
    setShowAddWidget(false);
    setNewWidget({
      type: 'metric',
      metrics: [],
      chartType: 'line',
      timeRange: 'inherit',
      title: '',
      size: 'medium'
    });
  };

  const handleRemoveWidget = (id) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const handleUpdateWidget = (id, updates) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const renderWidget = (widget) => {
    const effectiveTimeRange = widget.timeRange === 'inherit' ? globalTimeRange : widget.timeRange;

    if (widget.type === 'metric') {
      return (
        <div className={cn(
          "grid gap-4",
          widget.size === 'small' ? 'grid-cols-2' : 
          widget.size === 'medium' ? 'grid-cols-1' : 
          'grid-cols-1'
        )}>
          {widget.metrics.map(metricId => {
            const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
            if (!metric) return null;
            return (
              <MetricCard
                key={metricId}
                title={metric.label}
                value={calculatedMetrics[metricId] || 0}
                type={metric.type}
                compact={widget.size === 'small'}
              />
            );
          })}
        </div>
      );
    }

    if (widget.type === 'chart') {
      return (
        <ChartWidget
          chartType={widget.chartType}
          metrics={widget.metrics}
          data={calculatedMetrics}
          timeRange={effectiveTimeRange}
          title={widget.title}
          tasks={tasks}
          financials={financials}
          expenses={expenses}
        />
      );
    }

    if (widget.type === 'heatmap') {
      return (
        <HeatmapWidget
          resources={resources}
          tasks={tasks}
          timeRange={effectiveTimeRange}
        />
      );
    }

    if (widget.type === 'table') {
      return (
        <TableWidget
          metrics={widget.metrics}
          data={projectData}
          timeRange={effectiveTimeRange}
        />
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* Global Controls */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Dashboard Configuration</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={globalTimeRange} onValueChange={setGlobalTimeRange}>
                <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {TIME_RANGES.map(tr => (
                    <SelectItem key={tr.value} value={tr.value}>{tr.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSaveConfig?.(widgets)}
              >
                <Save size={16} className="mr-2" />
                Save Layout
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Widgets Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {widgets.map(widget => (
          <Card key={widget.id} className={cn(
            "bg-zinc-900 border-zinc-800 relative group",
            widget.size === 'large' && 'md:col-span-2 lg:col-span-3',
            widget.size === 'wide' && 'md:col-span-2'
          )}>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditingWidget(widget)}
              >
                <Settings size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-400"
                onClick={() => handleRemoveWidget(widget.id)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
            <CardHeader className="pb-3">
              {widget.title && <CardTitle className="text-sm">{widget.title}</CardTitle>}
            </CardHeader>
            <CardContent>
              {renderWidget(widget)}
            </CardContent>
          </Card>
        ))}

        {/* Add Widget Button */}
        <Card 
          className="bg-zinc-900/50 border-zinc-800 border-dashed cursor-pointer hover:bg-zinc-900 transition-colors"
          onClick={() => setShowAddWidget(true)}
        >
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px]">
            <Plus size={32} className="text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-400">Add Widget</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Widget Dialog */}
      <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Widget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Widget Type</Label>
              <Select value={newWidget.type} onValueChange={(v) => setNewWidget({ ...newWidget, type: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="metric">Metric Cards</SelectItem>
                  <SelectItem value="chart">Chart</SelectItem>
                  <SelectItem value="heatmap">Heatmap</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Title (optional)</Label>
              <Input
                value={newWidget.title}
                onChange={(e) => setNewWidget({ ...newWidget, title: e.target.value })}
                placeholder="Widget title"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {newWidget.type === 'chart' && (
              <div>
                <Label>Chart Type</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {CHART_TYPES.filter(ct => ct.id !== 'heatmap' && ct.id !== 'table').map(ct => (
                    <Button
                      key={ct.id}
                      variant={newWidget.chartType === ct.id ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setNewWidget({ ...newWidget, chartType: ct.id })}
                    >
                      <span className="mr-2">{ct.icon}</span>
                      {ct.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Metrics</Label>
              <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                {AVAILABLE_METRICS.map(metric => (
                  <div key={metric.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={newWidget.metrics.includes(metric.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewWidget({ ...newWidget, metrics: [...newWidget.metrics, metric.id] });
                        } else {
                          setNewWidget({ ...newWidget, metrics: newWidget.metrics.filter(m => m !== metric.id) });
                        }
                      }}
                    />
                    <Label className="text-sm cursor-pointer">
                      {metric.label} <span className="text-xs text-zinc-500">({metric.category})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Size</Label>
                <Select value={newWidget.size} onValueChange={(v) => setNewWidget({ ...newWidget, size: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="wide">Wide</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Time Range</Label>
                <Select value={newWidget.timeRange} onValueChange={(v) => setNewWidget({ ...newWidget, timeRange: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="inherit">Use Global</SelectItem>
                    {TIME_RANGES.map(tr => (
                      <SelectItem key={tr.value} value={tr.value}>{tr.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddWidget(false)}>Cancel</Button>
              <Button 
                onClick={handleAddWidget}
                disabled={newWidget.metrics.length === 0}
              >
                Add Widget
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}