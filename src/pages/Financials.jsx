import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/ui/PageHeader';
import FinancialKPIs from '@/components/financials/FinancialKPIs';
import BudgetTab from '@/components/financials/BudgetTab';
import ActualsTab from '@/components/financials/ActualsTab';
import ETCManager from '@/components/financials/ETCManager';
import InvoicesTab from '@/components/financials/InvoicesTab';
import SOVManager from '@/components/sov/SOVManager';
import InvoiceManager from '@/components/sov/InvoiceManager';
import SOVCostAlignment from '@/components/sov/SOVCostAlignment';
import JobStatusReport from '@/components/sov/JobStatusReport';
import CostCodeManager from '@/components/financials/CostCodeManager';


export default function Financials() {
  const [selectedProject, setSelectedProject] = useState('');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const canEdit = currentUser?.role === 'admin';

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name')
  });

  // Filter projects by user role
  const projects = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allProjects;
    return allProjects.filter((p) =>
    p.project_manager === currentUser.email ||
    p.superintendent === currentUser.email ||
    p.assigned_users && p.assigned_users.includes(currentUser.email)
    );
  }, [currentUser, allProjects]);

  const { data: budgetLines = [] } = useQuery({
    queryKey: ['financials', selectedProject],
    queryFn: () => base44.entities.Financial.filter({ project_id: selectedProject }),
    enabled: !!selectedProject
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', selectedProject],
    queryFn: () => base44.entities.Expense.filter({ project_id: selectedProject }, '-expense_date'),
    enabled: !!selectedProject
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', selectedProject],
    queryFn: () => base44.entities.Invoice.filter({ project_id: selectedProject }, '-period_end'),
    enabled: !!selectedProject
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', selectedProject],
    queryFn: () => base44.entities.SOVItem.filter({ project_id: selectedProject }),
    enabled: !!selectedProject
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['change-orders', selectedProject],
    queryFn: () => base44.entities.ChangeOrder.filter({ project_id: selectedProject }),
    enabled: !!selectedProject
  });

  const { data: estimatedCosts = [] } = useQuery({
    queryKey: ['etc', selectedProject],
    queryFn: () => base44.entities.EstimatedCostToComplete.filter({ project_id: selectedProject }),
    enabled: !!selectedProject
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => base44.entities.CostCode.list('code')
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!selectedProject) return;

    const unsubFinancials = base44.entities.Financial.subscribe((event) => {
      if (event.data?.project_id === selectedProject) {
        queryClient.invalidateQueries({ queryKey: ['financials', selectedProject] });
      }
    });

    const unsubExpenses = base44.entities.Expense.subscribe((event) => {
      if (event.data?.project_id === selectedProject) {
        queryClient.invalidateQueries({ queryKey: ['expenses', selectedProject] });
      }
    });

    const unsubSOV = base44.entities.SOVItem.subscribe((event) => {
      if (event.data?.project_id === selectedProject) {
        queryClient.invalidateQueries({ queryKey: ['sov-items', selectedProject] });
      }
    });

    return () => {
      unsubFinancials();
      unsubExpenses();
      unsubSOV();
    };
  }, [selectedProject, queryClient]);

  const selectedProjectData = projects.find((p) => p.id === selectedProject);

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-black">
        <div className="bg-gradient-to-r from-amber-600/10 via-zinc-900/50 to-amber-600/5 text-slate-50 border-b border-amber-500/20">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Financials</h1>
              <p className="text-xs text-zinc-400 font-mono mt-1">SELECT PROJECT</p>
            </div>
          </div>
        </div>
        <div className="max-w-[1600px] mx-auto px-6 py-12">
          <div className="max-w-md">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="SELECT PROJECT..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {projects.map((p) =>
                <SelectItem key={p.id} value={p.id}>
                    {p.project_number} - {p.name}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header Bar */}
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-600/10 via-zinc-900/50 to-amber-600/5">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Financials</h1>
              <p className="text-xs text-zinc-400 mt-1">{selectedProjectData?.name}</p>
            </div>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {projects.map((p) =>
                <SelectItem key={p.id} value={p.id}>
                    {p.project_number} - {p.name}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="mb-6">
          <FinancialKPIs
            budgetLines={budgetLines}
            expenses={expenses}
            invoices={invoices}
            sovItems={sovItems}
            useSOV={sovItems.length > 0} />

        </div>

        {/* Cost Code Manager - Always visible for setup */}
        {canEdit && (
          <div className="mb-6">
            <CostCodeManager />
          </div>
        )}

        <Tabs defaultValue="sov" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="sov">SOV & Billing</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="actuals">Actuals</TabsTrigger>
          </TabsList>

        <TabsContent value="sov">
          <div className="space-y-6">
            <JobStatusReport sovItems={sovItems} expenses={expenses} changeOrders={changeOrders} />
            <SOVManager projectId={selectedProject} canEdit={canEdit} />
            <InvoiceManager projectId={selectedProject} canEdit={canEdit} />
            <SOVCostAlignment sovItems={sovItems} expenses={expenses} />
          </div>
        </TabsContent>

        <TabsContent value="budget">
          <BudgetTab
              projectId={selectedProject}
              budgetLines={budgetLines}
              costCodes={costCodes}
              canEdit={canEdit} />

        </TabsContent>

        <TabsContent value="actuals">
          <ActualsTab
              projectId={selectedProject}
              expenses={expenses}
              costCodes={costCodes}
              canEdit={canEdit} />

        </TabsContent>
      </Tabs>

        {/* ETC Manager */}
        <div className="mt-6">
          <ETCManager projectId={selectedProject} expenses={expenses} estimatedCosts={estimatedCosts} />
        </div>
      </div>
    </div>);

}