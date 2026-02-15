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
import { toast } from '@/components/ui/notifications';

export default function FinancialsRedesign() {
  const [selectedProject, setSelectedProject] = useState('');
  const [denominatorMode, setDenominatorMode] = useState('total');
  const [editingContractValue, setEditingContractValue] = useState(false);
  const [contractValueInput, setContractValueInput] = useState('');
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

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  // Calculate financial metrics
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
  }, [selectedProjectData, sovItems, expenses, changeOrders, etcRecords, denominatorMode]);

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
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black flex items-center justify-center">
          <div className="text-center max-w-md">
            <DollarSign size={64} className="mx-auto mb-4 text-zinc-700" />
            <h3 className="text-xl font-bold text-white mb-4">Select Project</h3>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="Choose project..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-white">
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
  const statusColor = projectStatus === 'On Track' ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50';

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
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black">
        {/* Header */}
        <div className="border-b border-zinc-800/50 bg-gradient-to-b from-zinc-900 to-zinc-950/50">
          <div className="max-w-[1800px] mx-auto px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white tracking-tight">Financials</h1>
                  <Badge className={statusColor}>{projectStatus}</Badge>
                  {sovMismatch && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
                      <AlertCircle size={12} className="mr-1" />
                      SOV Mismatch: {formatCurrency(sovTotal)} vs {formatCurrency(metrics.baseContract)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-zinc-500 font-mono">
                    {selectedProjectData?.project_number} - {selectedProjectData?.name}
                  </p>
                  {canEdit && (
                    <button
                      onClick={handleEditContractValue}
                      className="text-xs text-zinc-500 hover:text-amber-400 transition-colors flex items-center gap-1"
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
                  <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-white">
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
            <TabsList className="bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sov">SOV</TabsTrigger>
              <TabsTrigger value="costs">Costs</TabsTrigger>
              <TabsTrigger value="changes">Changes</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {metrics.costCoverage < 95 && (
                <div className="p-4 bg-red-500/10 border-2 border-red-500/50 rounded-lg flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-400 mb-1">Cost Alignment Required</p>
                    <p className="text-xs text-zinc-400">
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
                  // Create SOV version snapshot
                  const { data } = await base44.functions.invoke('createSOVVersion', {
                    project_id: selectedProject,
                    change_summary: 'Manual publish'
                  });
                  toast.success('SOV version published');
                }}
                canEdit={canEdit}
              />
            </TabsContent>

            <TabsContent value="costs">
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
          </Tabs>
        </div>
      </div>

      {/* Edit Contract Value Dialog */}
      <Dialog open={editingContractValue} onOpenChange={setEditingContractValue}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Base Contract Value</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Base Contract Amount</label>
              <Input
                type="number"
                step="0.01"
                value={contractValueInput}
                onChange={(e) => setContractValueInput(e.target.value)}
                className="text-right font-mono text-lg bg-zinc-950 border-zinc-700 text-white"
                autoFocus
              />
              <p className="text-xs text-zinc-500 mt-1">
                Current: {formatCurrency(metrics.baseContract)}
              </p>
            </div>
            {sovMismatch && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded">
                <p className="text-xs text-amber-400">
                  <AlertCircle size={12} className="inline mr-1" />
                  SOV total ({formatCurrency(sovTotal)}) will not match base contract after this change
                </p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setEditingContractValue(false)}
                variant="outline"
                className="flex-1 border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={saveContractValue}
                disabled={updateProjectMutation.isPending}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold"
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