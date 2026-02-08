import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle, 
  ArrowRight, 
  Users, 
  Plus,
  TrendingUp,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';

export default function LaborScope() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [expandedSection, setExpandedSection] = useState('breakdown');
  const [editingValues, setEditingValues] = useState({});
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['labor-categories'],
    queryFn: () => apiClient.entities.LaborCategory.list('sequence_order'),
    staleTime: 10 * 60 * 1000
  });

  const { data: breakdowns = [], refetch: refetchBreakdowns } = useQuery({
    queryKey: ['labor-breakdowns', activeProjectId],
    queryFn: () => apiClient.entities.LaborBreakdown.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: specialtyItems = [] } = useQuery({
    queryKey: ['specialty-items', activeProjectId],
    queryFn: () => apiClient.entities.SpecialtyDiscussionItem.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: scopeGaps = [] } = useQuery({
    queryKey: ['scope-gaps', activeProjectId],
    queryFn: () => apiClient.entities.ScopeGap.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', activeProjectId],
    queryFn: () => apiClient.entities.Task.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  const initializeMutation = useMutation({
    mutationFn: (projectId) => apiClient.functions.invoke('initializeLaborBreakdown', { project_id: projectId }),
    onSuccess: () => {
      refetchBreakdowns();
      toast.success('Initialized');
    }
  });

  const allocateMutation = useMutation({
    mutationFn: (projectId) => apiClient.functions.invoke('allocateLaborToSchedule', { project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Labor allocated to schedule');
    }
  });

  const updateBreakdownMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.LaborBreakdown.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-breakdowns'] });
    }
  });

  const deleteBreakdownMutation = useMutation({
    mutationFn: (id) => apiClient.entities.LaborBreakdown.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-breakdowns'] });
      toast.success('Deleted');
    }
  });

  const createSpecialtyMutation = useMutation({
    mutationFn: (data) => apiClient.entities.SpecialtyDiscussionItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialty-items'] });
      toast.success('Added');
    }
  });

  const updateSpecialtyMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.SpecialtyDiscussionItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['specialty-items'] })
  });

  const deleteSpecialtyMutation = useMutation({
    mutationFn: (id) => apiClient.entities.SpecialtyDiscussionItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialty-items'] });
      toast.success('Deleted');
    }
  });

  const createGapMutation = useMutation({
    mutationFn: (data) => apiClient.entities.ScopeGap.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-gaps'] });
      toast.success('Gap added');
    }
  });

  const updateGapMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.ScopeGap.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scope-gaps'] })
  });

  const deleteGapMutation = useMutation({
    mutationFn: (id) => apiClient.entities.ScopeGap.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-gaps'] });
      toast.success('Deleted');
    }
  });

  const project = projects.find(p => p.id === activeProjectId);

  const totals = useMemo(() => {
    const categoryShop = breakdowns.reduce((sum, b) => sum + (Number(b.shop_hours) || 0), 0);
    const categoryField = breakdowns.reduce((sum, b) => sum + (Number(b.field_hours) || 0), 0);
    const specialtyShop = specialtyItems.reduce((sum, s) => sum + (Number(s.shop_hours) || 0), 0);
    const specialtyField = specialtyItems.reduce((sum, s) => sum + (Number(s.field_hours) || 0), 0);
    const totalShop = categoryShop + specialtyShop;
    const totalField = categoryField + specialtyField;
    const baselineShop = Number(project?.baseline_shop_hours) || 0;
    const baselineField = Number(project?.baseline_field_hours) || 0;
    const shopVar = totalShop - baselineShop;
    const fieldVar = totalField - baselineField;
    const gapCost = scopeGaps.reduce((sum, g) => sum + (Number(g.rough_cost) || 0), 0);
    const openGaps = scopeGaps.filter(g => g.status === 'open').length;

    return { 
      totalShop, totalField, baselineShop, baselineField, shopVar, fieldVar, 
      categoryShop, categoryField, specialtyShop, specialtyField,
      gapCost, openGaps
    };
  }, [breakdowns, specialtyItems, scopeGaps, project]);

  const scheduledHours = useMemo(() => {
    const shop = tasks.reduce((sum, t) => sum + (Number(t.planned_shop_hours) || 0), 0);
    const field = tasks.reduce((sum, t) => sum + (Number(t.planned_field_hours) || 0), 0);
    return { shop, field };
  }, [tasks]);

  if (!activeProjectId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <Users size={64} className="mx-auto mb-4 text-zinc-700" />
          <h3 className="text-xl font-bold text-white uppercase mb-4">Select Project</h3>
          <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
            <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white">
              <SelectValue placeholder="Choose project..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (breakdowns.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md">
          <CardContent className="pt-6 text-center">
            <Users size={48} className="mx-auto mb-4 text-zinc-700" />
            <h3 className="text-lg font-bold text-white uppercase mb-2">Initialize Labor Breakdown</h3>
            <p className="text-xs text-zinc-500 mb-4">No breakdown exists for this project</p>
            <Button onClick={() => initializeMutation.mutate(activeProjectId)} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
              <Plus size={14} className="mr-1" />
              INITIALIZE
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b-2 border-amber-500 bg-black">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">Labor & Scope</h1>
              <p className="text-xs text-zinc-500 font-mono mt-1">
                {project?.project_number} • {totals.totalShop + totals.totalField}h TOTAL
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => allocateMutation.mutate(activeProjectId)}
                disabled={allocateMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white font-bold h-9 text-xs uppercase"
              >
                <ArrowRight size={14} className="mr-1" />
                ALLOCATE TO SCHEDULE
              </Button>
              <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
                <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800 text-white h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-zinc-950 border-b border-zinc-800">
        <div className="max-w-[1800px] mx-auto px-6 py-3">
          <div className="grid grid-cols-6 gap-3">
            <Card className={cn(
              "border",
              totals.shopVar === 0 ? "bg-zinc-900 border-zinc-800" : "bg-red-500/10 border-red-500/20"
            )}>
              <CardContent className="p-3">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Shop Hours</div>
                <div className={cn("text-2xl font-black", totals.shopVar !== 0 ? "text-red-400" : "text-white")}>
                  {totals.totalShop}
                </div>
                <div className="text-[9px] text-zinc-600">
                  Base: {totals.baselineShop} {totals.shopVar !== 0 && `(${totals.shopVar > 0 ? '+' : ''}${totals.shopVar})`}
                </div>
              </CardContent>
            </Card>
            
            <Card className={cn(
              "border",
              totals.fieldVar === 0 ? "bg-zinc-900 border-zinc-800" : "bg-red-500/10 border-red-500/20"
            )}>
              <CardContent className="p-3">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Field Hours</div>
                <div className={cn("text-2xl font-black", totals.fieldVar !== 0 ? "text-red-400" : "text-white")}>
                  {totals.totalField}
                </div>
                <div className="text-[9px] text-zinc-600">
                  Base: {totals.baselineField} {totals.fieldVar !== 0 && `(${totals.fieldVar > 0 ? '+' : ''}${totals.fieldVar})`}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Scheduled</div>
                <div className="text-xl font-black text-white">{scheduledHours.shop + scheduledHours.field}</div>
                <div className="text-[9px] text-zinc-600">
                  {scheduledHours.shop}sh / {scheduledHours.field}fh
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Specialty</div>
                <div className="text-xl font-black text-purple-400">{totals.specialtyShop + totals.specialtyField}</div>
                <div className="text-[9px] text-zinc-600">{specialtyItems.length} items</div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border",
              totals.openGaps > 0 ? "bg-red-500/10 border-red-500/20" : "bg-green-500/10 border-green-500/20"
            )}>
              <CardContent className="p-3">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Scope Gaps</div>
                <div className={cn("text-2xl font-black", totals.openGaps > 0 ? "text-red-400" : "text-green-400")}>
                  {totals.openGaps}
                </div>
                <div className="text-[9px] text-zinc-600">Open</div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Gap Cost</div>
                <div className="text-xl font-black text-amber-500">${(totals.gapCost / 1000).toFixed(0)}K</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Variance Alerts */}
      {(totals.shopVar !== 0 || totals.fieldVar !== 0) && (
        <div className="bg-black border-b border-zinc-800">
          <div className="max-w-[1800px] mx-auto px-6 py-2">
            <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
              <AlertTriangle size={14} className="text-red-400" />
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
                BASELINE VARIANCE: Shop {totals.shopVar > 0 ? '+' : ''}{totals.shopVar}h, Field {totals.fieldVar > 0 ? '+' : ''}{totals.fieldVar}h
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-4 space-y-3">
        {/* Labor Breakdown */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2">
              <Users size={14} />
              Labor Breakdown ({breakdowns.length} categories)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-800">
              {breakdowns
                .sort((a, b) => {
                  const catA = categories.find(c => c.id === a.labor_category_id);
                  const catB = categories.find(c => c.id === b.labor_category_id);
                  return (catA?.sequence_order || 999) - (catB?.sequence_order || 999);
                })
                .map(bd => {
                const category = categories.find(c => c.id === bd.labor_category_id);
                const total = (Number(bd.shop_hours) || 0) + (Number(bd.field_hours) || 0);
                const scheduledForCategory = tasks
                  .filter(t => t.labor_category_id === bd.labor_category_id)
                  .reduce((sum, t) => sum + (Number(t.planned_shop_hours) || 0) + (Number(t.planned_field_hours) || 0), 0);
                const variance = total - scheduledForCategory;

                return (
                  <div key={bd.id} className="p-3 hover:bg-zinc-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-sm">{category?.name || 'Unknown Category'}</h4>
                        <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                          {bd.shop_hours}sh / {bd.field_hours}fh → {total}h total
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <Input
                            type="number"
                            value={editingValues[`${bd.id}-shop`] !== undefined ? editingValues[`${bd.id}-shop`] : (bd.shop_hours || '')}
                            onChange={(e) => {
                              setEditingValues(prev => ({
                                ...prev,
                                [`${bd.id}-shop`]: e.target.value
                              }));
                            }}
                            onBlur={(e) => {
                              const value = Number(e.target.value) || 0;
                              updateBreakdownMutation.mutate({ 
                                id: bd.id, 
                                data: { shop_hours: value }
                              });
                              setEditingValues(prev => {
                                const newState = {...prev};
                                delete newState[`${bd.id}-shop`];
                                return newState;
                              });
                            }}
                            className="w-20 h-7 bg-zinc-950 border-zinc-700 text-white text-xs text-center font-mono"
                            placeholder=""
                          />
                          <p className="text-[8px] text-zinc-600 uppercase mt-0.5">Shop</p>
                        </div>
                        
                        <div className="text-right">
                          <Input
                            type="number"
                            value={editingValues[`${bd.id}-field`] !== undefined ? editingValues[`${bd.id}-field`] : (bd.field_hours || '')}
                            onChange={(e) => {
                              setEditingValues(prev => ({
                                ...prev,
                                [`${bd.id}-field`]: e.target.value
                              }));
                            }}
                            onBlur={(e) => {
                              const value = Number(e.target.value) || 0;
                              updateBreakdownMutation.mutate({ 
                                id: bd.id, 
                                data: { field_hours: value }
                              });
                              setEditingValues(prev => {
                                const newState = {...prev};
                                delete newState[`${bd.id}-field`];
                                return newState;
                              });
                            }}
                            className="w-20 h-7 bg-zinc-950 border-zinc-700 text-white text-xs text-center font-mono"
                            placeholder=""
                          />
                          <p className="text-[8px] text-zinc-600 uppercase mt-0.5">Field</p>
                        </div>

                        <div className="text-right min-w-[60px]">
                          <div className="text-lg font-black text-amber-500">{total}</div>
                          <p className="text-[8px] text-zinc-600 uppercase">Total</p>
                        </div>

                        {variance !== 0 && (
                          <Badge className={cn(
                            "text-[9px] font-bold",
                            variance > 0 ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"
                          )}>
                            Δ{variance > 0 ? '+' : ''}{variance}
                          </Badge>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Delete this breakdown?')) {
                              deleteBreakdownMutation.mutate(bd.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 h-7 px-2 text-red-500"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Specialty Items */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2">
                <TrendingUp size={14} />
                Specialty Items ({specialtyItems.length})
              </CardTitle>
              <Button
                onClick={() => {
                  const detail = prompt('Location/Detail:');
                  if (!detail) return;
                  const shop = Number(prompt('Shop hours:', '0')) || 0;
                  const field = Number(prompt('Field hours:', '0')) || 0;
                  createSpecialtyMutation.mutate({
                    project_id: activeProjectId,
                    location_detail: detail,
                    shop_hours: shop,
                    field_hours: field,
                    status: 'open'
                  });
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white h-7 text-[10px] font-bold px-3"
              >
                <Plus size={10} className="mr-1" />
                ADD
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {specialtyItems.length === 0 ? (
              <p className="text-center text-zinc-600 py-6 text-xs">No specialty items</p>
            ) : (
              <div className="divide-y divide-zinc-800">
                {specialtyItems.map(item => (
                  <div key={item.id} className="p-3 hover:bg-zinc-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-white text-sm font-bold">{item.location_detail}</p>
                        <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                          {item.shop_hours}sh / {item.field_hours}fh
                        </p>
                      </div>
                      
                      <Badge className={cn(
                        "text-[9px] font-bold",
                        item.status === 'closed' && "bg-green-500/20 text-green-400",
                        item.status === 'reviewed' && "bg-blue-500/20 text-blue-400",
                        item.status === 'open' && "bg-amber-500/20 text-amber-400"
                      )}>
                        {item.status.toUpperCase()}
                      </Badge>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Delete specialty item?')) {
                            deleteSpecialtyMutation.mutate(item.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 h-7 px-2 text-red-500"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scope Gaps */}
        <Card className={cn(
          "border",
          totals.openGaps > 0 ? "bg-red-500/5 border-red-500/20" : "bg-zinc-900 border-zinc-800"
        )}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle size={14} className={totals.openGaps > 0 ? "text-red-400" : "text-zinc-600"} />
                Scope Gaps ({scopeGaps.length})
              </CardTitle>
              <Button
                onClick={() => {
                  const location = prompt('Location/Description:');
                  if (!location) return;
                  const cost = Number(prompt('Rough cost:', '0')) || 0;
                  const explanation = prompt('Explanation:', '');
                  createGapMutation.mutate({
                    project_id: activeProjectId,
                    location_description: location,
                    rough_cost: cost,
                    explanation: explanation || '',
                    status: 'open'
                  });
                }}
                className="bg-red-600 hover:bg-red-700 text-white h-7 text-[10px] font-bold px-3"
              >
                <Plus size={10} className="mr-1" />
                ADD GAP
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {scopeGaps.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 size={48} className="mx-auto mb-2 text-green-500/30" />
                <p className="text-xs text-zinc-600">No scope gaps identified</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {scopeGaps.map(gap => (
                  <div key={gap.id} className="p-3 hover:bg-zinc-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <h4 className="text-white text-sm font-bold">{gap.location_description}</h4>
                        {gap.explanation && (
                          <p className="text-[10px] text-zinc-500 mt-0.5">{gap.explanation}</p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-black text-red-400">
                          ${(gap.rough_cost / 1000).toFixed(0)}K
                        </div>
                      </div>

                      <Badge className={cn(
                        "text-[9px] font-bold min-w-[70px] justify-center",
                        gap.status === 'resolved' && "bg-green-500/20 text-green-400",
                        gap.status === 'submitted' && "bg-blue-500/20 text-blue-400",
                        gap.status === 'priced' && "bg-purple-500/20 text-purple-400",
                        gap.status === 'open' && "bg-red-500/20 text-red-400"
                      )}>
                        {gap.status.toUpperCase()}
                      </Badge>

                      <Select
                        value={gap.status}
                        onValueChange={(v) => updateGapMutation.mutate({ id: gap.id, data: { status: v }})}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectTrigger className="w-28 h-7 text-[10px] bg-zinc-950 border-zinc-700 opacity-0 group-hover:opacity-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="priced">Priced</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Delete gap?')) {
                            deleteGapMutation.mutate(gap.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 h-7 px-2 text-red-500"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}