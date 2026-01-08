import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Target, TrendingUp, TrendingDown, DollarSign, Lock, FileText, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CostRiskIndicator from '@/components/financials/CostRiskIndicator';
import CostVarianceTable from '@/components/sov/CostVarianceTable';
import ChangeOrderImpact from '@/components/change-orders/ChangeOrderImpact';
import CostTrendProjection from '@/components/sov/CostTrendProjection';
import WeeklyCostNarrative from '@/components/financials/WeeklyCostNarrative';

export default function JobStatusReport() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name')
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', selectedProject],
    queryFn: () => base44.entities.SOVItem.filter({ project_id: selectedProject }),
    enabled: !!selectedProject
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', selectedProject],
    queryFn: () => base44.entities.Invoice.filter({ project_id: selectedProject }),
    enabled: !!selectedProject
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', selectedProject],
    queryFn: () => base44.entities.Expense.filter({ project_id: selectedProject }),
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

  const { data: mappings = [] } = useQuery({
    queryKey: ['sov-cost-mappings', selectedProject],
    queryFn: () => base44.entities.SOVCostCodeMap.filter({ project_id: selectedProject }),
    enabled: !!selectedProject
  });

  const { data: invoiceLines = [] } = useQuery({
    queryKey: ['invoice-lines', selectedInvoice?.id],
    queryFn: () => base44.entities.InvoiceLine.filter({ invoice_id: selectedInvoice.id }),
    enabled: !!selectedInvoice
  });

  // Financial Summary KPIs
  const financialSummary = useMemo(() => {
    const contractValue = sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
    const signedExtras = changeOrders
      .filter(co => co.status === 'approved')
      .reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const totalContract = contractValue + signedExtras;
    const earnedToDate = sovItems.reduce((sum, s) => 
      sum + ((s.scheduled_value || 0) * ((s.percent_complete || 0) / 100)), 0);
    const billedToDate = sovItems.reduce((sum, s) => sum + (s.billed_to_date || 0), 0);
    const overUnderBilled = billedToDate - earnedToDate;
    const actualCost = expenses
      .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const percentComplete = totalContract > 0 ? (earnedToDate / totalContract) * 100 : 0;
    const estimatedCostAtCompletion = percentComplete > 0 
      ? (actualCost / percentComplete) * 100 
      : actualCost;
    const projectedProfit = totalContract - estimatedCostAtCompletion;
    const projectedMargin = totalContract > 0 ? (projectedProfit / totalContract) * 100 : 0;

    return {
      contractValue,
      signedExtras,
      totalContract,
      earnedToDate,
      billedToDate,
      overUnderBilled,
      actualCost,
      estimatedCostAtCompletion,
      projectedProfit,
      projectedMargin,
      percentComplete
    };
  }, [sovItems, expenses, changeOrders]);

  // SOV with Cost Alignment
  const sovWithCosts = useMemo(() => {
    return sovItems.map(sov => {
      const sovExpenses = expenses.filter(e => 
        (e.sov_code === sov.sov_code) && 
        (e.payment_status === 'paid' || e.payment_status === 'approved')
      );
      const costToDate = sovExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const margin = (sov.billed_to_date || 0) - costToDate;
      const remainingToBill = sov.scheduled_value - (sov.billed_to_date || 0);
      
      return {
        ...sov,
        costToDate,
        margin,
        remainingToBill
      };
    });
  }, [sovItems, expenses]);

  // Cost Summary by Category
  const costByCategory = useMemo(() => {
    const categories = ['labor', 'material', 'equipment', 'subcontract', 'other'];
    return categories.map(cat => ({
      category: cat,
      amount: expenses
        .filter(e => e.category === cat && (e.payment_status === 'paid' || e.payment_status === 'approved'))
        .reduce((sum, e) => sum + (e.amount || 0), 0)
    })).filter(c => c.amount > 0);
  }, [expenses]);

  // Chart Data
  const chartData = [
    {
      name: 'Financial Status',
      'Earned to Date': financialSummary.earnedToDate,
      'Billed to Date': financialSummary.billedToDate,
      'Actual Cost': financialSummary.actualCost
    }
  ];

  const handleUpdatePercent = async (sovItem, value) => {
    const numValue = Number(value) || 0;
    if (numValue < 0 || numValue > 100) {
      toast.error('Percent must be 0-100');
      return;
    }

    try {
      await base44.functions.invoke('updateSOVPercentComplete', {
        sov_item_id: sovItem.id,
        percent_complete: numValue
      });
      toast.success('Percent complete updated');
    } catch (error) {
      toast.error(error.message || 'Failed to update percent complete');
    }
  };

  const hasApprovedInvoices = invoices.some(inv => inv.status === 'approved' || inv.status === 'paid');

  const sovColumns = [
    { 
      header: 'SOV Code', 
      accessor: 'sov_code',
      render: (row) => <span className="font-mono text-sm font-semibold">{row.sov_code}</span>
    },
    { header: 'Description', accessor: 'description' },
    { 
      header: 'Category', 
      accessor: 'sov_category',
      render: (row) => <span className="capitalize text-xs">{row.sov_category}</span>
    },
    { 
      header: 'Scheduled Value', 
      accessor: 'scheduled_value',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Lock size={10} className="text-muted-foreground" />
          <span className="font-semibold">${row.scheduled_value.toLocaleString()}</span>
        </div>
      )
    },
    {
      header: '% Complete',
      accessor: 'percent_complete',
      render: (row) => (
        <Input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={row.percent_complete || 0}
          onChange={(e) => handleUpdatePercent(row, e.target.value)}
          className="w-20"
        />
      )
    },
    {
      header: 'Earned',
      accessor: 'earned',
      render: (row) => {
        const earned = (row.scheduled_value * (row.percent_complete || 0)) / 100;
        return <span className="text-green-400 font-semibold">${earned.toLocaleString()}</span>;
      }
    },
    {
      header: 'Billed',
      accessor: 'billed_to_date',
      render: (row) => <span className="font-semibold">${(row.billed_to_date || 0).toLocaleString()}</span>
    },
    {
      header: 'Remaining',
      accessor: 'remainingToBill',
      render: (row) => <span className="text-muted-foreground">${row.remainingToBill.toLocaleString()}</span>
    },
    {
      header: 'Cost',
      accessor: 'costToDate',
      render: (row) => <span className="text-red-400">${row.costToDate.toLocaleString()}</span>
    },
    {
      header: 'Margin',
      accessor: 'margin',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.margin >= 0 ? <TrendingUp size={14} className="text-green-400" /> : <TrendingDown size={14} className="text-red-400" />}
          <span className={row.margin >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
            ${row.margin.toLocaleString()}
          </span>
        </div>
      )
    }
  ];

  const invoiceColumns = [
    { 
      header: 'Period', 
      accessor: 'period',
      render: (row) => `${row.period_start} to ${row.period_end}`
    },
    { 
      header: 'Total Amount', 
      accessor: 'total_amount',
      render: (row) => <span className="font-semibold">${row.total_amount.toLocaleString()}</span>
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setSelectedInvoice(row);
            setShowInvoiceDetail(true);
          }}
        >
          View Lines
        </Button>
      )
    }
  ];

  if (!selectedProject) {
    return (
      <div>
        <PageHeader title="Job Status Report" subtitle="Project-level financial status" />
        <Card>
          <CardContent className="p-8">
            <div className="max-w-md mx-auto">
              <p className="text-muted-foreground mb-4">Select a project to view Job Status Report</p>
              <Select value={selectedProject || ''} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
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
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Job Status Report"
        subtitle={`${selectedProjectData?.project_number} - ${selectedProjectData?.name}`}
        actions={
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-80">
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

      {/* Header Summary KPIs */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <Target size={14} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Original Contract</p>
            <p className="text-lg font-bold">${financialSummary.contractValue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <DollarSign size={14} className={financialSummary.signedExtras >= 0 ? 'text-green-400' : 'text-red-400'} />
            </div>
            <p className="text-xs text-muted-foreground">Approved COs</p>
            <p className={`text-lg font-bold ${financialSummary.signedExtras >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${financialSummary.signedExtras.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <DollarSign size={14} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Total Contract</p>
            <p className="text-lg font-bold">${financialSummary.totalContract.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <TrendingUp size={14} className="text-green-400" />
            </div>
            <p className="text-xs text-muted-foreground">Earned to Date</p>
            <p className="text-lg font-bold text-green-400">${financialSummary.earnedToDate.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{financialSummary.percentComplete.toFixed(1)}% complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <DollarSign size={14} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Billed to Date</p>
            <p className="text-lg font-bold">${financialSummary.billedToDate.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className={Math.abs(financialSummary.overUnderBilled) > 5000 ? 'bg-amber-500/10 border-amber-500/30' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              {financialSummary.overUnderBilled >= 0 ? 
                <TrendingUp size={14} className="text-amber-400" /> : 
                <TrendingDown size={14} className="text-red-400" />
              }
            </div>
            <p className="text-xs text-muted-foreground">Over/Under Billed</p>
            <p className={`text-lg font-bold ${Math.abs(financialSummary.overUnderBilled) < 1000 ? '' : financialSummary.overUnderBilled > 0 ? 'text-amber-400' : 'text-red-400'}`}>
              ${financialSummary.overUnderBilled.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <TrendingDown size={14} className="text-red-400" />
            </div>
            <p className="text-xs text-muted-foreground">Actual Cost</p>
            <p className="text-lg font-bold text-red-400">${financialSummary.actualCost.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <DollarSign size={14} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Est Cost at Completion</p>
            <p className="text-lg font-bold">${financialSummary.estimatedCostAtCompletion.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className={financialSummary.projectedProfit >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              {financialSummary.projectedProfit >= 0 ? 
                <TrendingUp size={14} className="text-green-400" /> : 
                <TrendingDown size={14} className="text-red-400" />
              }
            </div>
            <p className="text-xs text-muted-foreground">Est Final Margin</p>
            <p className={`text-lg font-bold ${financialSummary.projectedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${financialSummary.projectedProfit.toLocaleString()}
            </p>
            <p className={`text-xs ${financialSummary.projectedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {financialSummary.projectedMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Change Order Impact */}
      <ChangeOrderImpact
        project={selectedProjectData}
        sovItems={sovItems}
        changeOrders={changeOrders}
        expenses={expenses}
        estimatedCosts={estimatedCosts}
      />

      {/* Cost Risk Indicator */}
      <CostRiskIndicator
        totalContract={financialSummary.totalContract}
        actualCost={financialSummary.actualCost}
        estimatedCostAtCompletion={financialSummary.estimatedCostAtCompletion}
        plannedMarginPercent={selectedProjectData?.planned_margin || 15}
        expenses={expenses}
        estimatedCosts={estimatedCosts}
        sovItems={sovItems}
        changeOrders={changeOrders}
        costCodes={costCodes}
        mappings={mappings}
      />

      {/* Earned vs Billed vs Cost Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Financial Position</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                formatter={(value) => `$${value.toLocaleString()}`}
              />
              <Legend />
              <Bar dataKey="Earned to Date" fill="#10B981" />
              <Bar dataKey="Billed to Date" fill="#3B82F6" />
              <Bar dataKey="Actual Cost" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost Variance Table */}
      <CostVarianceTable
        sovItems={sovItems}
        expenses={expenses}
        costCodes={costCodes}
        mappings={mappings}
      />

      {/* Cost Trend Projections */}
      <CostTrendProjection
        sovItems={sovItems}
        expenses={expenses}
        costCodes={costCodes}
        mappings={mappings}
      />

      {/* Weekly Cost Narrative */}
      <WeeklyCostNarrative
        project={selectedProjectData}
        currentWeek={currentWeekData}
        priorWeek={null}
        sovItems={sovItems}
        changeOrders={changeOrders}
        expenses={expenses}
        estimatedCosts={estimatedCosts}
        costCodes={costCodes}
        mappings={mappings}
      />

      {/* SOV Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule of Values</CardTitle>
          {hasApprovedInvoices && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Lock size={10} />
              Percent complete locked after invoice approval. Adjustments require change orders.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <DataTable
            columns={sovColumns}
            data={sovWithCosts}
            emptyMessage="No SOV lines. Add SOV items in Financials."
          />
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={invoiceColumns}
            data={invoices}
            emptyMessage="No invoices generated yet"
          />
        </CardContent>
      </Card>

      {/* Cost Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {costByCategory.map(cat => (
                <div key={cat.category} className="flex justify-between items-center p-2 bg-secondary rounded">
                  <span className="text-sm capitalize">{cat.category}</span>
                  <span className="font-semibold">${cat.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between items-center p-2 bg-blue-500/10 border border-blue-500/30 rounded mt-4">
                <span className="text-sm font-semibold">Total</span>
                <span className="font-bold">${financialSummary.actualCost.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-secondary rounded">
                <p className="text-xs text-muted-foreground">Cost Performance</p>
                <p className="text-lg font-bold">
                  {financialSummary.earnedToDate > 0 
                    ? `${((financialSummary.actualCost / financialSummary.earnedToDate) * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </p>
                <p className="text-xs text-muted-foreground">Cost to Earned Ratio</p>
              </div>
              <div className="p-3 bg-secondary rounded">
                <p className="text-xs text-muted-foreground">Billing Performance</p>
                <p className="text-lg font-bold">
                  {financialSummary.earnedToDate > 0
                    ? `${((financialSummary.billedToDate / financialSummary.earnedToDate) * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </p>
                <p className="text-xs text-muted-foreground">Billed to Earned Ratio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Detail Dialog */}
      <Dialog open={showInvoiceDetail} onOpenChange={setShowInvoiceDetail}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Invoice Detail - {selectedInvoice?.period_start} to {selectedInvoice?.period_end}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 p-4 bg-secondary rounded">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusBadge status={selectedInvoice?.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-lg font-bold">${selectedInvoice?.total_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lines</p>
                <p className="text-lg font-bold">{invoiceLines.length}</p>
              </div>
            </div>

            <DataTable
              columns={[
                { 
                  header: 'SOV Code', 
                  accessor: 'sov_code',
                  render: (row) => {
                    const sov = sovItems.find(s => s.id === row.sov_item_id);
                    return <span className="font-mono text-sm">{sov?.sov_code}</span>;
                  }
                },
                { 
                  header: 'Description', 
                  accessor: 'description',
                  render: (row) => {
                    const sov = sovItems.find(s => s.id === row.sov_item_id);
                    return sov?.description;
                  }
                },
                { 
                  header: 'Scheduled', 
                  accessor: 'scheduled_value',
                  render: (row) => `$${row.scheduled_value.toLocaleString()}`
                },
                { 
                  header: 'Previous', 
                  accessor: 'previous_billed',
                  render: (row) => `$${row.previous_billed.toLocaleString()}`
                },
                { 
                  header: '% This Period', 
                  accessor: 'current_percent',
                  render: (row) => `${row.current_percent.toFixed(1)}%`
                },
                { 
                  header: 'Current', 
                  accessor: 'current_billed',
                  render: (row) => <span className="font-semibold">${row.current_billed.toLocaleString()}</span>
                },
                { 
                  header: 'To Date', 
                  accessor: 'billed_to_date',
                  render: (row) => `$${row.billed_to_date.toLocaleString()}`
                },
                { 
                  header: 'Remaining', 
                  accessor: 'remaining_value',
                  render: (row) => `$${row.remaining_value.toLocaleString()}`
                }
              ]}
              data={invoiceLines}
              emptyMessage="No invoice lines"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}