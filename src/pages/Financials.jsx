import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
import { usePermissions } from '@/components/shared/usePermissions';
import { toast } from '@/components/ui/notifications';
import { Trash2 } from 'lucide-react';

export default function Financials() {
  const [selectedProject, setSelectedProject] = useState('');
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name')
  });

  const { data: budgetLines = [] } = useQuery({
    queryKey: ['financials', selectedProject],
    queryFn: () => selectedProject ?
    base44.entities.Financial.filter({ project_id: selectedProject }) :
    base44.entities.Financial.list(),
    enabled: !!selectedProject
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', selectedProject],
    queryFn: () => selectedProject ?
    base44.entities.Expense.filter({ project_id: selectedProject }, '-expense_date') :
    base44.entities.Expense.list('-expense_date'),
    enabled: !!selectedProject
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', selectedProject],
    queryFn: () => selectedProject ?
    base44.entities.Invoice.filter({ project_id: selectedProject }, '-period_end') :
    base44.entities.Invoice.list('-period_end'),
    enabled: !!selectedProject
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', selectedProject],
    queryFn: () => selectedProject ?
    base44.entities.SOVItem.filter({ project_id: selectedProject }) :
    base44.entities.SOVItem.list(),
    enabled: !!selectedProject
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['change-orders', selectedProject],
    queryFn: () => selectedProject ?
    base44.entities.ChangeOrder.filter({ project_id: selectedProject }) :
    base44.entities.ChangeOrder.list(),
    enabled: !!selectedProject
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => base44.entities.CostCode.list('code')
  });

  const selectedProjectData = projects.find((p) => p.id === selectedProject);

  const cleanupMutation = useMutation({
    mutationFn: () => base44.functions.invoke('cleanupFinancialBudgetLines', { project_id: selectedProject }),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(`Deleted ${response.data.count} Financial budget lines`);
        queryClient.invalidateQueries({ queryKey: ['financials'] });
        setShowCleanupDialog(false);
      }
    },
    onError: () => toast.error('Cleanup failed')
  });

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-black">
        <div className="border-b border-zinc-800 bg-black">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Financials</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">SELECT PROJECT</p>
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
      </div>
    );
  }

  const AlertDialogComponent = AlertDialog;

  return (
    <div className="min-h-screen bg-black">
      {/* Header Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Financials</h1>
              <p className="text-xs text-zinc-600 mt-1">{selectedProjectData?.name}</p>
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
            budgetLines={sovItems.length > 0 ? [] : budgetLines}
            expenses={expenses}
            invoices={invoices}
            sovItems={sovItems}
            useSOV={sovItems.length > 0}
          />
        </div>

        <Tabs defaultValue={sovItems.length > 0 ? "sov" : "budget"} className="space-y-4">
           <TabsList className="bg-zinc-900 border border-zinc-800">
            {sovItems.length > 0 && <TabsTrigger value="sov">SOV & Billing</TabsTrigger>}
            {sovItems.length === 0 && <TabsTrigger value="budget">Budget</TabsTrigger>}
            <TabsTrigger value="actuals">Actuals</TabsTrigger>
           </TabsList>

        {sovItems.length > 0 ? (
          <TabsContent value="sov">
            <div className="space-y-6">
              <JobStatusReport sovItems={sovItems} expenses={expenses} changeOrders={changeOrders} />
              <SOVManager projectId={selectedProject} canEdit={can.editFinancials} />
              <InvoiceManager projectId={selectedProject} canEdit={can.editFinancials} />
              <SOVCostAlignment sovItems={sovItems} expenses={expenses} />
            </div>
          </TabsContent>
        ) : (
          <TabsContent value="budget">
            <BudgetTab
              projectId={selectedProject}
              budgetLines={budgetLines}
              costCodes={costCodes}
              canEdit={can.editFinancials} />
          </TabsContent>
        )}

        <TabsContent value="actuals">
          <ActualsTab
            projectId={selectedProject}
            expenses={expenses}
            costCodes={costCodes}
            canEdit={can.editFinancials} />

        </TabsContent>
      </Tabs>

        {/* ETC Manager */}
        <div className="mt-6">
          <ETCManager projectId={selectedProject} expenses={expenses} />
        </div>
      </div>
    </div>
  );
}