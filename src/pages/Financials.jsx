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
import { Plus, DollarSign, TrendingUp, TrendingDown, AlertTriangle, BarChart3, Receipt, FileText, Calendar as CalendarIcon, ChevronDown, ChevronRight } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
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
  const [budgetLineItems, setBudgetLineItems] = useState([]);
  const [invoiceFormData, setInvoiceFormData] = useState({
    project_id: '',
    invoice_number: '',
    invoice_date: null,
    description: '',
    line_items: [],
    payment_status: 'pending',
    paid_date: null,
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

  const { data: clientInvoices = [] } = useQuery({
    queryKey: ['clientInvoices'],
    queryFn: () => base44.entities.ClientInvoice.list(),
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

  const createInvoiceMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientInvoice.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientInvoices'] });
      setShowInvoiceForm(false);
      resetInvoiceForm();
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientInvoice.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientInvoices'] });
      setShowInvoiceForm(false);
      setEditingInvoice(null);
      resetInvoiceForm();
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientInvoice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientInvoices'] });
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
    setBudgetLineItems([]);
  };

  const resetInvoiceForm = () => {
    setInvoiceFormData({
      project_id: '',
      invoice_number: '',
      invoice_date: null,
      description: '',
      line_items: [],
      payment_status: 'pending',
      paid_date: null,
      notes: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingFinancial) {
      // Single line edit mode
      if (!formData.project_id || !formData.cost_code_id) {
        alert('Project and Cost Code are required');
        return;
      }
      
      const data = {
        ...formData,
        budget_amount: parseFloat(formData.budget_amount) || 0,
        committed_amount: parseFloat(formData.committed_amount) || 0,
        actual_amount: parseFloat(formData.actual_amount) || 0,
        forecast_amount: parseFloat(formData.forecast_amount) || 0,
      };

      if (data.budget_amount < 0 || data.committed_amount < 0 || data.actual_amount < 0 || data.forecast_amount < 0) {
        alert('Amounts cannot be negative');
        return;
      }

      updateMutation.mutate({ id: editingFinancial.id, data });
    } else {
      // Bulk create mode
      if (!formData.project_id) {
        alert('Project is required');
        return;
      }

      const linesToCreate = budgetLineItems.filter(item => 
        (item.budget_amount > 0) || (item.committed_amount > 0) || (item.actual_amount > 0) || (item.forecast_amount > 0)
      );

      if (linesToCreate.length === 0) {
        alert('Please enter at least one budget line with amounts');
        return;
      }

      // Create all budget lines
      try {
        for (const item of linesToCreate) {
          await base44.entities.Financial.create({
            project_id: formData.project_id,
            cost_code_id: item.cost_code_id,
            budget_amount: item.budget_amount,
            committed_amount: item.committed_amount,
            actual_amount: item.actual_amount,
            forecast_amount: item.forecast_amount,
            notes: item.notes || '',
          });
        }
        queryClient.invalidateQueries({ queryKey: ['financials'] });
        setShowForm(false);
        resetForm();
      } catch (error) {
        console.error('Failed to create budget lines:', error);
        alert('Failed to create budget lines');
      }
    }
  };

  const handleInvoiceSubmit = (e) => {
    e.preventDefault();

    if (!invoiceFormData.project_id || !invoiceFormData.invoice_number || !invoiceFormData.invoice_date) {
      alert('Project, Invoice Number, and Invoice Date are required');
      return;
    }

    if (!invoiceFormData.line_items || invoiceFormData.line_items.length === 0) {
      alert('At least one line item with billed amount is required');
      return;
    }

    const total_amount = invoiceFormData.line_items.reduce((sum, item) => sum + (item.billed_this_month || 0), 0);

    const data = {
      ...invoiceFormData,
      invoice_date: invoiceFormData.invoice_date ? format(invoiceFormData.invoice_date, 'yyyy-MM-dd') : null,
      paid_date: invoiceFormData.paid_date ? format(invoiceFormData.paid_date, 'yyyy-MM-dd') : null,
      total_amount,
    };

    if (editingInvoice) {
      updateInvoiceMutation.mutate({ id: editingInvoice.id, data });
    } else {
      createInvoiceMutation.mutate(data);
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
    setBudgetLineItems([]);
    setShowForm(true);
  };

  const handleBudgetProjectSelect = (projectId) => {
    setFormData({ ...formData, project_id: projectId });
    
    // Get existing financials for this project to pre-populate
    const existingFinancials = financials.filter(f => f.project_id === projectId);
    
    // Create line items for all cost codes
    const items = costCodes.filter(c => c.is_active).map(costCode => {
      const existing = existingFinancials.find(f => f.cost_code_id === costCode.id);
      return {
        cost_code_id: costCode.id,
        cost_code_display: `${costCode.code} - ${costCode.name}`,
        cost_code_code: costCode.code,
        budget_amount: existing?.budget_amount || 0,
        committed_amount: existing?.committed_amount || 0,
        actual_amount: existing?.actual_amount || 0,
        forecast_amount: existing?.forecast_amount || 0,
        notes: existing?.notes || '',
      };
    }).sort((a, b) => {
      const codeA = a.cost_code_code.replace(/\D/g, '');
      const codeB = b.cost_code_code.replace(/\D/g, '');
      return parseInt(codeA || 0) - parseInt(codeB || 0);
    });
    
    setBudgetLineItems(items);
  };

  const handleEditInvoice = (invoice) => {
    setInvoiceFormData({
      project_id: invoice.project_id || '',
      invoice_number: invoice.invoice_number || '',
      invoice_date: invoice.invoice_date ? new Date(invoice.invoice_date) : null,
      description: invoice.description || '',
      line_items: invoice.line_items || [],
      payment_status: invoice.payment_status || 'pending',
      paid_date: invoice.paid_date ? new Date(invoice.paid_date) : null,
      notes: invoice.notes || '',
    });
    setEditingInvoice(invoice);
    setShowInvoiceForm(true);
  };

  const handleDeleteInvoice = (invoice) => {
    if (window.confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) {
      deleteInvoiceMutation.mutate(invoice.id);
    }
  };

  // When project is selected in invoice form, initialize line items
  const handleProjectSelect = (projectId) => {
    const projectFinancials = financials.filter(f => f.project_id === projectId);
    
    // Calculate previous invoices total for each cost code
    const previousInvoices = clientInvoices.filter(inv => 
      inv.project_id === projectId && (!editingInvoice || inv.id !== editingInvoice.id)
    );
    
    const lineItems = projectFinancials.map(financial => {
      const costCode = costCodes.find(c => c.id === financial.cost_code_id);
      const scheduled_value = financial.budget_amount || 0;
      
      // Sum up previous invoices for this cost code
      let previousTotal = 0;
      previousInvoices.forEach(inv => {
        if (inv.line_items) {
          const lineItem = inv.line_items.find(li => li.cost_code_id === financial.cost_code_id);
          if (lineItem) {
            previousTotal += lineItem.billed_this_month || 0;
          }
        }
      });

      // Check if editing and restore previous value
      let billed_this_month = 0;
      if (editingInvoice && editingInvoice.line_items) {
        const editingLineItem = editingInvoice.line_items.find(li => li.cost_code_id === financial.cost_code_id);
        if (editingLineItem) {
          billed_this_month = editingLineItem.billed_this_month || 0;
        }
      }

      const total_billed_to_date = previousTotal + billed_this_month;
      const balance_to_finish = scheduled_value - total_billed_to_date;
      const percent_billed = scheduled_value > 0 ? (total_billed_to_date / scheduled_value) * 100 : 0;

      return {
        cost_code_id: financial.cost_code_id,
        cost_code_code: costCode?.code || '',
        cost_code_display: costCode ? `${costCode.code} - ${costCode.name}` : financial.cost_code_id,
        scheduled_value,
        billed_this_month,
        total_billed_to_date,
        balance_to_finish,
        percent_billed,
      };
    }).filter(item => item.scheduled_value > 0).sort((a, b) => {
      // Sort by cost code numerically
      const codeA = a.cost_code_code.replace(/\D/g, '');
      const codeB = b.cost_code_code.replace(/\D/g, '');
      return parseInt(codeA || 0) - parseInt(codeB || 0);
    });

    setInvoiceFormData({
      ...invoiceFormData,
      project_id: projectId,
      line_items: lineItems,
    });
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

  const clientInvoiceColumns = [
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
      header: 'Invoice #',
      accessor: 'invoice_number',
    },
    {
      header: 'Invoice Date',
      accessor: 'invoice_date',
      render: (row) => row.invoice_date ? format(new Date(row.invoice_date), 'PP') : '-',
    },
    {
      header: 'Line Items',
      accessor: 'line_items',
      render: (row) => (row.line_items || []).length,
    },
    {
      header: 'Total Amount',
      accessor: 'total_amount',
      render: (row) => <span className="font-medium">${(row.total_amount || 0).toLocaleString()}</span>,
    },
    {
      header: 'Status',
      accessor: 'payment_status',
      render: (row) => {
        const statusColors = {
          pending: 'text-amber-400',
          paid: 'text-green-400',
          overdue: 'text-red-400',
          partial: 'text-blue-400',
        };
        const label = row.payment_status.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return <span className={statusColors[row.payment_status]}>{label}</span>;
      },
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteInvoice(row);
          }}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          Delete
        </Button>
      ),
    },
  ];

  const filteredClientInvoices = selectedProject === 'all' 
    ? clientInvoices 
    : clientInvoices.filter(inv => inv.project_id === selectedProject);

  return (
    <div>
      <PageHeader
        title="Financials"
        subtitle="Budget tracking and cost control"
        actions={
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                resetInvoiceForm();
                setEditingInvoice(null);
                setShowInvoiceForm(true);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Plus size={18} className="mr-2" />
              Add Client Invoice
            </Button>
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
          </div>
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
          <TabsTrigger value="client-invoices" className="data-[state=active]:bg-zinc-800">
            <FileText size={14} className="mr-2" />
            Client Invoices
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
            clientInvoices={clientInvoices}
          />

          {/* Cash Flow */}
          <CashFlowSection expenses={expenses} changeOrders={changeOrders} clientInvoices={clientInvoices} />

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

          {/* Collapsible Budget Lines by Project */}
          {(() => {
            const budgetsByProject = {};
            budgetLinesWithExpenses.forEach(financial => {
              const projectId = financial.project_id || 'unassigned';
              if (!budgetsByProject[projectId]) {
                const project = projects.find(p => p.id === projectId);
                budgetsByProject[projectId] = {
                  projectId,
                  projectName: project?.name || 'Unassigned',
                  projectNumber: project?.project_number || '-',
                  lines: [],
                  budget: 0,
                  committed: 0,
                  actual: 0,
                  forecast: 0,
                };
              }
              budgetsByProject[projectId].lines.push(financial);
              budgetsByProject[projectId].budget += financial.budget_amount || 0;
              budgetsByProject[projectId].committed += financial.committed_amount || 0;
              budgetsByProject[projectId].actual += financial.actual_amount || 0;
              budgetsByProject[projectId].forecast += financial.forecast_amount || 0;
            });

            const projectGroups = Object.values(budgetsByProject);
            const [expandedBudgetProjects, setExpandedBudgetProjects] = React.useState(new Set());

            const toggleBudgetProject = (projectId) => {
              const newExpanded = new Set(expandedBudgetProjects);
              if (newExpanded.has(projectId)) {
                newExpanded.delete(projectId);
              } else {
                newExpanded.add(projectId);
              }
              setExpandedBudgetProjects(newExpanded);
            };

            return projectGroups.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-lg">
                No financial records found. Add budget lines to start tracking costs.
              </div>
            ) : (
              <div className="space-y-2">
                {projectGroups.map(projectGroup => {
                  const remaining = projectGroup.budget - projectGroup.actual;
                  const variance = projectGroup.budget - projectGroup.actual;
                  return (
                    <div key={projectGroup.projectId} className="border border-zinc-800 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleBudgetProject(projectGroup.projectId)}
                        className="w-full p-4 bg-zinc-900 hover:bg-zinc-800 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {expandedBudgetProjects.has(projectGroup.projectId) ? (
                            <ChevronDown size={16} className="text-zinc-400" />
                          ) : (
                            <ChevronRight size={16} className="text-zinc-400" />
                          )}
                          <div className="text-left">
                            <p className="font-medium text-white">{projectGroup.projectNumber}</p>
                            <p className="text-sm text-zinc-400">{projectGroup.projectName}</p>
                          </div>
                          <div className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                            {projectGroup.lines.length} line{projectGroup.lines.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xs text-zinc-400">Budget</p>
                            <p className="text-sm font-medium text-white">${projectGroup.budget.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-zinc-400">Committed</p>
                            <p className="text-sm font-medium text-blue-400">${projectGroup.committed.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-zinc-400">Actual</p>
                            <p className="text-sm font-medium text-purple-400">${projectGroup.actual.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-zinc-400">Remaining</p>
                            <p className={`text-sm font-medium ${remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${Math.abs(remaining).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </button>
                      
                      {expandedBudgetProjects.has(projectGroup.projectId) && (
                        <div className="bg-zinc-950">
                          <DataTable
                            columns={columns}
                            data={projectGroup.lines}
                            onRowClick={handleEdit}
                            emptyMessage="No budget lines for this project."
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesManagement projectFilter={selectedProject} />
        </TabsContent>

        <TabsContent value="client-invoices" className="space-y-4">
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
          <DataTable
            columns={clientInvoiceColumns}
            data={filteredClientInvoices}
            onRowClick={handleEditInvoice}
            emptyMessage="No client invoices found. Add client invoices to start tracking."
          />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className={`${editingFinancial ? 'max-w-lg' : 'max-w-5xl'} bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle>{editingFinancial ? 'Edit Budget Line' : 'Add Budget Lines'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select 
                value={formData.project_id} 
                onValueChange={editingFinancial ? (v) => setFormData({ ...formData, project_id: v }) : handleBudgetProjectSelect}
                disabled={editingFinancial}
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

            {editingFinancial ? (
              <>
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
              </>
            ) : budgetLineItems.length > 0 && (
              <div className="space-y-2">
                <Label>Budget Lines</Label>
                <div className="border border-zinc-800 rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-800 sticky top-0">
                        <tr>
                          <th className="text-left p-2 text-zinc-400 font-medium">Cost Code</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Budget</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Committed</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Actual</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Forecast</th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgetLineItems.map((item, idx) => (
                          <tr key={idx} className="border-t border-zinc-800">
                            <td className="p-2 text-zinc-300 text-xs">{item.cost_code_display}</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.budget_amount || ''}
                                onChange={(e) => {
                                  const newItems = [...budgetLineItems];
                                  newItems[idx].budget_amount = parseFloat(e.target.value) || 0;
                                  setBudgetLineItems(newItems);
                                }}
                                className="bg-zinc-900 border-zinc-700 text-right h-8 text-sm"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.committed_amount || ''}
                                onChange={(e) => {
                                  const newItems = [...budgetLineItems];
                                  newItems[idx].committed_amount = parseFloat(e.target.value) || 0;
                                  setBudgetLineItems(newItems);
                                }}
                                className="bg-zinc-900 border-zinc-700 text-right h-8 text-sm"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.actual_amount || ''}
                                onChange={(e) => {
                                  const newItems = [...budgetLineItems];
                                  newItems[idx].actual_amount = parseFloat(e.target.value) || 0;
                                  setBudgetLineItems(newItems);
                                }}
                                className="bg-zinc-900 border-zinc-700 text-right h-8 text-sm"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.forecast_amount || ''}
                                onChange={(e) => {
                                  const newItems = [...budgetLineItems];
                                  newItems[idx].forecast_amount = parseFloat(e.target.value) || 0;
                                  setBudgetLineItems(newItems);
                                }}
                                className="bg-zinc-900 border-zinc-700 text-right h-8 text-sm"
                                placeholder="0.00"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingFinancial(null);
                  resetForm();
                }}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingFinancial ? 'Save' : 'Save Budget Lines'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Client Invoice Form Dialog */}
      <Dialog open={showInvoiceForm} onOpenChange={setShowInvoiceForm}>
        <DialogContent className="max-w-5xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? 'Edit Client Invoice' : 'Add Client Invoice'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvoiceSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select 
                value={invoiceFormData.project_id} 
                onValueChange={handleProjectSelect}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Number *</Label>
                <Input
                  type="text"
                  value={invoiceFormData.invoice_number}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoice_number: e.target.value })}
                  placeholder="INV-001"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700",
                        !invoiceFormData.invoice_date && "text-zinc-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {invoiceFormData.invoice_date ? format(invoiceFormData.invoice_date, "PP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700">
                    <Calendar
                      mode="single"
                      selected={invoiceFormData.invoice_date}
                      onSelect={(date) => setInvoiceFormData({ ...invoiceFormData, invoice_date: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {/* Line Items Table */}
            {invoiceFormData.line_items && invoiceFormData.line_items.length > 0 && (
              <div className="space-y-2">
                <Label>Billing Items</Label>
                <div className="border border-zinc-800 rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-800 sticky top-0">
                        <tr>
                          <th className="text-left p-2 text-zinc-400 font-medium">Cost Code</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Scheduled Value</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Quick Fill %</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Billed This Month</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Total to Date</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Balance</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">% Billed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceFormData.line_items.map((item, idx) => {
                          const billed = item.billed_this_month || 0;
                          const prevTotal = item.total_billed_to_date - billed;
                          const newTotal = prevTotal + billed;
                          const balance = item.scheduled_value - newTotal;
                          const percent = item.scheduled_value > 0 ? (newTotal / item.scheduled_value) * 100 : 0;

                          return (
                            <tr key={idx} className="border-t border-zinc-800">
                              <td className="p-2 text-zinc-300 text-xs">{item.cost_code_display}</td>
                              <td className="p-2 text-right text-zinc-400">${item.scheduled_value.toLocaleString()}</td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  placeholder="%"
                                  onChange={(e) => {
                                    const percent = parseFloat(e.target.value);
                                    if (!isNaN(percent) && percent >= 0 && percent <= 100) {
                                      const newItems = [...invoiceFormData.line_items];
                                      const billedAmount = (item.scheduled_value * percent) / 100;
                                      newItems[idx] = {
                                        ...item,
                                        billed_this_month: billedAmount,
                                        total_billed_to_date: prevTotal + billedAmount,
                                        balance_to_finish: item.scheduled_value - (prevTotal + billedAmount),
                                        percent_billed: item.scheduled_value > 0 ? ((prevTotal + billedAmount) / item.scheduled_value) * 100 : 0,
                                      };
                                      setInvoiceFormData({ ...invoiceFormData, line_items: newItems });
                                    }
                                  }}
                                  className="bg-zinc-900 border-zinc-700 text-right h-8 text-sm w-16"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.billed_this_month || ''}
                                  onChange={(e) => {
                                    const newItems = [...invoiceFormData.line_items];
                                    const billedAmount = parseFloat(e.target.value) || 0;
                                    newItems[idx] = {
                                      ...item,
                                      billed_this_month: billedAmount,
                                      total_billed_to_date: prevTotal + billedAmount,
                                      balance_to_finish: item.scheduled_value - (prevTotal + billedAmount),
                                      percent_billed: item.scheduled_value > 0 ? ((prevTotal + billedAmount) / item.scheduled_value) * 100 : 0,
                                    };
                                    setInvoiceFormData({ ...invoiceFormData, line_items: newItems });
                                  }}
                                  className="bg-zinc-900 border-zinc-700 text-right h-8 text-sm"
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="p-2 text-right text-zinc-300">${newTotal.toLocaleString()}</td>
                              <td className={`p-2 text-right ${balance < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                                ${balance.toLocaleString()}
                              </td>
                              <td className="p-2 text-right text-zinc-400">{percent.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-zinc-800 border-t-2 border-zinc-700">
                        <tr>
                          <td className="p-2 font-medium text-white">TOTAL</td>
                          <td className="p-2 text-right font-medium text-white">
                            ${invoiceFormData.line_items.reduce((sum, item) => sum + item.scheduled_value, 0).toLocaleString()}
                          </td>
                          <td></td>
                          <td className="p-2 text-right font-medium text-amber-500">
                            ${invoiceFormData.line_items.reduce((sum, item) => sum + (item.billed_this_month || 0), 0).toLocaleString()}
                          </td>
                          <td className="p-2 text-right font-medium text-white">
                            ${invoiceFormData.line_items.reduce((sum, item) => {
                              const billed = item.billed_this_month || 0;
                              const prevTotal = item.total_billed_to_date - billed;
                              return sum + prevTotal + billed;
                            }, 0).toLocaleString()}
                          </td>
                          <td className="p-2 text-right font-medium text-white">
                            ${invoiceFormData.line_items.reduce((sum, item) => {
                              const billed = item.billed_this_month || 0;
                              const prevTotal = item.total_billed_to_date - billed;
                              return sum + (item.scheduled_value - (prevTotal + billed));
                            }, 0).toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select 
                value={invoiceFormData.payment_status} 
                onValueChange={(v) => setInvoiceFormData({ ...invoiceFormData, payment_status: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {invoiceFormData.payment_status === 'paid' && (
              <div className="space-y-2">
                <Label>Paid Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700",
                        !invoiceFormData.paid_date && "text-zinc-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {invoiceFormData.paid_date ? format(invoiceFormData.paid_date, "PP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700">
                    <Calendar
                      mode="single"
                      selected={invoiceFormData.paid_date}
                      onSelect={(date) => setInvoiceFormData({ ...invoiceFormData, paid_date: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={invoiceFormData.description}
                onChange={(e) => setInvoiceFormData({ ...invoiceFormData, description: e.target.value })}
                rows={2}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={invoiceFormData.notes}
                onChange={(e) => setInvoiceFormData({ ...invoiceFormData, notes: e.target.value })}
                rows={2}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInvoiceForm(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {createInvoiceMutation.isPending || updateInvoiceMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}