import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, TrendingUp } from 'lucide-react';
import PortfolioOverview from '@/components/analytics/PortfolioOverview';
import ResourceHeatmap from '@/components/analytics/ResourceHeatmap';
import RiskTrendAnalysis from '@/components/analytics/RiskTrendAnalysis';
import ProjectRiskDashboard from '@/components/analytics/ProjectRiskDashboard';

export default function Analytics() {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list(),
  });

  const { data: resourceAllocations = [] } = useQuery({
    queryKey: ['resourceAllocations'],
    queryFn: () => base44.entities.ResourceAllocation.list(),
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list('-created_date'),
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list('-created_date'),
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings'],
    queryFn: () => base44.entities.DrawingSet.list(),
  });

  const { data: scopeGaps = [] } = useQuery({
    queryKey: ['scopeGaps'],
    queryFn: () => base44.entities.ScopeGap.list(),
  });

  const { data: laborBreakdowns = [] } = useQuery({
    queryKey: ['laborBreakdowns'],
    queryFn: () => base44.entities.LaborBreakdown.list(),
  });

  const { data: laborHours = [] } = useQuery({
    queryKey: ['laborHours'],
    queryFn: () => base44.entities.LaborHours.list(),
  });

  return (
    <div>
      <PageHeader
        title="Analytics Dashboard"
        subtitle="Portfolio insights, resource utilization, and risk trends"
        showBackButton={false}
      />

      <Tabs defaultValue="risk-dashboard" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="risk-dashboard" className="data-[state=active]:bg-zinc-800">
            <AlertTriangle size={16} className="mr-2" />
            Risk Dashboard
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="data-[state=active]:bg-zinc-800">
            <BarChart3 size={16} className="mr-2" />
            Portfolio Overview
          </TabsTrigger>
          <TabsTrigger value="resources" className="data-[state=active]:bg-zinc-800">
            <Users size={16} className="mr-2" />
            Resource Allocation
          </TabsTrigger>
          <TabsTrigger value="risks" className="data-[state=active]:bg-zinc-800">
            <TrendingUp size={16} className="mr-2" />
            Risk Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="risk-dashboard" className="space-y-6">
          <ProjectRiskDashboard
            projects={projects}
            laborBreakdowns={laborBreakdowns}
            scopeGaps={scopeGaps}
            tasks={tasks}
            financials={financials}
            expenses={expenses}
            changeOrders={changeOrders}
          />
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          <PortfolioOverview
            projects={projects}
            financials={financials}
            tasks={tasks}
            expenses={expenses}
          />
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <ResourceHeatmap
            projects={projects}
            resources={resources}
            resourceAllocations={resourceAllocations}
            tasks={tasks}
          />
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          <RiskTrendAnalysis
            projects={projects}
            rfis={rfis}
            changeOrders={changeOrders}
            drawings={drawings}
            tasks={tasks}
            scopeGaps={scopeGaps}
            financials={financials}
            laborBreakdowns={laborBreakdowns}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}