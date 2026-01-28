import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, AlertTriangle, FileText } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import BudgetManager from '@/components/budget/BudgetManager';
import CostVarianceReport from '@/components/budget/CostVarianceReport';
import BudgetAlerts from '@/components/budget/BudgetAlerts';
import { toast } from 'sonner';

export default function BudgetControl() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [selectedWPId, setSelectedWPId] = useState(null);
  const [alertThreshold, setAlertThreshold] = useState(90);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const projects = currentUser?.role === 'admin' ?
    allProjects :
    allProjects.filter(p => p.assigned_users?.includes(currentUser?.email));

  const selectedProject = projects.find(p => p.id === activeProjectId);

  const { data: workPackages = [] } = useQuery({
    queryKey: ['work-packages', activeProjectId],
    queryFn: () => base44.entities.WorkPackage.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', activeProjectId],
    queryFn: () => base44.entities.Task.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: laborHours = [] } = useQuery({
    queryKey: ['labor-hours', activeProjectId],
    queryFn: () => base44.entities.LaborHours.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: equipmentUsage = [] } = useQuery({
    queryKey: ['equipment-usage', activeProjectId],
    queryFn: () => base44.entities.EquipmentUsage.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', activeProjectId],
    queryFn: () => base44.entities.Expense.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => base44.entities.CostCode.list()
  });

  const updateWPMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-packages'] });
      toast.success('Budget updated');
    }
  });

  const selectedWP = workPackages.find(wp => wp.id === selectedWPId);

  if (!activeProjectId) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Budget & Cost Control" subtitle="Project cost management" />
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <DollarSign size={48} className="mx-auto mb-4 text-zinc-600" />
            <p className="text-zinc-400 mb-4">Select a project to view budget controls</p>
            <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
              <SelectTrigger className="w-[300px] mx-auto bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Budget & Cost Control"
        subtitle={selectedProject?.name}
        actions={
          <Select value={activeProjectId} onValueChange={setActiveProjectId}>
            <SelectTrigger className="w-[300px] bg-zinc-900 border-zinc-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-package">By Work Package</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <CostVarianceReport
            workPackages={workPackages}
            tasks={tasks}
            laborHours={laborHours}
            equipmentUsage={equipmentUsage}
            expenses={expenses}
          />
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
                  {workPackages.map(wp => (
                    <SelectItem key={wp.id} value={wp.id}>
                      {wp.wpid} - {wp.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedWP && (
            <BudgetManager
              workPackage={selectedWP}
              tasks={tasks.filter(t => t.work_package_id === selectedWP.id)}
              laborHours={laborHours}
              equipmentUsage={equipmentUsage}
              expenses={expenses}
              costCodes={costCodes}
              onUpdateBudget={(data) => updateWPMutation.mutate({ id: selectedWP.id, data })}
            />
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Alert Settings</CardTitle>
                <Select
                  value={alertThreshold.toString()}
                  onValueChange={(val) => setAlertThreshold(parseInt(val))}
                >
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
            threshold={alertThreshold}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}