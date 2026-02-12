import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Download,
  Layout,
  Activity,
  DollarSign,
  Clock
} from 'lucide-react';
import CustomDashboardBuilder from '@/components/reports/CustomDashboardBuilder';
import ProjectPerformanceKPIs from '@/components/reports/ProjectPerformanceKPIs';
import AIAnomalyDetection from '@/components/reports/AIAnomalyDetection';
import ReportExporter from '@/components/reports/ReportExporter';

export default function AdvancedReporting() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials-all'],
    queryFn: () => base44.entities.Financial.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-all'],
    queryFn: () => base44.entities.Task.list()
  });

  return (
    <PageShell>
      <PageHeader
        title="Advanced Reporting & Analytics"
        subtitle="Real-time insights, custom dashboards, and AI-powered anomaly detection"
        actions={
          <div className="flex gap-2">
            <ReportExporter projects={projects} />
            <Button 
              variant="outline"
              className="border-zinc-700"
              onClick={() => window.location.href = '/performance'}
            >
              <Activity size={14} className="mr-2" />
              Performance Dashboard
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview">
            <BarChart3 size={14} className="mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="kpis">
            <TrendingUp size={14} className="mr-2" />
            KPIs & Performance
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            <AlertTriangle size={14} className="mr-2" />
            Anomaly Detection
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Layout size={14} className="mr-2" />
            Custom Dashboards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Active Projects</p>
                    <p className="text-3xl font-bold text-blue-400">
                      {projects.filter(p => p.status === 'in_progress').length}
                    </p>
                  </div>
                  <BarChart3 size={24} className="text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Budget</p>
                    <p className="text-3xl font-bold text-green-400">
                      ${(projects.reduce((sum, p) => sum + (p.contract_value || 0), 0) / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <DollarSign size={24} className="text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Tasks In Progress</p>
                    <p className="text-3xl font-bold text-amber-400">
                      {tasks.filter(t => t.status === 'in_progress').length}
                    </p>
                  </div>
                  <Clock size={24} className="text-amber-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Avg Health Score</p>
                    <p className="text-3xl font-bold text-cyan-400">85%</p>
                  </div>
                  <Activity size={24} className="text-cyan-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <ProjectPerformanceKPIs projects={projects} financials={financials} tasks={tasks} />
        </TabsContent>

        <TabsContent value="kpis" className="space-y-6">
          <ProjectPerformanceKPIs projects={projects} financials={financials} tasks={tasks} detailed={true} />
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-6">
          <AIAnomalyDetection projects={projects} financials={financials} tasks={tasks} />
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <CustomDashboardBuilder />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}