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
      ? base44.entities.ClientInvoice.filter({ project_id: selectedProject }, '-invoice_date')
      : base44.entities.ClientInvoice.list('-invoice_date'),
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
        <FinancialKPIs budgetLines={budgetLines} expenses={expenses} invoices={invoices} />
      </div>

      <Tabs defaultValue="budget" className="space-y-4">
        <TabsList>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="actuals">Actuals</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

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

        <TabsContent value="invoices">
          <InvoicesTab
            projectId={selectedProject}
            invoices={invoices}
            canEdit={can.editFinancials}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}