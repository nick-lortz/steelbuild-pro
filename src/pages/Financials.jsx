import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign } from 'lucide-react';
import FinancialKPIs from '@/components/financials/FinancialKPIs';
import BudgetTab from '@/components/financials/BudgetTab';
import ActualsTab from '@/components/financials/ActualsTab';
import ETCManager from '@/components/financials/ETCManager';
import SOVManager from '@/components/sov/SOVManager';
import InvoiceManager from '@/components/sov/InvoiceManager';
import SOVCostAlignment from '@/components/sov/SOVCostAlignment';
import JobStatusReport from '@/components/sov/JobStatusReport';
import CostCodeManager from '@/components/financials/CostCodeManager';
import AdvancedForecastingDashboard from '@/components/financials/AdvancedForecastingDashboard';


export default function Financials() {
  const [selectedProject, setSelectedProject] = useState('');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me(),
    staleTime: Infinity
  });

  const canEdit = currentUser?.role === 'admin';

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
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
    queryFn: () => apiClient.entities.Financial.filter({ project_id: selectedProject }),
    enabled: !!selectedProject,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', selectedProject],
    queryFn: () => apiClient.entities.Expense.filter({ project_id: selectedProject }, '-expense_date'),
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', selectedProject],
    queryFn: () => apiClient.entities.Invoice.filter({ project_id: selectedProject }, '-period_end'),
    enabled: !!selectedProject,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', selectedProject],
    queryFn: () => apiClient.entities.SOVItem.filter({ project_id: selectedProject }),
    enabled: !!selectedProject,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['change-orders', selectedProject],
    queryFn: () => apiClient.entities.ChangeOrder.filter({ project_id: selectedProject }),
    enabled: !!selectedProject,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const { data: estimatedCosts = [] } = useQuery({
    queryKey: ['etc', selectedProject],
    queryFn: () => apiClient.entities.EstimatedCostToComplete.filter({ project_id: selectedProject }),
    enabled: !!selectedProject,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => apiClient.entities.CostCode.list('code'),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000
  });

  // Real-time subscriptions with hardened hooks
  useEffect(() => {
    if (!selectedProject) return;

    let mounted = true;
    const subscriptions = [];

    const setupSubscriptions = () => {
      try {
        const unsubFinancials = apiClient.entities.Financial.subscribe((event) => {
          if (!mounted) return;
          if (event.data?.project_id === selectedProject) {
            queryClient.setQueryData(['financials', selectedProject], (old) => {
              if (!old) return old;
              if (event.type === 'create') return [...old, event.data];
              if (event.type === 'update') return old.map(item => item.id === event.id ? event.data : item);
              if (event.type === 'delete') return old.filter(item => item.id !== event.id);
              return old;
            });
          }
        });
        subscriptions.push(unsubFinancials);

        const unsubExpenses = apiClient.entities.Expense.subscribe((event) => {
          if (!mounted) return;
          if (event.data?.project_id === selectedProject) {
            queryClient.setQueryData(['expenses', selectedProject], (old) => {
              if (!old) return old;
              if (event.type === 'create') return [...old, event.data];
              if (event.type === 'update') return old.map(item => item.id === event.id ? event.data : item);
              if (event.type === 'delete') return old.filter(item => item.id !== event.id);
              return old;
            });
          }
        });
        subscriptions.push(unsubExpenses);

        const unsubSOV = apiClient.entities.SOVItem.subscribe((event) => {
          if (!mounted) return;
          if (event.data?.project_id === selectedProject) {
            queryClient.setQueryData(['sov-items', selectedProject], (old) => {
              if (!old) return old;
              if (event.type === 'create') return [...old, event.data];
              if (event.type === 'update') return old.map(item => item.id === event.id ? event.data : item);
              if (event.type === 'delete') return old.filter(item => item.id !== event.id);
              return old;
            });
          }
        });
        subscriptions.push(unsubSOV);
      } catch (error) {
        console.error('Subscription setup error:', error);
      }
    };

    setupSubscriptions();

    return () => {
      mounted = false;
      subscriptions.forEach(unsub => {
        try {
          unsub();
        } catch (error) {
          console.error('Unsubscribe error:', error);
        }
      });
    };
  }, [selectedProject]);

  const selectedProjectData = projects.find((p) => p.id === selectedProject);

  if (!selectedProject) {
    return (
      <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <DollarSign size={64} className="mx-auto mb-4 text-zinc-700" />
          <h3 className="text-xl font-bold text-white mb-4">Select Project</h3>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white">
              <SelectValue placeholder="Choose project..." />
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
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-gradient-to-b from-zinc-900 to-zinc-950/50">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Financials</h1>
              <p className="text-sm text-zinc-500 font-mono mt-1">{selectedProjectData?.name}</p>
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

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-6">
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
            <TabsTrigger value="forecast">AI Forecast</TabsTrigger>
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

        <TabsContent value="forecast">
          <AdvancedForecastingDashboard projectId={selectedProject} />
        </TabsContent>
      </Tabs>

        {/* ETC Manager */}
        <div className="mt-6">
          <ETCManager projectId={selectedProject} expenses={expenses} estimatedCosts={estimatedCosts} />
        </div>
      </div>
    </div>
    </ErrorBoundary>);

}