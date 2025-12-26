import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, TrendingUp, TrendingDown, AlertTriangle, BarChart3, Receipt } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import KPICard from '@/components/financials/KPICard';
import BudgetByCategoryBreakdown from '@/components/financials/BudgetByCategoryBreakdown';
import CashFlowSection from '@/components/financials/CashFlowSection';
import CommitmentsVsActuals from '@/components/financials/CommitmentsVsActuals';
import ForecastAtCompletion from '@/components/financials/ForecastAtCompletion';
import ExpensesManagement from '@/components/financials/ExpensesManagement';
import DataIntegrityCheck from '@/components/financials/DataIntegrityCheck';
import InvoiceTracking from '@/components/financials/InvoiceTracking';
import { calculateFinancialTotals, calculateVariance, rollupByCategory } from '@/components/shared/dataValidation';

export default function Financials() {
  const [showForm, setShowForm] = useState(false);
  const [editingFinancial, setEditingFinancial] = useState(null);
  const [selectedProject, setSelectedProject] = useState('all');
  const [formData, setFormData] = useState({
    project_id: '',
    cost_code_id: '',
    budget_amount: '',
    committed_amount: '',
    actual_amount: '',
    forecast_amount: '',
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['costCodes'],
    queryFn: () => base44.entities.CostCode.list('code'),
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Financial.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Financial.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      setShowForm(false);
      setEditingFinancial(null);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      project_id: '',
      cost_code_id: '',
      budget_amount: '',
      committed_amount: '',
      actual_amount: '',
      forecast_amount: '',
      notes: '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required references
    if (!formData.project_id || !formData.cost_code_id) {
      alert('Project and Cost Code are required');
      return;
    }
    
    // Ensure all amounts are valid numbers
    const data = {
      ...formData,
      budget_amount: parseFloat(formData.budget_amount) || 0,
      committed_amount: parseFloat(formData.committed_amount) || 0,
      actual_amount: parseFloat(formData.actual_amount) || 0,
      forecast_amount: parseFloat(formData.forecast_amount) || 0,
    };

    // Validate numeric values
    if (data.budget_amount < 0 || data.committed_amount < 0 || data.actual_amount < 0 || data.forecast_amount < 0) {
      alert('Amounts cannot be negative');
      return;
    }

    if (editingFinancial) {
      updateMutation.mutate({ id: editingFinancial.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (financial) => {
    setFormData({
      project_id: financial.project_id || '',
      cost_code_id: financial.cost_code_id || '',
      budget_amount: financial.budget_amount?.toString() || '',
      committed_amount: financial.committed_amount?.toString() || '',
      actual_amount: financial.actual_amount?.toString() || '',
      forecast_amount: financial.forecast_amount?.toString() || '',
      notes: financial.notes || '',
    });
    setEditingFinancial(financial);
    setShowForm(true);
  };

  const filteredFinancials = selectedProject === 'all' 
    ? financials 
    : financials.filter(f => f.project_id === selectedProject);

  // Calculate totals - roll up expenses into actual amounts by project and cost code
  const totals = useMemo(() => {
    const baseTotals = calculateFinancialTotals(filteredFinancials);
    
    // Filter expenses by selected project
    const filteredExpenses = selectedProject === 'all' 
      ? expenses 
      : expenses.filter(e => e.project_id === selectedProject);
    
    // Roll up expenses into actual costs
    let totalExpensesActual = 0;
    filteredExpenses.forEach(expense => {
      if (expense.payment_status === 'paid' || expense.payment_status === 'approved') {
        totalExpensesActual += expense.amount || 0;
      }
    });
    
    return {
      ...baseTotals,
      actual: baseTotals.actual + totalExpensesActual
    };
  }, [filteredFinancials, expenses, selectedProject]);

  const varianceMetrics = useMemo(() => {
    return calculateVariance(totals.budget, totals.actual);
  }, [totals.budget, totals.actual]);

  const variance = varianceMetrics.variance;
  const variancePercent = varianceMetrics.variancePercent;

  // Enhanced budget lines with expense rollup
  const budgetLinesWithExpenses = useMemo(() => {
    return filteredFinancials.map(financial => {
      // Sum up expenses for this project + cost code combination
      const relatedExpenses = expenses.filter(exp => 
        exp.project_id === financial.project_id && 
        exp.cost_code_id === financial.cost_code_id &&
        (exp.payment_status === 'paid' || exp.payment_status === 'approved')
      );
      
      const expenseTotal = relatedExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      
      return {
        ...financial,
        actual_amount: (financial.actual_amount || 0) + expenseTotal
      };
    });
  }, [filteredFinancials, expenses]);

  const columns = [
    {
      header: 'Project',
      accessor: 'project_id',
      render: (row) => {
        const project = projects.find(p => p.id === row.project_id);
        return (
          <div>
            <p className="font-medium">{project?.name || '-'}</p>
            <p className="text-xs text-zinc-500">{project?.project_number}</p>
          </div>
        );
      },
    },
    {
      header: 'Cost Code',
      accessor: 'cost_code_id',
      render: (row) => {
        const code = costCodes.find(c => c.id === row.cost_code_id);
        return (
          <div>
            <p className="font-mono text-amber-500">{code?.code || '-'}</p>
            <p className="text-xs text-zinc-500">{code?.name}</p>
          </div>
        );
      },
    },
    {
      header: 'Budget',
      accessor: 'budget_amount',
      render: (row) => (
        <span className="font-medium">${(row.budget_amount || 0).toLocaleString()}</span>
      ),
    },
    {
      header: 'Committed',
      accessor: 'committed_amount',
      render: (row) => `$${(row.committed_amount || 0).toLocaleString()}`,
    },
    {
      header: 'Actual',
      accessor: 'actual_amount',
      render: (row) => `$${(row.actual_amount || 0).toLocaleString()}`,
    },
    {
      header: 'Remaining',
      accessor: 'remaining',
      render: (row) => {
        const remaining = (row.budget_amount || 0) - (row.actual_amount || 0);
        return (
          <span className={remaining < 0 ? 'text-red-400' : 'text-green-400'}>
            ${remaining.toLocaleString()}
          </span>
        );
      },
    },
    {
      header: 'Forecast',
      accessor: 'forecast_amount',
      render: (row) => `$${(row.forecast_amount || 0).toLocaleString()}`,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Financials"
        subtitle="Budget tracking and cost control"
        actions={
          <Button 
            onClick={() => {
              resetForm();
              setEditingFinancial(null);
              setShowForm(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            <Plus size={18} className="mr-2" />
            Add Budget Line
          </Button>
        }
      />

      <Tabs defaultValue="overview" className="mb-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-800">
            <BarChart3 size={14} className="mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="budget" className="data-[state=active]:bg-zinc-800">
            Budget Lines
          </TabsTrigger>
          <TabsTrigger value="expenses" className="data-[state=active]:bg-zinc-800">
            <Receipt size={14} className="mr-2" />
            Expenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Budget"
              value={`$${totals.budget.toLocaleString()}`}
              icon={DollarSign}
            />
            <KPICard
              title="Committed"
              value={`$${totals.committed.toLocaleString()}`}
              icon={DollarSign}
              variant="blue"
            />
            <KPICard
              title="Actual Costs"
              value={`$${totals.actual.toLocaleString()}`}
              icon={DollarSign}
            />
            <KPICard
              title="Variance"
              value={`${variance >= 0 ? '+' : ''}$${Math.abs(variance).toLocaleString()}`}
              trend={variance >= 0 ? 'up' : 'down'}
              trendValue={`${variancePercent.toFixed(1)}%`}
              icon={variance >= 0 ? TrendingUp : TrendingDown}
              variant={variance >= 0 ? 'green' : 'red'}
            />
          </div>

          {/* Forecast & Analytics */}
          <ForecastAtCompletion
            financials={filteredFinancials}
            projects={projects}
            changeOrders={changeOrders}
            expenses={expenses}
          />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BudgetByCategoryBreakdown financials={filteredFinancials} costCodes={costCodes} expenses={expenses} />
            <CommitmentsVsActuals financials={filteredFinancials} projects={projects} expenses={expenses} />
          </div>

          {/* Invoice Tracking */}
          <InvoiceTracking 
            financials={filteredFinancials} 
            projects={projects} 
            costCodes={costCodes} 
            expenses={expenses} 
          />

          {/* Cash Flow */}
          <CashFlowSection expenses={expenses} changeOrders={changeOrders} />

          {/* Data Integrity Check */}
          <DataIntegrityCheck />
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Budget"
              value={`$${totals.budget.toLocaleString()}`}
              icon={DollarSign}
            />
            <KPICard
              title="Committed"
              value={`$${totals.committed.toLocaleString()}`}
              icon={DollarSign}
              variant="blue"
            />
            <KPICard
              title="Actual Costs"
              value={`$${totals.actual.toLocaleString()}`}
              icon={DollarSign}
            />
            <KPICard
              title="Variance"
              value={`${variance >= 0 ? '+' : ''}$${Math.abs(variance).toLocaleString()}`}
              trend={variance >= 0 ? 'up' : 'down'}
              trendValue={`${variancePercent.toFixed(1)}%`}
              icon={variance >= 0 ? TrendingUp : TrendingDown}
              variant={variance >= 0 ? 'green' : 'red'}
            />
          </div>

      {/* Project Filter */}
      <div className="mb-6">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-full sm:w-64 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.project_number} - {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

          {/* Table */}
          <DataTable
            columns={columns}
            data={budgetLinesWithExpenses}
            onRowClick={handleEdit}
            emptyMessage="No financial records found. Add budget lines to start tracking costs."
          />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesManagement projectFilter={selectedProject} />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>{editingFinancial ? 'Edit Budget Line' : 'Add Budget Line'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select 
                value={formData.project_id} 
                onValueChange={(v) => setFormData({ ...formData, project_id: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
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
            <div className="space-y-2">
              <Label>Cost Code *</Label>
              <Select 
                value={formData.cost_code_id} 
                onValueChange={(v) => setFormData({ ...formData, cost_code_id: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Select cost code" />
                </SelectTrigger>
                <SelectContent>
                  {costCodes.filter(c => c.is_active).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Budget Amount</Label>
                <Input
                  type="number"
                  value={formData.budget_amount}
                  onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Committed Amount</Label>
                <Input
                  type="number"
                  value={formData.committed_amount}
                  onChange={(e) => setFormData({ ...formData, committed_amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Actual Amount</Label>
                <Input
                  type="number"
                  value={formData.actual_amount}
                  onChange={(e) => setFormData({ ...formData, actual_amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Forecast Amount</Label>
                <Input
                  type="number"
                  value={formData.forecast_amount}
                  onChange={(e) => setFormData({ ...formData, forecast_amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}