import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { toast } from '@/components/ui/notifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Plus, Download, RefreshCw } from 'lucide-react';
import BudgetSummaryCards from '@/components/budget/BudgetSummaryCards';
import BudgetLineItemsTable from '@/components/budget/BudgetLineItemsTable';
import BudgetForecastChart from '@/components/budget/BudgetForecastChart';
import BudgetVarianceAnalysis from '@/components/budget/BudgetVarianceAnalysis';
import BudgetSOVIntegration from '@/components/budget/BudgetSOVIntegration';

export default function ProjectBudget() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project');
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLineItemDialog, setShowLineItemDialog] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState(null);

  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiClient.entities.Project.filter({ id: projectId }).then(res => res[0]),
    enabled: !!projectId
  });

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets', projectId],
    queryFn: () => apiClient.entities.Budget.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId
  });

  const { data: lineItems = [], isLoading: lineItemsLoading } = useQuery({
    queryKey: ['budget-line-items', selectedBudget?.id],
    queryFn: () => apiClient.entities.BudgetLineItem.filter({ budget_id: selectedBudget.id }),
    enabled: !!selectedBudget?.id
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => apiClient.entities.CostCode.filter({ is_active: true }, 'code')
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', projectId],
    queryFn: () => apiClient.entities.SOVItem.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => apiClient.entities.Resource.list()
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', projectId],
    queryFn: () => apiClient.entities.Expense.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const activeBudget = useMemo(() => {
    return budgets.find(b => b.status === 'active') || budgets[0];
  }, [budgets]);

  React.useEffect(() => {
    if (activeBudget && !selectedBudget) {
      setSelectedBudget(activeBudget);
    }
  }, [activeBudget, selectedBudget]);

  const createBudgetMutation = useMutation({
    mutationFn: (data) => apiClient.entities.Budget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets']);
      toast.success('Budget created successfully');
      setShowCreateDialog(false);
    },
    onError: (error) => toast.error('Failed to create budget: ' + error.message)
  });

  const createLineItemMutation = useMutation({
    mutationFn: (data) => apiClient.entities.BudgetLineItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['budget-line-items']);
      toast.success('Budget line item added');
      setShowLineItemDialog(false);
      setEditingLineItem(null);
    },
    onError: (error) => toast.error('Failed to add line item: ' + error.message)
  });

  const updateLineItemMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.BudgetLineItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['budget-line-items']);
      toast.success('Line item updated');
      setShowLineItemDialog(false);
      setEditingLineItem(null);
    },
    onError: (error) => toast.error('Failed to update line item: ' + error.message)
  });

  const deleteLineItemMutation = useMutation({
    mutationFn: (id) => apiClient.entities.BudgetLineItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['budget-line-items']);
      toast.success('Line item deleted');
    },
    onError: (error) => toast.error('Failed to delete line item: ' + error.message)
  });

  const budgetSummary = useMemo(() => {
    if (!selectedBudget) return null;

    const categoryBreakdown = {};
    ['labor', 'material', 'equipment', 'subcontract', 'other'].forEach(cat => {
      const items = lineItems.filter(item => item.category === cat);
      categoryBreakdown[cat] = {
        budgeted: items.reduce((sum, item) => sum + (item.budgeted_amount || 0), 0),
        committed: items.reduce((sum, item) => sum + (item.committed_amount || 0), 0),
        actual: items.reduce((sum, item) => sum + (item.actual_amount || 0), 0),
        forecast: items.reduce((sum, item) => sum + (item.forecast_amount || 0), 0)
      };
    });

    const totalBudgeted = Object.values(categoryBreakdown).reduce((sum, cat) => sum + cat.budgeted, 0);
    const totalCommitted = Object.values(categoryBreakdown).reduce((sum, cat) => sum + cat.committed, 0);
    const totalActual = Object.values(categoryBreakdown).reduce((sum, cat) => sum + cat.actual, 0);
    const totalForecast = Object.values(categoryBreakdown).reduce((sum, cat) => sum + cat.forecast, 0);

    return {
      categoryBreakdown,
      totalBudgeted,
      totalCommitted,
      totalActual,
      totalForecast,
      variance: totalBudgeted - totalForecast,
      variancePercent: totalBudgeted ? ((totalBudgeted - totalForecast) / totalBudgeted * 100) : 0,
      available: totalBudgeted - totalCommitted,
      contingencyRemaining: (selectedBudget.contingency_amount || 0) - (selectedBudget.contingency_used || 0)
    };
  }, [selectedBudget, lineItems]);

  const handleCreateBudget = (data) => {
    createBudgetMutation.mutate({
      ...data,
      project_id: projectId,
      total_budget: parseFloat(data.total_budget) || 0,
      contingency_amount: parseFloat(data.contingency_amount) || 0
    });
  };

  const handleLineItemSubmit = (data) => {
    const lineItemData = {
      ...data,
      budget_id: selectedBudget.id,
      project_id: projectId,
      quantity: parseFloat(data.quantity) || 0,
      unit_cost: parseFloat(data.unit_cost) || 0,
      budgeted_amount: parseFloat(data.budgeted_amount) || 0,
      forecast_amount: parseFloat(data.forecast_amount) || parseFloat(data.budgeted_amount) || 0
    };

    if (editingLineItem) {
      updateLineItemMutation.mutate({ id: editingLineItem.id, data: lineItemData });
    } else {
      createLineItemMutation.mutate(lineItemData);
    }
  };

  if (!projectId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No project selected. Please select a project first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Budget</h1>
          <p className="text-muted-foreground mt-1">{project?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download size={16} className="mr-2" />
            Export
          </Button>
          {budgets.length > 0 && (
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus size={16} className="mr-2" />
              New Budget Version
            </Button>
          )}
        </div>
      </div>

      {/* Budget Selection */}
      {budgets.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label className="whitespace-nowrap">Active Budget:</Label>
              <Select 
                value={selectedBudget?.id} 
                onValueChange={(id) => setSelectedBudget(budgets.find(b => b.id === id))}
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {budgets.map(budget => (
                    <SelectItem key={budget.id} value={budget.id}>
                      {budget.budget_name} - {budget.budget_type}
                      {budget.status === 'active' && ' (Active)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant={selectedBudget?.status === 'active' ? 'default' : 'secondary'}>
                {selectedBudget?.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Budget State */}
      {budgets.length === 0 && !budgetsLoading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Budget Created</h3>
            <p className="text-muted-foreground mb-4">Create your first project budget to start tracking costs.</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus size={16} className="mr-2" />
              Create Budget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Budget Details */}
      {selectedBudget && budgetSummary && (
        <>
          <BudgetSummaryCards summary={budgetSummary} budget={selectedBudget} />

          <Tabs defaultValue="line-items" className="space-y-4">
            <TabsList>
              <TabsTrigger value="line-items">Line Items</TabsTrigger>
              <TabsTrigger value="forecast">Forecast & Analysis</TabsTrigger>
              <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
              <TabsTrigger value="sov">SOV Integration</TabsTrigger>
            </TabsList>

            <TabsContent value="line-items">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Budget Line Items</CardTitle>
                    <Button size="sm" onClick={() => {
                      setEditingLineItem(null);
                      setShowLineItemDialog(true);
                    }}>
                      <Plus size={16} className="mr-2" />
                      Add Line Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <BudgetLineItemsTable 
                    lineItems={lineItems}
                    costCodes={costCodes}
                    onEdit={(item) => {
                      setEditingLineItem(item);
                      setShowLineItemDialog(true);
                    }}
                    onDelete={(item) => deleteLineItemMutation.mutate(item.id)}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="forecast">
              <BudgetForecastChart 
                lineItems={lineItems}
                expenses={expenses}
                budgetTotal={budgetSummary.totalBudgeted}
              />
            </TabsContent>

            <TabsContent value="variance">
              <BudgetVarianceAnalysis 
                lineItems={lineItems}
                categoryBreakdown={budgetSummary.categoryBreakdown}
              />
            </TabsContent>

            <TabsContent value="sov">
              <BudgetSOVIntegration 
                lineItems={lineItems}
                sovItems={sovItems}
                projectId={projectId}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Create Budget Dialog */}
      <CreateBudgetDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateBudget}
        isLoading={createBudgetMutation.isPending}
      />

      {/* Line Item Dialog */}
      <LineItemDialog 
        open={showLineItemDialog}
        onOpenChange={(open) => {
          setShowLineItemDialog(open);
          if (!open) setEditingLineItem(null);
        }}
        onSubmit={handleLineItemSubmit}
        lineItem={editingLineItem}
        costCodes={costCodes}
        sovItems={sovItems}
        resources={resources}
        isLoading={editingLineItem ? updateLineItemMutation.isPending : createLineItemMutation.isPending}
      />
    </div>
  );
}

function CreateBudgetDialog({ open, onOpenChange, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    budget_name: '',
    budget_type: 'original',
    status: 'draft',
    effective_date: new Date().toISOString().split('T')[0],
    total_budget: '',
    contingency_amount: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Budget</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Budget Name *</Label>
            <Input 
              value={formData.budget_name}
              onChange={(e) => setFormData({...formData, budget_name: e.target.value})}
              placeholder="e.g., Original Budget, Revised Budget"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Budget Type</Label>
              <Select value={formData.budget_type} onValueChange={(v) => setFormData({...formData, budget_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original</SelectItem>
                  <SelectItem value="revised">Revised</SelectItem>
                  <SelectItem value="forecast">Forecast</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Effective Date</Label>
            <Input 
              type="date"
              value={formData.effective_date}
              onChange={(e) => setFormData({...formData, effective_date: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Total Budget</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.total_budget}
                onChange={(e) => setFormData({...formData, total_budget: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Contingency Amount</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.contingency_amount}
                onChange={(e) => setFormData({...formData, contingency_amount: e.target.value})}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Budget notes..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Budget'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LineItemDialog({ open, onOpenChange, onSubmit, lineItem, costCodes, sovItems, resources, isLoading }) {
  const [formData, setFormData] = useState({
    description: '',
    category: 'labor',
    cost_code_id: '',
    sov_item_id: '',
    unit: '',
    quantity: '',
    unit_cost: '',
    budgeted_amount: '',
    forecast_amount: '',
    assigned_resource_ids: [],
    notes: ''
  });

  React.useEffect(() => {
    if (lineItem) {
      setFormData({
        description: lineItem.description || '',
        category: lineItem.category || 'labor',
        cost_code_id: lineItem.cost_code_id || '',
        sov_item_id: lineItem.sov_item_id || '',
        unit: lineItem.unit || '',
        quantity: lineItem.quantity?.toString() || '',
        unit_cost: lineItem.unit_cost?.toString() || '',
        budgeted_amount: lineItem.budgeted_amount?.toString() || '',
        forecast_amount: lineItem.forecast_amount?.toString() || '',
        assigned_resource_ids: lineItem.assigned_resource_ids || [],
        notes: lineItem.notes || ''
      });
    }
  }, [lineItem]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  React.useEffect(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const unit = parseFloat(formData.unit_cost) || 0;
    if (qty && unit) {
      setFormData(prev => ({
        ...prev,
        budgeted_amount: (qty * unit).toFixed(2),
        forecast_amount: (qty * unit).toFixed(2)
      }));
    }
  }, [formData.quantity, formData.unit_cost]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lineItem ? 'Edit' : 'Add'} Budget Line Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Description *</Label>
            <Input 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Line item description"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="labor">Labor</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="subcontract">Subcontract</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cost Code</Label>
              <Select value={formData.cost_code_id} onValueChange={(v) => setFormData({...formData, cost_code_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cost code" />
                </SelectTrigger>
                <SelectContent>
                  {costCodes.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Link to SOV Line Item</Label>
            <Select value={formData.sov_item_id} onValueChange={(v) => setFormData({...formData, sov_item_id: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Select SOV item (optional)" />
              </SelectTrigger>
              <SelectContent>
                {sovItems.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.sov_code} - {item.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input 
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                placeholder="hrs, tons, ea"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit Cost</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData({...formData, unit_cost: e.target.value})}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Budgeted Amount *</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.budgeted_amount}
                onChange={(e) => setFormData({...formData, budgeted_amount: e.target.value})}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Forecast Amount</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.forecast_amount}
                onChange={(e) => setFormData({...formData, forecast_amount: e.target.value})}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : lineItem ? 'Update' : 'Add'} Line Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}