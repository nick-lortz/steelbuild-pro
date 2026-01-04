import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, AlertTriangle, Save, TrendingUp, Users, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import { toast } from '@/components/ui/notifications';
import { usePermissions } from '@/components/shared/usePermissions';
import { validateLaborScheduleAlignment, calculateProjectLaborTotals } from '@/components/shared/laborScheduleUtils';
import { ArrowRight } from 'lucide-react';

export default function LaborScope() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [selectedProject, setSelectedProject] = useState('');
  const [showSpecialtyDialog, setShowSpecialtyDialog] = useState(false);
  const [showGapDialog, setShowGapDialog] = useState(false);
  const [editingBreakdown, setEditingBreakdown] = useState(null);

  // Queries
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['labor-categories'],
    queryFn: () => base44.entities.LaborCategory.list('sequence_order'),
  });

  const { data: breakdowns = [], refetch: refetchBreakdowns } = useQuery({
    queryKey: ['labor-breakdowns', selectedProject],
    queryFn: () => selectedProject ? base44.entities.LaborBreakdown.filter({ project_id: selectedProject }) : [],
    enabled: !!selectedProject,
  });

  const { data: specialtyItems = [] } = useQuery({
    queryKey: ['specialty-items', selectedProject],
    queryFn: () => selectedProject ? base44.entities.SpecialtyDiscussionItem.filter({ project_id: selectedProject }) : [],
    enabled: !!selectedProject,
  });

  const { data: scopeGaps = [] } = useQuery({
    queryKey: ['scope-gaps', selectedProject],
    queryFn: () => selectedProject ? base44.entities.ScopeGap.filter({ project_id: selectedProject }) : [],
    enabled: !!selectedProject,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', selectedProject],
    queryFn: () => selectedProject ? base44.entities.Task.filter({ project_id: selectedProject }) : [],
    enabled: !!selectedProject,
  });

  // Initialize breakdown mutation
  const initializeMutation = useMutation({
    mutationFn: (projectId) => base44.functions.invoke('initializeLaborBreakdown', { project_id: projectId }),
    onSuccess: (response) => {
      refetchBreakdowns();
      toast.success(response.data.message);
    },
    onError: (error) => {
      toast.error(`Failed to initialize: ${error.message}`);
    }
  });

  // Repair duplicates mutation
  const repairMutation = useMutation({
    mutationFn: (projectId) => base44.functions.invoke('repairLaborBreakdowns', { project_id: projectId }),
    onSuccess: (response) => {
      refetchBreakdowns();
      toast.success(response.data.message);
    },
    onError: (error) => {
      toast.error(`Repair failed: ${error.message}`);
    }
  });

  // Allocate labor to schedule mutation
  const allocateLaborMutation = useMutation({
    mutationFn: (projectId) => base44.functions.invoke('allocateLaborToSchedule', { project_id: projectId }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(response.data.message);
      if (response.data.warnings) {
        response.data.warnings.forEach(w => toast.warning(w));
      }
    },
    onError: (error) => {
      toast.error(`Allocation failed: ${error.message}`);
    }
  });

  // Update breakdown mutation
  const updateBreakdownMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LaborBreakdown.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-breakdowns'] });
      toast.success('Updated');
    },
  });

  // Specialty item mutations
  const createSpecialtyMutation = useMutation({
    mutationFn: (data) => base44.entities.SpecialtyDiscussionItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialty-items'] });
      setShowSpecialtyDialog(false);
      toast.success('Specialty item added');
    },
  });

  const updateSpecialtyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SpecialtyDiscussionItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialty-items'] });
    },
  });

  // Scope gap mutations
  const createGapMutation = useMutation({
    mutationFn: (data) => base44.entities.ScopeGap.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-gaps'] });
      setShowGapDialog(false);
      toast.success('Scope gap added');
    },
  });

  const updateGapMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ScopeGap.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-gaps'] });
    },
  });

  // Calculations
  const selectedProjectData = useMemo(() => 
    projects.find(p => p.id === selectedProject),
    [projects, selectedProject]
  );

  const totals = useMemo(() => {
    const categoryShop = breakdowns.reduce((sum, b) => sum + (Number(b.shop_hours) || 0), 0);
    const categoryField = breakdowns.reduce((sum, b) => sum + (Number(b.field_hours) || 0), 0);
    const specialtyShop = specialtyItems.reduce((sum, s) => sum + (Number(s.shop_hours) || 0), 0);
    const specialtyField = specialtyItems.reduce((sum, s) => sum + (Number(s.field_hours) || 0), 0);

    const totalShop = categoryShop + specialtyShop;
    const totalField = categoryField + specialtyField;

    const baselineShop = Number(selectedProjectData?.baseline_shop_hours) || 0;
    const baselineField = Number(selectedProjectData?.baseline_field_hours) || 0;

    const shopDiscrepancy = totalShop - baselineShop;
    const fieldDiscrepancy = totalField - baselineField;

    return {
      totalShop,
      totalField,
      baselineShop,
      baselineField,
      shopDiscrepancy,
      fieldDiscrepancy,
      hasDiscrepancy: shopDiscrepancy !== 0 || fieldDiscrepancy !== 0
    };
  }, [breakdowns, specialtyItems, selectedProjectData]);

  const gapTotals = useMemo(() => {
    const openGaps = scopeGaps.filter(g => g.status === 'open');
    const totalCost = scopeGaps.reduce((sum, g) => sum + (Number(g.rough_cost) || 0), 0);
    return { openCount: openGaps.length, totalCost };
  }, [scopeGaps]);

  // Labor vs Schedule validation
  const laborScheduleMismatches = useMemo(() => 
    validateLaborScheduleAlignment(breakdowns, tasks, categories),
    [breakdowns, tasks, categories]
  );

  const laborScheduleTotals = useMemo(() =>
    calculateProjectLaborTotals(breakdowns, tasks),
    [breakdowns, tasks]
  );

  const handleUpdateBreakdown = (breakdownId, field, value) => {
    updateBreakdownMutation.mutate({ 
      id: breakdownId, 
      data: { [field]: Number(value) || 0 } 
    });
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'Unknown';
  };

  const breakdownColumns = [
    {
      header: 'Category',
      accessor: 'labor_category_id',
      render: (row) => (
        <span className="font-medium text-white">{getCategoryName(row.labor_category_id)}</span>
      )
    },
    {
      header: 'Shop Hours',
      accessor: 'shop_hours',
      render: (row) => (
        <Input
          type="number"
          value={row.shop_hours || 0}
          onChange={(e) => handleUpdateBreakdown(row.id, 'shop_hours', e.target.value)}
          disabled={!can.editProject}
          className="w-24 bg-zinc-800 border-zinc-700 text-white"
        />
      )
    },
    {
      header: 'Field Hours',
      accessor: 'field_hours',
      render: (row) => (
        <Input
          type="number"
          value={row.field_hours || 0}
          onChange={(e) => handleUpdateBreakdown(row.id, 'field_hours', e.target.value)}
          disabled={!can.editProject}
          className="w-24 bg-zinc-800 border-zinc-700 text-white"
        />
      )
    },
    {
      header: 'Total',
      accessor: 'total',
      render: (row) => (
        <span className="font-semibold text-amber-400">
          {(Number(row.shop_hours) || 0) + (Number(row.field_hours) || 0)}
        </span>
      )
    },
    {
      header: 'Notes',
      accessor: 'notes',
      render: (row) => (
        <Input
          value={row.notes || ''}
          onChange={(e) => updateBreakdownMutation.mutate({ 
            id: row.id, 
            data: { notes: e.target.value } 
          })}
          placeholder="Optional notes"
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      )
    }
  ];

  const specialtyColumns = [
    { header: 'Location/Detail', accessor: 'location_detail' },
    { header: 'Shop Hours', accessor: 'shop_hours' },
    { header: 'Field Hours', accessor: 'field_hours' },
    { header: 'Status', accessor: 'status', render: (row) => row.status?.toUpperCase() },
    { header: 'Notes', accessor: 'notes' },
  ];

  const gapColumns = [
    { header: 'Location/Description', accessor: 'location_description' },
    { 
      header: 'Rough Cost', 
      accessor: 'rough_cost',
      render: (row) => `$${Number(row.rough_cost || 0).toLocaleString()}`
    },
    { header: 'Explanation', accessor: 'explanation' },
    { header: 'Status', accessor: 'status', render: (row) => row.status?.toUpperCase() },
  ];

  if (!selectedProject) {
    return (
      <div className="p-6">
        <PageHeader title="Labor & Scope Breakdown" subtitle="Select a project to view labor breakdown" />
        <div className="max-w-md">
          <Label>Select Project</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
              <SelectValue placeholder="Choose a project..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
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

  // Check for duplicates
  const hasDuplicates = useMemo(() => {
    const categoryIds = breakdowns.map(b => b.labor_category_id);
    return categoryIds.length !== new Set(categoryIds).size;
  }, [breakdowns]);

  if (breakdowns.length === 0) {
    return (
      <div className="p-6">
        <PageHeader title="Labor & Scope Breakdown" subtitle={selectedProjectData?.name} />
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-zinc-400 mb-4">
              Labor breakdown not initialized for this project.
            </p>
            <Button 
              onClick={() => initializeMutation.mutate(selectedProject)}
              disabled={initializeMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Initialize Labor Breakdown
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Block UI if duplicates detected
  if (hasDuplicates) {
    return (
      <div className="p-6">
        <PageHeader title="Labor & Scope Breakdown" subtitle={selectedProjectData?.name} />
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="text-red-400 flex-shrink-0 mt-1" size={24} />
              <div>
                <p className="font-bold text-red-400 text-lg">Duplicate Labor Categories Detected</p>
                <p className="text-zinc-300 mt-2">
                  System integrity error: Multiple breakdown rows exist for the same category. 
                  This must be repaired before continuing.
                </p>
              </div>
            </div>
            <Button 
              onClick={() => repairMutation.mutate(selectedProject)}
              disabled={repairMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {repairMutation.isPending ? 'Repairing...' : 'Repair Duplicates'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader 
        title="Labor & Scope Breakdown" 
        subtitle={selectedProjectData?.name}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => allocateLaborMutation.mutate(selectedProject)}
              disabled={allocateLaborMutation.isPending || !can.editProject}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowRight size={16} className="mr-1" />
              Allocate Labor to Schedule
            </Button>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800">
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
        }
      />

      {/* Overall Project Info */}
      <Card className="bg-zinc-900 border-zinc-800 mb-6">
        <CardHeader>
          <CardTitle>Overall Project Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-zinc-400 text-xs">Structure Anatomy/Job Type</Label>
              <p className="text-white font-medium">{selectedProjectData?.structure_anatomy_job_type || '-'}</p>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Rough Square Footage</Label>
              <p className="text-white font-medium">
                {selectedProjectData?.rough_square_footage ? selectedProjectData.rough_square_footage.toLocaleString() : '-'}
              </p>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Rough Price/SqFt</Label>
              <p className="text-white font-medium">
                {selectedProjectData?.rough_price_per_sqft ? `$${selectedProjectData.rough_price_per_sqft.toFixed(2)}` : '-'}
              </p>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Crane Budget</Label>
              <p className="text-white font-medium">
                ${(selectedProjectData?.crane_budget || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Sub Budget</Label>
              <p className="text-white font-medium">
                ${(selectedProjectData?.sub_budget || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Rough Lift/Hr Rate</Label>
              <p className="text-white font-medium">
                {selectedProjectData?.rough_lift_hr_rate || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Baseline vs Breakdown Warning */}
      {totals.hasDiscrepancy && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="font-semibold text-red-400">Labor breakdown does not match baseline</p>
            <p className="text-sm text-zinc-300 mt-1">
              Shop: {totals.shopDiscrepancy > 0 ? '+' : ''}{totals.shopDiscrepancy} hrs from baseline
              {' | '}
              Field: {totals.fieldDiscrepancy > 0 ? '+' : ''}{totals.fieldDiscrepancy} hrs from baseline
            </p>
          </div>
        </div>
      )}

      {/* Breakdown vs Schedule Warning */}
      {laborScheduleTotals.has_mismatch && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="font-semibold text-amber-400">Scheduled labor hours do not match breakdown</p>
            <p className="text-sm text-zinc-300 mt-1">
              Shop: {laborScheduleTotals.scheduled_shop} hrs scheduled vs {laborScheduleTotals.breakdown_shop} hrs breakdown (Δ {laborScheduleTotals.shop_variance > 0 ? '+' : ''}{laborScheduleTotals.shop_variance})
              {' | '}
              Field: {laborScheduleTotals.scheduled_field} hrs scheduled vs {laborScheduleTotals.breakdown_field} hrs breakdown (Δ {laborScheduleTotals.field_variance > 0 ? '+' : ''}{laborScheduleTotals.field_variance})
            </p>
          </div>
        </div>
      )}

      {/* Category-Level Variances */}
      {laborScheduleMismatches.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader>
            <CardTitle className="text-amber-400 flex items-center gap-2">
              <AlertTriangle size={18} />
              Category-Level Variances ({laborScheduleMismatches.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {laborScheduleMismatches.map(mismatch => (
                <div key={mismatch.category_id} className="flex justify-between items-center p-2 bg-zinc-800/50 rounded">
                  <span className="text-white font-medium">{mismatch.category_name}</span>
                  <div className="text-sm text-zinc-400">
                    Breakdown: {mismatch.breakdown_shop + mismatch.breakdown_field} hrs | 
                    Scheduled: {mismatch.scheduled_shop + mismatch.scheduled_field} hrs | 
                    <span className={mismatch.total_variance > 0 ? 'text-red-400' : 'text-green-400'}>
                      {' '}Δ {mismatch.total_variance > 0 ? '+' : ''}{mismatch.total_variance} hrs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Labor Breakdown Table */}
      <Card className="bg-zinc-900 border-zinc-800 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={18} />
            Labor Breakdown by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={breakdownColumns}
            data={breakdowns}
            emptyMessage="No breakdown data"
          />
        </CardContent>
      </Card>

      {/* Specialty Items */}
      <Card className="bg-zinc-900 border-zinc-800 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={18} />
              Specialty Items for Discussion
            </CardTitle>
            <Button
              onClick={() => setShowSpecialtyDialog(true)}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={16} className="mr-1" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={specialtyColumns}
            data={specialtyItems}
            emptyMessage="No specialty items"
          />
        </CardContent>
      </Card>

      {/* Total Hours Summary */}
      <Card className="bg-zinc-900 border-zinc-800 mb-6">
        <CardHeader>
          <CardTitle>Total Hours Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-zinc-400 text-sm">Breakdown Shop</Label>
              <p className="text-2xl font-bold text-blue-400 mt-1">{totals.totalShop}</p>
              <p className="text-xs text-zinc-500">Baseline: {totals.baselineShop}</p>
            </div>
            <div>
              <Label className="text-zinc-400 text-sm">Breakdown Field</Label>
              <p className="text-2xl font-bold text-green-400 mt-1">{totals.totalField}</p>
              <p className="text-xs text-zinc-500">Baseline: {totals.baselineField}</p>
            </div>
            <div>
              <Label className="text-zinc-400 text-sm">Shop Variance</Label>
              <p className={`text-2xl font-bold mt-1 ${totals.shopDiscrepancy !== 0 ? 'text-red-400' : 'text-green-400'}`}>
                {totals.shopDiscrepancy > 0 ? '+' : ''}{totals.shopDiscrepancy}
              </p>
            </div>
            <div>
              <Label className="text-zinc-400 text-sm">Field Variance</Label>
              <p className={`text-2xl font-bold mt-1 ${totals.fieldDiscrepancy !== 0 ? 'text-red-400' : 'text-green-400'}`}>
                {totals.fieldDiscrepancy > 0 ? '+' : ''}{totals.fieldDiscrepancy}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scope Gaps */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle size={18} />
              Scope Gaps ({gapTotals.openCount} open, ${gapTotals.totalCost.toLocaleString()} total)
            </CardTitle>
            <Button
              onClick={() => setShowGapDialog(true)}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={16} className="mr-1" />
              Add Gap
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={gapColumns}
            data={scopeGaps}
            emptyMessage="No scope gaps identified"
          />
        </CardContent>
      </Card>

      {/* Specialty Item Dialog */}
      <SpecialtyDialog
        open={showSpecialtyDialog}
        onOpenChange={setShowSpecialtyDialog}
        projectId={selectedProject}
        onSubmit={(data) => createSpecialtyMutation.mutate(data)}
      />

      {/* Scope Gap Dialog */}
      <GapDialog
        open={showGapDialog}
        onOpenChange={setShowGapDialog}
        projectId={selectedProject}
        onSubmit={(data) => createGapMutation.mutate(data)}
      />
    </div>
  );
}

function SpecialtyDialog({ open, onOpenChange, projectId, onSubmit }) {
  const [formData, setFormData] = useState({
    location_detail: '',
    shop_hours: 0,
    field_hours: 0,
    status: 'open',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, project_id: projectId });
    setFormData({ location_detail: '', shop_hours: 0, field_hours: 0, status: 'open', notes: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Add Specialty Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Location/Related Detail *</Label>
            <Textarea
              value={formData.location_detail}
              onChange={(e) => setFormData({ ...formData, location_detail: e.target.value })}
              required
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Shop Hours</Label>
              <Input
                type="number"
                value={formData.shop_hours}
                onChange={(e) => setFormData({ ...formData, shop_hours: Number(e.target.value) })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <Label>Field Hours</Label>
              <Input
                type="number"
                value={formData.field_hours}
                onChange={(e) => setFormData({ ...formData, field_hours: Number(e.target.value) })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">
              Add Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GapDialog({ open, onOpenChange, projectId, onSubmit }) {
  const [formData, setFormData] = useState({
    location_description: '',
    rough_cost: 0,
    explanation: '',
    status: 'open'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, project_id: projectId });
    setFormData({ location_description: '', rough_cost: 0, explanation: '', status: 'open' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Add Scope Gap</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Location/Description *</Label>
            <Textarea
              value={formData.location_description}
              onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
              required
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div>
            <Label>Rough Cost *</Label>
            <Input
              type="number"
              value={formData.rough_cost}
              onChange={(e) => setFormData({ ...formData, rough_cost: Number(e.target.value) })}
              required
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div>
            <Label>Explanation *</Label>
            <Textarea
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              required
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="priced">Priced</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">
              Add Gap
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}