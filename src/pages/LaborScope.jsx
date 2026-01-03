import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, Trash2, Save, Zap, RefreshCw, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PageHeader from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import LaborScheduleValidator from '@/components/labor/LaborScheduleValidator';

export default function LaborScope() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialProjectId = urlParams.get('project_id');
  const [projectId, setProjectId] = useState(initialProjectId);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const queryClient = useQueryClient();

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.list();
      return projects.find(p => p.id === projectId);
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['labor-categories'],
    queryFn: () => base44.entities.LaborCategory.list('sequence_order'),
    staleTime: 30 * 60 * 1000
  });

  const { data: breakdowns = [] } = useQuery({
    queryKey: ['labor-breakdowns', projectId],
    queryFn: () => base44.entities.LaborBreakdown.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: specialtyItems = [] } = useQuery({
    queryKey: ['specialty-items', projectId],
    queryFn: () => base44.entities.SpecialtyDiscussionItem.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: scopeGaps = [] } = useQuery({
    queryKey: ['scope-gaps', projectId],
    queryFn: () => base44.entities.ScopeGap.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  });

  // Auto-create missing breakdowns for categories
  useEffect(() => {
    if (projectId && categories.length > 0 && breakdowns.length < categories.length) {
      const existingCategoryIds = new Set(breakdowns.map(b => b.labor_category_id));
      const missingCategories = categories.filter(c => !existingCategoryIds.has(c.id));
      
      if (missingCategories.length > 0) {
        missingCategories.forEach(async (cat) => {
          await base44.entities.LaborBreakdown.create({
            project_id: projectId,
            labor_category_id: cat.id,
            shop_hours: 0,
            field_hours: 0
          });
        });
        queryClient.invalidateQueries({ queryKey: ['labor-breakdowns', projectId] });
      }
    }
  }, [projectId, categories, breakdowns]);

  const updateBreakdownMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LaborBreakdown.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-breakdowns', projectId] });
      toast.success('Updated');
    }
  });

  const createSpecialtyMutation = useMutation({
    mutationFn: (data) => base44.entities.SpecialtyDiscussionItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialty-items', projectId] });
      toast.success('Specialty item added');
    }
  });

  const updateSpecialtyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SpecialtyDiscussionItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialty-items', projectId] });
      toast.success('Updated');
    }
  });

  const deleteSpecialtyMutation = useMutation({
    mutationFn: (id) => base44.entities.SpecialtyDiscussionItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialty-items', projectId] });
      toast.success('Deleted');
    }
  });

  const createGapMutation = useMutation({
    mutationFn: (data) => base44.entities.ScopeGap.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-gaps', projectId] });
      toast.success('Scope gap added');
    }
  });

  const updateGapMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ScopeGap.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-gaps', projectId] });
      toast.success('Updated');
    }
  });

  const deleteGapMutation = useMutation({
    mutationFn: (id) => base44.entities.ScopeGap.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-gaps', projectId] });
      toast.success('Deleted');
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Baseline updated');
    }
  });

  const allocateLaborMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('allocateLaborToSchedule', { project_id: projectId });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success(`Labor allocated to ${data.updated} tasks`);
      if (data.warnings && data.warnings.length > 0) {
        data.warnings.forEach(w => toast.warning(w));
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to allocate labor');
    }
  });

  const resetLaborMutation = useMutation({
    mutationFn: async () => {
      // Fetch fresh data
      const currentBreakdowns = await base44.entities.LaborBreakdown.filter({ project_id: projectId });
      const currentSpecialty = await base44.entities.SpecialtyDiscussionItem.filter({ project_id: projectId });
      const currentGaps = await base44.entities.ScopeGap.filter({ project_id: projectId });
      
      // Reset all breakdowns to 0
      for (const b of currentBreakdowns) {
        await base44.entities.LaborBreakdown.update(b.id, { 
          shop_hours: 0, 
          field_hours: 0, 
          notes: '' 
        });
      }
      
      // Delete all specialty items
      for (const s of currentSpecialty) {
        await base44.entities.SpecialtyDiscussionItem.delete(s.id);
      }
      
      // Delete all scope gaps
      for (const g of currentGaps) {
        await base44.entities.ScopeGap.delete(g.id);
      }

      return { 
        resetCount: currentBreakdowns.length, 
        deletedSpecialty: currentSpecialty.length, 
        deletedGaps: currentGaps.length 
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-breakdowns', projectId] });
      queryClient.invalidateQueries({ queryKey: ['specialty-items', projectId] });
      queryClient.invalidateQueries({ queryKey: ['scope-gaps', projectId] });
      toast.success('Labor & scope data reset');
      setShowResetDialog(false);
    },
    onError: (error) => {
      console.error('Reset error:', error);
      toast.error(error?.message || 'Failed to reset data');
    }
  });

  // Calculate totals
  const totals = useMemo(() => {
    const categoryShop = breakdowns.reduce((sum, b) => sum + (b.shop_hours || 0), 0);
    const categoryField = breakdowns.reduce((sum, b) => sum + (b.field_hours || 0), 0);
    const specialtyShop = specialtyItems.reduce((sum, s) => sum + (s.shop_hours || 0), 0);
    const specialtyField = specialtyItems.reduce((sum, s) => sum + (s.field_hours || 0), 0);
    
    const totalShop = categoryShop + specialtyShop;
    const totalField = categoryField + specialtyField;
    
    const baselineShop = project?.baseline_shop_hours || 0;
    const baselineField = project?.baseline_field_hours || 0;
    
    const shopDiscrepancy = totalShop - baselineShop;
    const fieldDiscrepancy = totalField - baselineField;
    
    return {
      totalShop,
      totalField,
      totalHours: totalShop + totalField,
      baselineShop,
      baselineField,
      shopDiscrepancy,
      fieldDiscrepancy,
      hasDiscrepancy: shopDiscrepancy !== 0 || fieldDiscrepancy !== 0
    };
  }, [breakdowns, specialtyItems, project]);

  const scopeGapTotals = useMemo(() => {
    const openGaps = scopeGaps.filter(g => g.status === 'open');
    const totalCost = scopeGaps.reduce((sum, g) => sum + (g.rough_cost || 0), 0);
    return { openCount: openGaps.length, totalCost };
  }, [scopeGaps]);

  if (!projectId) {
    return (
      <div>
        <PageHeader
          title="Labor & Scope Breakdown"
          subtitle="Select a project to manage labor planning"
        />
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-8">
            <div className="max-w-md mx-auto space-y-4">
              <Label className="text-white">Select Project</Label>
              <Select value={projectId || ''} onValueChange={setProjectId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Choose a project..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {allProjects.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-white">
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

  if (!project) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-400">Loading project...</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Labor & Scope Breakdown"
        subtitle={`${project.project_number} - ${project.name}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(true)}
              className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
            >
              <RotateCcw size={16} className="mr-2" />
              Reset
            </Button>
            <Button
              onClick={() => allocateLaborMutation.mutate()}
              disabled={allocateLaborMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {allocateLaborMutation.isPending ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Allocating...
                </>
              ) : (
                <>
                  <Zap size={16} className="mr-2" />
                  Allocate Labor to Schedule
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* Discrepancy Alert */}
      {totals.hasDiscrepancy && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-red-400 font-semibold">Labor breakout does not match baseline</p>
            <div className="mt-2 text-sm text-zinc-300 space-y-1">
              <p>Shop Hours: {totals.shopDiscrepancy > 0 ? '+' : ''}{totals.shopDiscrepancy} hrs</p>
              <p>Field Hours: {totals.fieldDiscrepancy > 0 ? '+' : ''}{totals.fieldDiscrepancy} hrs</p>
            </div>
          </div>
        </div>
      )}

      {/* Labor vs Schedule Validation */}
      <div className="mb-6">
        <LaborScheduleValidator
          projectId={projectId}
          breakdowns={breakdowns}
          specialtyItems={specialtyItems}
          tasks={tasks}
          categories={categories}
          scopeGaps={scopeGaps}
        />
      </div>

      {/* Section A: Specific Field Hours Breakout */}
      <Card className="bg-zinc-900/50 border-zinc-800 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Specific Field Hours Breakout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Category</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400 w-32">Shop Hours</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400 w-32">Field Hours</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400 w-32">Total</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Notes</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(category => {
                  const breakdown = breakdowns.find(b => b.labor_category_id === category.id);
                  if (!breakdown) return null;
                  
                  const total = (breakdown.shop_hours || 0) + (breakdown.field_hours || 0);
                  
                  return (
                    <tr key={category.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-3 px-4 text-white">{category.name}</td>
                      <td className="py-3 px-4">
                        <Input
                          type="number"
                          value={breakdown.shop_hours || ''}
                          onChange={(e) => updateBreakdownMutation.mutate({
                            id: breakdown.id,
                            data: { shop_hours: parseFloat(e.target.value) || 0 }
                          })}
                          className="bg-zinc-800 border-zinc-700 text-right w-28"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          type="number"
                          value={breakdown.field_hours || ''}
                          onChange={(e) => updateBreakdownMutation.mutate({
                            id: breakdown.id,
                            data: { field_hours: parseFloat(e.target.value) || 0 }
                          })}
                          className="bg-zinc-800 border-zinc-700 text-right w-28"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-amber-400">
                        {total > 0 ? total : ''}
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          value={breakdown.notes || ''}
                          onChange={(e) => updateBreakdownMutation.mutate({
                            id: breakdown.id,
                            data: { notes: e.target.value }
                          })}
                          placeholder="Optional notes..."
                          className="bg-zinc-800 border-zinc-700"
                        />
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-zinc-800/50 font-bold">
                  <td className="py-3 px-4 text-white">Category Subtotal</td>
                  <td className="py-3 px-4 text-right text-amber-400">
                    {breakdowns.reduce((sum, b) => sum + (b.shop_hours || 0), 0) || '--'}
                  </td>
                  <td className="py-3 px-4 text-right text-amber-400">
                    {breakdowns.reduce((sum, b) => sum + (b.field_hours || 0), 0) || '--'}
                  </td>
                  <td className="py-3 px-4 text-right text-amber-400">
                    {breakdowns.reduce((sum, b) => sum + (b.shop_hours || 0) + (b.field_hours || 0), 0) || '--'}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Section B: Specialty Items for Discussion */}
      <Card className="bg-zinc-900/50 border-zinc-800 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Specialty Items for Discussion</CardTitle>
            <Button
              size="sm"
              onClick={() => createSpecialtyMutation.mutate({
                project_id: projectId,
                location_detail: '',
                shop_hours: 0,
                field_hours: 0,
                status: 'open'
              })}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={14} className="mr-1" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Location/Detail</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400 w-32">Shop Hours</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400 w-32">Field Hours</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400 w-32">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Notes</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {specialtyItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-zinc-500">
                      No specialty items. Click "Add Item" to track specialty work.
                    </td>
                  </tr>
                ) : (
                  specialtyItems.map(item => (
                    <tr key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-3 px-4">
                        <Textarea
                          value={item.location_detail || ''}
                          onChange={(e) => updateSpecialtyMutation.mutate({
                            id: item.id,
                            data: { location_detail: e.target.value }
                          })}
                          rows={2}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          type="number"
                          value={item.shop_hours || ''}
                          onChange={(e) => updateSpecialtyMutation.mutate({
                            id: item.id,
                            data: { shop_hours: parseFloat(e.target.value) || 0 }
                          })}
                          className="bg-zinc-800 border-zinc-700 text-right w-28"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          type="number"
                          value={item.field_hours || ''}
                          onChange={(e) => updateSpecialtyMutation.mutate({
                            id: item.id,
                            data: { field_hours: parseFloat(e.target.value) || 0 }
                          })}
                          className="bg-zinc-800 border-zinc-700 text-right w-28"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Select
                          value={item.status}
                          onValueChange={(v) => updateSpecialtyMutation.mutate({
                            id: item.id,
                            data: { status: v }
                          })}
                        >
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          value={item.notes || ''}
                          onChange={(e) => updateSpecialtyMutation.mutate({
                            id: item.id,
                            data: { notes: e.target.value }
                          })}
                          className="bg-zinc-800 border-zinc-700"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteSpecialtyMutation.mutate(item.id)}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Section C: Total Hours & Baseline Comparison */}
      <Card className={`border mb-6 ${totals.hasDiscrepancy ? 'bg-red-500/5 border-red-500/30' : 'bg-zinc-900/50 border-zinc-800'}`}>
        <CardHeader>
          <CardTitle className="text-white">Total Hours Per Above Breakouts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Totals */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-zinc-400">Current Totals</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded">
                  <span className="text-zinc-300">Total Shop Hours</span>
                  <span className="text-xl font-bold text-amber-400">{totals.totalShop || '--'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded">
                  <span className="text-zinc-300">Total Field Hours</span>
                  <span className="text-xl font-bold text-amber-400">{totals.totalField || '--'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-800 rounded border border-zinc-700">
                  <span className="text-white font-semibold">Total Hours</span>
                  <span className="text-2xl font-bold text-amber-500">{totals.totalHours || '--'}</span>
                </div>
              </div>
            </div>

            {/* Baseline */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-zinc-400">Baseline (Estimate)</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Baseline Shop Hours</Label>
                  <Input
                    type="number"
                    value={project.baseline_shop_hours || ''}
                    onChange={(e) => updateProjectMutation.mutate({
                      id: project.id,
                      data: { baseline_shop_hours: parseFloat(e.target.value) || 0 }
                    })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Baseline Field Hours</Label>
                  <Input
                    type="number"
                    value={project.baseline_field_hours || ''}
                    onChange={(e) => updateProjectMutation.mutate({
                      id: project.id,
                      data: { baseline_field_hours: parseFloat(e.target.value) || 0 }
                    })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Discrepancy */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-zinc-400">Discrepancy</h4>
              <div className="space-y-3">
              <div className={`flex justify-between items-center p-3 rounded ${
                totals.shopDiscrepancy === 0 ? 'bg-green-500/10 border border-green-500/30' :
                'bg-red-500/10 border border-red-500/30'
              }`}>
                <span className="text-zinc-300">Shop Hours</span>
                <span className={`text-xl font-bold ${totals.shopDiscrepancy === 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totals.shopDiscrepancy === 0 ? '--' : (totals.shopDiscrepancy > 0 ? '+' : '') + totals.shopDiscrepancy}
                </span>
              </div>
              <div className={`flex justify-between items-center p-3 rounded ${
                totals.fieldDiscrepancy === 0 ? 'bg-green-500/10 border border-green-500/30' :
                'bg-red-500/10 border border-red-500/30'
              }`}>
                <span className="text-zinc-300">Field Hours</span>
                <span className={`text-xl font-bold ${totals.fieldDiscrepancy === 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totals.fieldDiscrepancy === 0 ? '--' : (totals.fieldDiscrepancy > 0 ? '+' : '') + totals.fieldDiscrepancy}
                </span>
              </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section D: Misses/Gap in Scope */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Misses / Gap in Scope</CardTitle>
              <p className="text-sm text-zinc-400 mt-1">
                {scopeGapTotals.openCount} open gaps • ${scopeGapTotals.totalCost.toLocaleString()} total rough cost
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => createGapMutation.mutate({
                project_id: projectId,
                location_description: '',
                rough_cost: 0,
                explanation: '',
                status: 'open'
              })}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={14} className="mr-1" />
              Add Gap
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Location/Description</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400 w-40">Rough Cost</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Explanation</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400 w-32">Status</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {scopeGaps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-zinc-500">
                      No scope gaps identified. Click "Add Gap" to log misses or scope changes.
                    </td>
                  </tr>
                ) : (
                  scopeGaps.map(gap => (
                    <tr key={gap.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-3 px-4">
                        <Textarea
                          value={gap.location_description || ''}
                          onChange={(e) => updateGapMutation.mutate({
                            id: gap.id,
                            data: { location_description: e.target.value }
                          })}
                          rows={2}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          type="number"
                          value={gap.rough_cost || ''}
                          onChange={(e) => updateGapMutation.mutate({
                            id: gap.id,
                            data: { rough_cost: parseFloat(e.target.value) || 0 }
                          })}
                          className="bg-zinc-800 border-zinc-700 text-right"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Textarea
                          value={gap.explanation || ''}
                          onChange={(e) => updateGapMutation.mutate({
                            id: gap.id,
                            data: { explanation: e.target.value }
                          })}
                          rows={2}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Select
                          value={gap.status}
                          onValueChange={(v) => updateGapMutation.mutate({
                            id: gap.id,
                            data: { status: v }
                          })}
                        >
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
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteGapMutation.mutate(gap.id)}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Reset Labor & Scope Data?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will zero out all category hours, delete all specialty items, and delete all scope gaps for this project. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetLaborMutation.mutate()}
              disabled={resetLaborMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {resetLaborMutation.isPending ? 'Resetting...' : 'Reset All Data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}