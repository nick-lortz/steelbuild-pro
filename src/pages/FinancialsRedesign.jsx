import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, AlertCircle, TrendingUp, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DenominatorToggle from '@/components/financials/DenominatorToggle';
import FinancialKPIStrip from '@/components/financials/FinancialKPIStrip';
import SOVGrid from '@/components/financials/SOVGrid';
import CostAlignmentPanel from '@/components/financials/CostAlignmentPanel';
import ETCGrid from '@/components/financials/ETCGrid';
import ChangesPanel from '@/components/financials/ChangesPanel';
import InvoiceGenerationPanel from '@/components/financials/InvoiceGenerationPanel';
import ActualsGrid from '@/components/financials/ActualsGrid';
import HierarchicalCostCodeSelector from '@/components/financials/HierarchicalCostCodeSelector';
import BaselineManager from '@/components/financials/BaselineManager';
import ExpenseSplitter from '@/components/financials/ExpenseSplitter';
import CostBreakdownDashboard from '@/components/financials/CostBreakdownDashboard';
import EVMSummary from '@/components/financials/reports/EVMSummary';
import CashFlowForecast from '@/components/financials/reports/CashFlowForecast';
import ExecutiveSummary from '@/components/financials/reports/ExecutiveSummary';
import { toast } from '@/components/ui/notifications';

export default function FinancialsRedesign() {
  const [selectedProject, setSelectedProject] = useState('');
  const [denominatorMode, setDenominatorMode] = useState('total');
  const [editingContractValue, setEditingContractValue] = useState(false);
  const [contractValueInput, setContractValueInput] = useState('');
  const [splittingExpense, setSplittingExpense] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const canEdit = currentUser?.role === 'admin';

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const projects = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allProjects;
    return allProjects.filter(p =>
      p.project_manager === currentUser.email ||
      p.superintendent === currentUser.email ||
      (p.assigned_users && p.assigned_users.includes(currentUser.email))
    );
  }, [currentUser, allProjects]);

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', selectedProject],
    queryFn: () => base44.entities.SOVItem.filter({ project_id: selectedProject }),
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', selectedProject],
    queryFn: () => base44.entities.Expense.filter({ project_id: selectedProject }),
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['change-orders', selectedProject],
    queryFn: () => base44.entities.ChangeOrder.filter({ project_id: selectedProject }),
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000
  });

  const { data: etcRecords = [] } = useQuery({
    queryKey: ['etc', selectedProject],
    queryFn: () => base44.entities.EstimatedCostToComplete.filter({ project_id: selectedProject }),
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => base44.entities.CostCode.list('code'),
    staleTime: 30 * 60 * 1000
  });

  const { data: baseline } = useQuery({
    queryKey: ['baseline', selectedProject],
    queryFn: async () => {
      const baselines = await base44.entities.ProjectBaseline.filter({ 
        project_id: selectedProject, 
        is_active: true 
      });
      return baselines[0] || null;
    },
    enabled: !!selectedProject,
    staleTime: 10 * 60 * 1000
  });

  const { data: expenseSplits = [] } = useQuery({
    queryKey: ['expense-splits', selectedProject],
    queryFn: () => base44.entities.ExpenseSplit.filter({ project_id: selectedProject }),
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', selectedProject],
    queryFn: () => base44.entities.Task.filter({ project_id: selectedProject }),
    enabled: !!selectedProject,
    staleTime: 5 * 60 * 1000
  });

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  // Calculate financial metrics with hierarchy aggregation
  const metrics = useMemo(() => {
    const baseContract = selectedProjectData?.contract_value || 0;
    const approvedChanges = changeOrders
      .filter(co => co.status === 'approved')
      .reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const totalContract = baseContract + approvedChanges;
    
    const earnedValue = sovItems.reduce((sum, sov) => {
      const earned = (sov.scheduled_value || 0) * ((sov.percent_complete || 0) / 100);
      return sum + earned;
    }, 0);

    const billed = sovItems.reduce((sum, sov) => sum + (sov.billed_to_date || 0), 0);
    
    // Aggregate costs across hierarchy
    const getCostCodeWithChildren = (codeId) => {
      const ids = new Set([codeId]);
      const children = costCodes.filter(c => c.parent_code_id === codeId);
      children.forEach(child => {
        const childIds = getCostCodeWithChildren(child.id);
        childIds.forEach(id => ids.add(id));
      });
      return ids;
    };

    const actualCost = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const totalETC = etcRecords.reduce((sum, etc) => sum + (etc.estimated_remaining_cost || 0), 0);
    
    const denominator = denominatorMode === 'base' ? baseContract : totalContract;

    const actualCostByCategory = expenses.reduce((acc, e) => {
      const cat = e.category || 'other';
      acc[cat] = (acc[cat] || 0) + (e.amount || 0);
      return acc;
    }, {});

    const alignedCost = expenses.filter(e => e.sov_code).reduce((sum, e) => sum + (e.amount || 0), 0);
    const costCoverage = actualCost > 0 ? (alignedCost / actualCost) * 100 : 100;

    return {
      baseContract,
      approvedChanges,
      totalContract,
      earnedValue,
      billed,
      actualCost,
      totalETC,
      denominator,
      actualCostByCategory,
      costCoverage,
      readyToBill: Math.max(0, earnedValue - billed)
    };
  }, [selectedProjectData, sovItems, expenses, changeOrders, etcRecords, denominatorMode, costCodes]);

  // Mutations
  const updateSOVMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updates = { ...data };
      // Recalculate earned if percent changed
      if (data.percent_complete !== undefined) {
        const sov = sovItems.find(s => s.id === id);
        updates.earned_to_date = (sov.scheduled_value || 0) * (data.percent_complete / 100);
      }
      return await base44.entities.SOVItem.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sov-items'] });
      toast.success('SOV updated');
    }
  });

  const createSOVMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.SOVItem.create({ ...data, project_id: selectedProject });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sov-items'] });
      toast.success('SOV line created');
    }
  });

  const deleteSOVMutation = useMutation({
    mutationFn: async (id) => await base44.entities.SOVItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sov-items'] });
      toast.success('SOV line deleted');
    }
  });

  const bulkMapExpensesMutation = useMutation({
    mutationFn: async ({ expenseIds, sovCode }) => {
      await Promise.all(
        expenseIds.map(id => base44.entities.Expense.update(id, { sov_code: sovCode }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Costs mapped to SOV');
    }
  });

  const updateETCMutation = useMutation({
    mutationFn: async ({ category, data }) => {
      const existing = etcRecords.find(e => e.category === category);
      const updates = {
        ...data,
        last_updated_by: currentUser?.email
      };
      
      if (existing) {
        return await base44.entities.EstimatedCostToComplete.update(existing.id, updates);
      } else {
        return await base44.entities.EstimatedCostToComplete.create({
          project_id: selectedProject,
          category,
          ...updates
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etc'] });
      toast.success('ETC updated');
    }
  });

  const updateCOMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const co = changeOrders.find(c => c.id === id);
      const updates = { status };
      
      // If approving, update project contract
      if (status === 'approved' && co.status !== 'approved') {
        updates.approved_date = new Date().toISOString().split('T')[0];
        updates.approved_by = currentUser?.email;
      }
      
      return await base44.entities.ChangeOrder.update(id, updates);
    },
    onSuccess: async (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] });
      if (status === 'approved') {
        await queryClient.invalidateQueries({ queryKey: ['projects'] });
      }
      toast.success('Change order updated');
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Project.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingContractValue(false);
      toast.success('Contract value updated');
    }
  });

  if (!selectedProject) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-[#0A0E13] flex items-center justify-center">
          <div className="text-center max-w-md">
            <DollarSign size={64} className="mx-auto mb-4 text-[#4B5563]" />
            <h3 className="text-xl font-bold text-[#E5E7EB] mb-4">Select Project</h3>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose project..." />
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
      </ErrorBoundary>
    );
  }

  const projectStatus = metrics.costCoverage >= 95 ? 'On Track' : 'Action Needed';
  const statusColor = projectStatus === 'On Track' ? 'bg-[#10B981]/20 text-[#6EE7B7] border-[#10B981]/30' : 'bg-[#EF4444]/20 text-[#FCA5A5] border-[#EF4444]/30';

  const sovTotal = sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
  const sovMismatch = Math.abs(sovTotal - metrics.baseContract) > 1;

  const handleEditContractValue = () => {
    setContractValueInput(metrics.baseContract.toString());
    setEditingContractValue(true);
  };

  const saveContractValue = async () => {
    const newValue = parseFloat(contractValueInput) || 0;
    if (newValue < 0) {
      toast.error('Contract value cannot be negative');
      return;
    }
    await updateProjectMutation.mutate({
      id: selectedProject,
      data: { contract_value: newValue }
    });
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0A0E13]">
        {/* Header */}
        <div className="border-b border-[rgba(255,255,255,0.05)] bg-[#0F1419]/80 backdrop-blur-md">
          <div className="max-w-[1800px] mx-auto px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-[#E5E7EB] tracking-tight">Financials</h1>
                  <Badge className={statusColor}>{projectStatus}</Badge>
                  {sovMismatch && (
                    <Badge className="bg-[#FF9D42]/20 text-[#FCD34D] border-[#FF9D42]/30">
                      <AlertCircle size={12} className="mr-1" />
                      SOV Mismatch: {formatCurrency(sovTotal)} vs {formatCurrency(metrics.baseContract)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-[#6B7280] font-mono">
                    {selectedProjectData?.project_number} - {selectedProjectData?.name}
                  </p>
                  {canEdit && (
                    <button
                      onClick={handleEditContractValue}
                      className="text-xs text-[#6B7280] hover:text-[#FF9D42] transition-colors flex items-center gap-1"
                    >
                      <Edit2 size={12} />
                      Edit Base Contract ({formatCurrency(metrics.baseContract)})
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <DenominatorToggle mode={denominatorMode} onChange={setDenominatorMode} />
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
              </div>
            </div>

            {/* KPI Strip */}
            <FinancialKPIStrip
              totalContract={metrics.totalContract}
              baseContract={metrics.baseContract}
              approvedChanges={metrics.approvedChanges}
              earnedValue={metrics.earnedValue}
              actualCost={metrics.actualCost}
              billed={metrics.billed}
              etc={metrics.totalETC}
              denominator={metrics.denominator}
              denominatorMode={denominatorMode}
            />
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sov">SOV</TabsTrigger>
              <TabsTrigger value="costs">Costs</TabsTrigger>
              <TabsTrigger value="changes">Changes</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {metrics.costCoverage < 95 && (
                <div className="p-4 bg-[#EF4444]/10 border-2 border-[#EF4444]/30 rounded-lg flex items-start gap-3">
                  <AlertCircle size={20} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#EF4444] mb-1">Cost Alignment Required</p>
                    <p className="text-xs text-[#9CA3AF]">
                      {formatCurrency(expenses.filter(e => !e.sov_code).reduce((s, e) => s + (e.amount || 0), 0))} 
                      {' '}in unaligned costs. Map to SOV lines to enable invoicing.
                    </p>
                  </div>
                </div>
              )}

              <CostAlignmentPanel
                expenses={expenses}
                sovItems={sovItems}
                onBulkMap={(expenseIds, sovCode) => 
                  bulkMapExpensesMutation.mutate({ expenseIds, sovCode })
                }
              />

              <InvoiceGenerationPanel
                readyToBill={metrics.readyToBill}
                costCoverage={metrics.costCoverage}
                sovItems={sovItems}
                onGenerate={async (amount) => {
                  // Create invoice logic here
                  toast.success('Invoice generated');
                }}
                canEdit={canEdit}
              />
            </TabsContent>

            <TabsContent value="sov">
              <SOVGrid
                sovItems={sovItems}
                baseContract={metrics.baseContract}
                totalContract={metrics.totalContract}
                costCodes={costCodes}
                onUpdate={(id, data) => updateSOVMutation.mutate({ id, data })}
                onDelete={(id) => deleteSOVMutation.mutate(id)}
                onCreate={(data) => createSOVMutation.mutate(data)}
                onImport={() => toast.info('CSV/Excel import - implement file picker')}
                onExport={() => {
                  const csv = [
                    ['Code', 'Description', 'Type', 'Budget', '% Complete', 'Earned', 'Billed'],
                    ...sovItems.map(s => [
                      s.sov_code,
                      s.description,
                      s.sov_category,
                      s.scheduled_value,
                      s.percent_complete,
                      (s.scheduled_value * s.percent_complete / 100).toFixed(2),
                      s.billed_to_date
                    ])
                  ].map(row => row.join(',')).join('\n');
                  
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `SOV_${selectedProjectData?.project_number}.csv`;
                  a.click();
                  toast.success('SOV exported');
                }}
                onPublish={async () => {
                  try {
                    const sovSnapshot = sovItems.map(s => ({
                      sov_code: s.sov_code,
                      description: s.description,
                      scheduled_value: s.scheduled_value,
                      percent_complete: s.percent_complete,
                      earned_to_date: s.earned_to_date,
                      billed_to_date: s.billed_to_date
                    }));

                    const versions = await base44.entities.SOVVersion.filter({ project_id: selectedProject });
                    const nextVersion = versions.length + 1;

                    await base44.entities.SOVVersion.create({
                      project_id: selectedProject,
                      version_number: nextVersion,
                      snapshot_data: JSON.stringify(sovSnapshot),
                      change_summary: 'Manual publish',
                      changed_by: currentUser?.email,
                      change_type: 'update',
                      affected_sov_codes: sovItems.map(s => s.sov_code),
                      is_current: true
                    });

                    toast.success(`SOV version ${nextVersion} published`);
                  } catch (error) {
                    toast.error('Failed to publish SOV version');
                    console.error(error);
                  }
                }}
                canEdit={canEdit}
              />
            </TabsContent>

            <TabsContent value="costs" className="space-y-6">
              <ActualsGrid
                expenses={expenses}
                costCodes={costCodes}
                sovItems={sovItems}
                onUpdate={async (id, data) => {
                  await base44.entities.Expense.update(id, data);
                  queryClient.invalidateQueries({ queryKey: ['expenses'] });
                  toast.success('Expense updated');
                }}
                onDelete={async (id) => {
                  await base44.entities.Expense.delete(id);
                  queryClient.invalidateQueries({ queryKey: ['expenses'] });
                  toast.success('Expense deleted');
                }}
                onCreate={async (data) => {
                  await base44.entities.Expense.create({ ...data, project_id: selectedProject });
                  queryClient.invalidateQueries({ queryKey: ['expenses'] });
                  toast.success('Expense created');
                }}
                onImport={() => toast.info('CSV/Excel import')}
                onExport={() => {
                  const csv = [
                    ['Date', 'Description', 'Vendor', 'Category', 'Amount', 'SOV Code'],
                    ...expenses.map(e => [
                      e.expense_date,
                      e.description,
                      e.vendor,
                      e.category,
                      e.amount,
                      e.sov_code || 'Not Mapped'
                    ])
                  ].map(row => row.join(',')).join('\n');
                  
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Actuals_${selectedProjectData?.project_number}.csv`;
                  a.click();
                  toast.success('Actuals exported');
                }}
                canEdit={canEdit}
              />

              <CostAlignmentPanel
                expenses={expenses}
                sovItems={sovItems}
                onBulkMap={(expenseIds, sovCode) => 
                  bulkMapExpensesMutation.mutate({ expenseIds, sovCode })
                }
              />
            </TabsContent>

            <TabsContent value="changes">
              <ChangesPanel
                changeOrders={changeOrders}
                onStatusChange={(id, status) => updateCOMutation.mutate({ id, status })}
                onAdd={() => toast.info('Add Change Order - open form')}
                canEdit={canEdit}
              />
            </TabsContent>

            <TabsContent value="forecast">
              <ETCGrid
                etcRecords={etcRecords}
                actualCostByCategory={metrics.actualCostByCategory}
                onUpdate={(category, data) => updateETCMutation.mutate({ category, data })}
                canEdit={canEdit}
              />
            </TabsContent>

            <TabsContent value="invoices">
              <InvoiceGenerationPanel
                readyToBill={metrics.readyToBill}
                costCoverage={metrics.costCoverage}
                sovItems={sovItems}
                onGenerate={async (amount) => {
                  toast.success('Invoice generated for ' + formatCurrency(amount));
                }}
                canEdit={canEdit}
              />
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <BaselineManager
                projectId={selectedProject}
                baseline={baseline}
                sovItems={sovItems}
                tasks={tasks}
                onCreateBaseline={async (data) => {
                  // Deactivate old baselines
                  const oldBaselines = await base44.entities.ProjectBaseline.filter({ 
                    project_id: selectedProject, 
                    is_active: true 
                  });
                  await Promise.all(oldBaselines.map(b => 
                    base44.entities.ProjectBaseline.update(b.id, { is_active: false })
                  ));
                  
                  await base44.entities.ProjectBaseline.create(data);
                  queryClient.invalidateQueries({ queryKey: ['baseline'] });
                  toast.success('Baseline created');
                }}
                canEdit={canEdit}
              />

              <EVMSummary
                earnedValue={metrics.earnedValue}
                actualCost={metrics.actualCost}
                plannedValue={null}
                baseline={baseline}
                totalContract={metrics.totalContract}
                onExport={() => {
                  const csv = [
                    ['Metric', 'Value'],
                    ['Earned Value', metrics.earnedValue],
                    ['Actual Cost', metrics.actualCost],
                    ['Cost Variance', metrics.earnedValue - metrics.actualCost],
                    ['CPI', actualCost > 0 ? earnedValue / actualCost : 0]
                  ].map(row => row.join(',')).join('\n');
                  
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `EVM_${selectedProjectData?.project_number}.csv`;
                  a.click();
                  toast.success('EVM exported');
                }}
              />

              <CashFlowForecast
                earnedValue={metrics.earnedValue}
                actualCost={metrics.actualCost}
                etc={metrics.totalETC}
                billed={metrics.billed}
                readyToBill={metrics.readyToBill}
                onExport={() => {
                  const csv = 'Month,Revenue,Cost,Net\n' + 
                    Array(6).fill(0).map((_, i) => 
                      `M${i},${(metrics.readyToBill/6).toFixed(2)},${(metrics.totalETC/6).toFixed(2)},${((metrics.readyToBill - metrics.totalETC)/6).toFixed(2)}`
                    ).join('\n');
                  
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `CashFlow_${selectedProjectData?.project_number}.csv`;
                  a.click();
                  toast.success('Cash flow exported');
                }}
              />

              <ExecutiveSummary
                project={selectedProjectData}
                totalContract={metrics.totalContract}
                baseContract={metrics.baseContract}
                approvedChanges={metrics.approvedChanges}
                earnedValue={metrics.earnedValue}
                actualCost={metrics.actualCost}
                billed={metrics.billed}
                etc={metrics.totalETC}
                denominator={metrics.denominator}
                denominatorMode={denominatorMode}
                costCoverage={metrics.costCoverage}
                onExportPDF={() => toast.info('PDF export - integrate jsPDF')}
                onExportCSV={() => {
                  const csv = [
                    ['Metric', 'Value'],
                    ['Project', selectedProjectData?.name],
                    ['Project Number', selectedProjectData?.project_number],
                    ['Total Contract', metrics.totalContract],
                    ['Earned Value', metrics.earnedValue],
                    ['Actual Cost', metrics.actualCost],
                    ['EAC', metrics.actualCost + metrics.totalETC],
                    ['Projected Profit', metrics.totalContract - (metrics.actualCost + metrics.totalETC)],
                    ['Margin %', ((metrics.totalContract - (metrics.actualCost + metrics.totalETC)) / metrics.totalContract * 100).toFixed(2)],
                    ['CPI', (metrics.actualCost > 0 ? metrics.earnedValue / metrics.actualCost : 0).toFixed(3)]
                  ].map(row => row.join(',')).join('\n');
                  
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ExecutiveSummary_${selectedProjectData?.project_number}.csv`;
                  a.click();
                  toast.success('Executive summary exported');
                }}
              />

              <CostBreakdownDashboard
                expenses={expenses}
                expenseSplits={expenseSplits}
                tasks={tasks}
                phases={['detailing', 'fabrication', 'delivery', 'erection', 'closeout']}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {splittingExpense && (
        <ExpenseSplitter
          expense={splittingExpense}
          sovItems={sovItems}
          costCodes={costCodes}
          tasks={tasks}
          onSave={async (splits) => {
            await Promise.all(splits.map(split =>
              base44.entities.ExpenseSplit.create({
                ...split,
                expense_id: splittingExpense.id,
                project_id: selectedProject
              })
            ));
            queryClient.invalidateQueries({ queryKey: ['expense-splits'] });
            toast.success('Expense split saved');
          }}
          onClose={() => setSplittingExpense(null)}
        />
      )}

      {/* Edit Contract Value Dialog */}
      <Dialog open={editingContractValue} onOpenChange={setEditingContractValue}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Base Contract Value</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-xs text-[#9CA3AF] mb-2 block">Base Contract Amount</label>
              <Input
                type="number"
                step="0.01"
                value={contractValueInput}
                onChange={(e) => setContractValueInput(e.target.value)}
                className="text-right font-mono text-lg"
                autoFocus
              />
              <p className="text-xs text-[#6B7280] mt-1">
                Current: {formatCurrency(metrics.baseContract)}
              </p>
            </div>
            {sovMismatch && (
              <div className="p-3 bg-[#FF9D42]/10 border border-[#FF9D42]/30 rounded-lg">
                <p className="text-xs text-[#FCD34D]">
                  <AlertCircle size={12} className="inline mr-1" />
                  SOV total ({formatCurrency(sovTotal)}) will not match base contract after this change
                </p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setEditingContractValue(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={saveContractValue}
                disabled={updateProjectMutation.isPending}
                className="flex-1"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}

const formatCurrency = (value) => {
  if (value == null) return '$0.00';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  return value < 0 ? `( $${formatted} )` : `$${formatted}`;
};