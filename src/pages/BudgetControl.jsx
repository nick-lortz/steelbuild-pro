import React, { useState } from 'react';
import { apiClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign } from 'lucide-react';
import BudgetManager from '@/components/budget/BudgetManager';
import BudgetAlerts from '@/components/budget/BudgetAlerts';
import FinancialKPIs from '@/components/financials/FinancialKPIs';
import BudgetOverviewChart from '@/components/budget/BudgetOverviewChart';
import CostBreakdownChart from '@/components/budget/CostBreakdownChart';
import { toast } from '@/components/ui/notifications';

export default function BudgetControl() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [selectedWPId, setSelectedWPId] = useState(null);
  const [alertThreshold, setAlertThreshold] = useState(90);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me()
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.list()
  });

  const projects = currentUser?.role === 'admin' ?
  allProjects :
  allProjects.filter((p) => p.assigned_users?.includes(currentUser?.email));

  const selectedProject = projects.find((p) => p.id === activeProjectId);

  const { data: workPackages = [] } = useQuery({
    queryKey: ['work-packages', activeProjectId],
    queryFn: () => apiClient.entities.WorkPackage.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', activeProjectId],
    queryFn: () => apiClient.entities.Task.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: laborHours = [] } = useQuery({
    queryKey: ['labor-hours', activeProjectId],
    queryFn: () => apiClient.entities.LaborHours.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: equipmentUsage = [] } = useQuery({
    queryKey: ['equipment-usage', activeProjectId],
    queryFn: () => apiClient.entities.EquipmentUsage.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', activeProjectId],
    queryFn: () => apiClient.entities.Expense.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => apiClient.entities.CostCode.list(),
    staleTime: 10 * 60 * 1000
  });

  const updateWPMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.WorkPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-packages'] });
      toast.success('Budget updated');
    }
  });

  const selectedWP = workPackages.find((wp) => wp.id === selectedWPId);

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', activeProjectId],
    queryFn: () => apiClient.entities.SOVItem.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials', activeProjectId],
    queryFn: () => apiClient.entities.Financial.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', activeProjectId],
    queryFn: () => apiClient.entities.ClientInvoice.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  if (!activeProjectId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <DollarSign size={64} className="mx-auto mb-4 text-zinc-700" />
          <h3 className="text-xl font-bold text-white mb-4">Select Project</h3>
          <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
            <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white">
              <SelectValue placeholder="Choose project..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {projects.map((p) =>
              <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-gradient-to-b from-zinc-900 to-zinc-950/50">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Budget Control</h1>
              <p className="text-sm text-zinc-500 font-mono mt-1">{selectedProject?.name}</p>
            </div>
            <Select value={activeProjectId} onValueChange={setActiveProjectId}>
              <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {projects.map((p) =>
                <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-8 py-6">
        <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-package">By Work Package</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <FinancialKPIs 
            budgetLines={financials}
            expenses={expenses}
            invoices={invoices}
            sovItems={sovItems}
            useSOV={sovItems.length > 0}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BudgetOverviewChart financials={financials} expenses={expenses} />
            <CostBreakdownChart expenses={expenses} />
          </div>
        </TabsContent>

        <TabsContent value="by-package" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm">Select Work Package</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedWPId || ''} onValueChange={setSelectedWPId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Select work package" />
                </SelectTrigger>
                <SelectContent>
                  {workPackages.map((wp) =>
                  <SelectItem key={wp.id} value={wp.id}>
                      {wp.wpid} - {wp.title}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedWP &&
          <BudgetManager
            workPackage={selectedWP}
            tasks={tasks.filter((t) => t.work_package_id === selectedWP.id)}
            laborHours={laborHours}
            equipmentUsage={equipmentUsage}
            expenses={expenses}
            costCodes={costCodes}
            onUpdateBudget={(data) => updateWPMutation.mutate({ id: selectedWP.id, data })} />

          }
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Alert Settings</CardTitle>
                <Select
                  value={alertThreshold.toString()}
                  onValueChange={(val) => setAlertThreshold(parseInt(val))}>

                  <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80">80%</SelectItem>
                    <SelectItem value="85">85%</SelectItem>
                    <SelectItem value="90">90%</SelectItem>
                    <SelectItem value="95">95%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
          </Card>

          <BudgetAlerts
            workPackages={workPackages}
            tasks={tasks}
            expenses={expenses}
            threshold={alertThreshold} />

        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}