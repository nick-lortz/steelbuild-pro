import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Calendar, Download } from 'lucide-react';
import BudgetBurnDownChart from '@/components/analytics/BudgetBurnDownChart';
import ScheduleVarianceChart from '@/components/analytics/ScheduleVarianceChart';
import ResourceHeatmap from '@/components/analytics/ResourceHeatmap';
import RiskTrendChart from '@/components/analytics/RiskTrendChart';
import { format, subMonths } from 'date-fns';

export default function ProjectAnalyticsDashboard() {
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.list(),
    initialData: []
  });

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['project-analytics', selectedProjectId, dateFrom, dateTo],
    queryFn: async () => {
      const response = await apiClient.functions.invoke('getAdvancedProjectAnalytics', {
        project_id: selectedProjectId === 'all' ? null : selectedProjectId,
        date_from: dateFrom,
        date_to: dateTo
      });
      return response.data;
    },
    enabled: !!(dateFrom && dateTo)
  });

  const handleExport = async () => {
    const exportData = {
      project_id: selectedProjectId,
      date_from: dateFrom,
      date_to: dateTo,
      format: 'pdf'
    };
    
    const response = await apiClient.functions.invoke('exportAnalyticsReport', exportData);
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600/10 via-zinc-900/50 to-blue-600/5 border border-blue-500/20 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <BarChart3 className="w-7 h-7 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Project Analytics Dashboard</h1>
              <p className="text-zinc-400 font-medium mt-1">Advanced performance insights and trend analysis</p>
            </div>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download size={16} />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_number} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-zinc-950 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-zinc-950 border-zinc-700"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSelectedProjectId('all');
                  setDateFrom(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
                  setDateTo(format(new Date(), 'yyyy-MM-dd'));
                }}
                variant="outline"
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs defaultValue="budget" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="budget">Budget Burn-Down</TabsTrigger>
          <TabsTrigger value="schedule">Schedule Variance</TabsTrigger>
          <TabsTrigger value="resources">Resource Allocation</TabsTrigger>
          <TabsTrigger value="risks">Risk Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="space-y-4">
          <BudgetBurnDownChart data={analyticsData?.budget_data} />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <ScheduleVarianceChart data={analyticsData?.schedule_data} />
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <ResourceHeatmap data={analyticsData?.resource_data} />
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <RiskTrendChart data={analyticsData?.risk_data} />
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Avg Budget Variance</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {analyticsData?.summary?.avg_budget_variance?.toFixed(1) || 0}%
                </p>
              </div>
              <TrendingUp className={`w-8 h-8 ${analyticsData?.summary?.avg_budget_variance > 0 ? 'text-red-500' : 'text-green-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Schedule Performance</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {analyticsData?.summary?.schedule_performance?.toFixed(1) || 0}%
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Resource Utilization</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {analyticsData?.summary?.resource_utilization?.toFixed(0) || 0}%
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">High Risk Items</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {analyticsData?.summary?.high_risk_count || 0}
                </p>
              </div>
              <div className="w-8 h-8 rounded bg-red-500/20 flex items-center justify-center">
                <span className="text-red-500 font-bold">!</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}