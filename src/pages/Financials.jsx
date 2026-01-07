import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/ui/PageHeader';
import FinancialKPIs from '@/components/financials/FinancialKPIs';
import BudgetTab from '@/components/financials/BudgetTab';
import ActualsTab from '@/components/financials/ActualsTab';
import InvoicesTab from '@/components/financials/InvoicesTab';
import SOVManager from '@/components/sov/SOVManager';
import InvoiceManager from '@/components/sov/InvoiceManager';
import SOVCostAlignment from '@/components/sov/SOVCostAlignment';
import JobStatusReport from '@/components/sov/JobStatusReport';
import { usePermissions } from '@/components/shared/usePermissions';

export default function Financials() {
  const [selectedProject, setSelectedProject] = useState('');
  const { can } = usePermissions();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
  });

  const { data: budgetLines = [] } = useQuery({
    queryKey: ['financials', selectedProject],
    queryFn: () => selectedProject 
      ? base44.entities.Financial.filter({ project_id: selectedProject })
      : base44.entities.Financial.list(),
    enabled: !!selectedProject
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', selectedProject],
    queryFn: () => selectedProject
      ? base44.entities.Expense.filter({ project_id: selectedProject }, '-expense_date')
      : base44.entities.Expense.list('-expense_date'),
    enabled: !!selectedProject
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', selectedProject],
    queryFn: () => selectedProject
      ? base44.entities.Invoice.filter({ project_id: selectedProject }, '-period_end')
      : base44.entities.Invoice.list('-period_end'),
    enabled: !!selectedProject
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', selectedProject],
    queryFn: () => selectedProject
      ? base44.entities.SOVItem.filter({ project_id: selectedProject })
      : base44.entities.SOVItem.list(),
    enabled: !!selectedProject
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['change-orders', selectedProject],
    queryFn: () => selectedProject
      ? base44.entities.ChangeOrder.filter({ project_id: selectedProject })
      : base44.entities.ChangeOrder.list(),
    enabled: !!selectedProject
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => base44.entities.CostCode.list('code'),
  });

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  if (!selectedProject) {
    return (
      <div>
        <PageHeader title="Financials" subtitle="Select a project to view financial data" showBackButton={false} />
        <div className="max-w-md">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Financials"
        subtitle={selectedProjectData?.name}
        showBackButton={false}
        actions={
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="mb-6">
        <FinancialKPIs 
          budgetLines={budgetLines} 
          expenses={expenses} 
          invoices={invoices}
          sovItems={sovItems}
          useSOV={sovItems.length > 0}
        />
      </div>

      <Tabs defaultValue="sov" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sov">SOV & Billing</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="actuals">Actuals</TabsTrigger>
        </TabsList>

        <TabsContent value="sov">
          <div className="space-y-6">
            <JobStatusReport sovItems={sovItems} expenses={expenses} changeOrders={changeOrders} />
            <SOVManager projectId={selectedProject} canEdit={can.editFinancials} />
            <InvoiceManager projectId={selectedProject} canEdit={can.editFinancials} />
            <SOVCostAlignment sovItems={sovItems} expenses={expenses} />
          </div>
        </TabsContent>

        <TabsContent value="budget">
          <BudgetTab
            projectId={selectedProject}
            budgetLines={budgetLines}
            costCodes={costCodes}
            canEdit={can.editFinancials}
          />
        </TabsContent>

        <TabsContent value="actuals">
          <ActualsTab
            projectId={selectedProject}
            expenses={expenses}
            costCodes={costCodes}
            canEdit={can.editFinancials}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}