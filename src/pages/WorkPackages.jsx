import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Package, Trash2, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import MetricsBar from '@/components/layout/MetricsBar';
import FilterBar from '@/components/layout/FilterBar';
import ContentSection from '@/components/layout/ContentSection';
import EmptyState from '@/components/layout/EmptyState';
import LoadingState from '@/components/layout/LoadingState';
import WorkPackageForm from '@/components/work-packages/WorkPackageForm';
import WorkPackageDetails from '@/components/work-packages/WorkPackageDetails';
import ProgressReport from '@/components/work-packages/ProgressReport';
import WorkflowGuidancePanel from '@/components/work-packages/WorkflowGuidancePanel';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { validatePhaseTransition } from '@/components/work-packages/WorkPackageBlockerEngine';

export default function WorkPackages() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [viewingPackage, setViewingPackage] = useState(null);
  const [deletePackage, setDeletePackage] = useState(null);
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [validationResults, setValidationResults] = useState({});
  const [showHints, setShowHints] = useState(() => {
    const saved = localStorage.getItem('workflow_hints_enabled');
    return saved === null ? true : saved === 'true';
  });
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 10 * 60 * 1000
  });

  const projects = currentUser?.role === 'admin' ? allProjects : allProjects.filter(p => p.assigned_users?.includes(currentUser.email));

  const { data: workPackages = [], isLoading } = useQuery({
    queryKey: ['work-packages', activeProjectId],
    queryFn: () => base44.entities.WorkPackage.filter({ project_id: activeProjectId }, '-created_date'),
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  React.useEffect(() => {
    if (!activeProjectId) return;
    const unsub = base44.entities.WorkPackage.subscribe((event) => {
      if (event.data?.project_id === activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['work-packages', activeProjectId] });
      }
    });
    return unsub;
  }, [activeProjectId, queryClient]);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', activeProjectId],
    queryFn: () => base44.entities.Task.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', activeProjectId],
    queryFn: () => base44.entities.SOVItem.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => base44.entities.CostCode.list('code'),
    staleTime: 10 * 60 * 1000
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', activeProjectId],
    queryFn: () => base44.entities.Document.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings', activeProjectId],
    queryFn: () => base44.entities.DrawingSet.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', activeProjectId],
    queryFn: () => base44.entities.Delivery.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.WorkPackage.create(data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-packages', activeProjectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectId] });
      setShowForm(false);
      setEditingPackage(null);
      toast.success('Work package created successfully');
    },
    onError: (error) => {
      console.error('Create work package error:', error);
      toast.error(error?.message || 'Failed to create work package');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await base44.entities.WorkPackage.update(id, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-packages', activeProjectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectId] });
      setShowForm(false);
      setEditingPackage(null);
      setViewingPackage(null);
      toast.success('Work package updated successfully');
    },
    onError: (error) => {
      console.error('Update work package error:', error);
      toast.error(error?.message || 'Failed to update work package');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (work_package_id) => {
      const response = await base44.functions.invoke('cascadeDeleteWorkPackage', { work_package_id });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      queryClient.invalidateQueries(['tasks', activeProjectId]);
      setDeletePackage(null);
      toast.success('Deleted');
    }
  });

  const advancePhaseMutation = useMutation({
    mutationFn: async ({ work_package_id, target_phase, wp }) => {
      // Validate before advancing
      const validation = await validatePhaseTransition(wp, target_phase, base44);
      
      if (!validation.canAdvance) {
        // Track blocked attempt
        await base44.functions.invoke('trackWorkflowBlocker', {
          work_package_id,
          project_id: wp.project_id,
          current_phase: wp.phase,
          attempted_phase: target_phase,
          blocker_type: validation.blockers[0]?.type,
          blocker_severity: validation.blockers[0]?.severity,
          blocker_message: validation.blockers[0]?.message
        });
        throw new Error('Cannot advance: prerequisites not met');
      }
      
      const response = await base44.functions.invoke('advanceWorkPackagePhase', { work_package_id, target_phase });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      toast.success('Phase advanced');
    },
    onError: (error) => {
      toast.error(error?.message || 'Cannot advance phase');
    }
  });
  
  // Validate work packages on load
  React.useEffect(() => {
    if (!workPackages.length) return;
    
    const validatePackages = async () => {
      const results = {};
      for (const wp of workPackages) {
        const nextPhase = getNextPhase(wp.phase);
        if (nextPhase) {
          const validation = await validatePhaseTransition(wp, nextPhase, base44);
          results[wp.id] = validation;
        }
      }
      setValidationResults(results);
    };
    
    validatePackages();
  }, [workPackages]);
  
  const getNextPhase = (currentPhase) => {
    const transitions = {
      'pre_fab': 'shop',
      'shop': 'delivery',
      'delivery': 'erection',
      'erection': 'punch'
    };
    return transitions[currentPhase];
  };
  
  const toggleHints = () => {
    const newValue = !showHints;
    setShowHints(newValue);
    localStorage.setItem('workflow_hints_enabled', newValue.toString());
  };

  const filteredPackages = useMemo(() => {
    return workPackages.filter(wp => phaseFilter === 'all' || wp.phase === phaseFilter);
  }, [workPackages, phaseFilter]);

  const stats = useMemo(() => {
    const total = workPackages.length;
    const inProgress = workPackages.filter(wp => wp.status === 'in_progress').length;
    const completed = workPackages.filter(wp => wp.status === 'completed' || wp.status === 'closed').length;
    const totalBudget = workPackages.reduce((sum, wp) => sum + (wp.budget_at_award || 0), 0);
    const totalForecast = workPackages.reduce((sum, wp) => sum + (wp.forecast_at_completion || 0), 0);
    const avgProgress = total > 0 ? workPackages.reduce((sum, wp) => sum + (wp.percent_complete || 0), 0) / total : 0;
    const variance = totalForecast - totalBudget;
    return { total, inProgress, completed, totalBudget, totalForecast, avgProgress, variance };
  }, [workPackages]);

  const selectedProject = projects.find(p => p.id === activeProjectId);

  if (!activeProjectId) {
    return (
      <PageShell>
        <ContentSection>
          <EmptyState
            icon={Package}
            title="Select Project"
            description="Choose a project to view and manage work packages"
            actionLabel="Select Project"
            onAction={() => {}}
          />
          <div className="max-w-md mx-auto mt-6">
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
        </ContentSection>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Breadcrumbs 
        items={[
          { label: 'Projects', href: '/projects' },
          { label: selectedProject?.name || 'Work Packages' }
        ]}
        className="mb-4"
      />
      
      <PageHeader
        title="Work Packages"
        subtitle={`${selectedProject?.project_number} • ${stats.total} packages`}
        actions={
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleHints}
              className="mr-2"
            >
              {showHints ? 'Hide' : 'Show'} Workflow Hints
            </Button>
            <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
              <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
              <Plus size={16} className="mr-2" />
              Create Work Package
            </Button>
          </>
        }
      />

      {workPackages.length > 0 && (
        <div className="mb-4">
          <ProgressReport workPackages={workPackages} tasks={tasks} />
        </div>
      )}

      <MetricsBar
        metrics={[
          { label: 'In Progress', value: stats.inProgress, color: 'text-blue-400' },
          { label: 'Completed', value: stats.completed, color: 'text-green-400' },
          { label: 'Avg Progress', value: `${stats.avgProgress.toFixed(0)}%`, color: 'text-cyan-400' },
          { label: 'Budget', value: `$${(stats.totalBudget / 1000).toFixed(0)}K`, color: 'text-white' },
          { 
            label: 'Forecast', 
            value: `$${(stats.totalForecast / 1000).toFixed(0)}K`, 
            color: stats.variance > 0 ? 'text-red-400' : 'text-white',
            subtext: stats.variance !== 0 ? `${stats.variance > 0 ? '+' : ''}${(stats.variance / 1000).toFixed(0)}K` : null
          }
        ]}
      />

      <FilterBar>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Phases</SelectItem>
            <SelectItem value="pre_fab">Pre-Fab</SelectItem>
            <SelectItem value="shop">Shop</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
            <SelectItem value="erection">Erection</SelectItem>
            <SelectItem value="punch">Punch</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <ContentSection>
        {isLoading ? (
          <LoadingState message="Loading work packages..." />
        ) : filteredPackages.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No Work Packages"
            description="Create packages to track execution across phases"
            actionLabel="Create First Package"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <div className="space-y-3">
            {filteredPackages.map(pkg => {
              const project = projects.find(p => p.id === pkg.project_id);
              const taskCount = tasks.filter(t => t.work_package_id === pkg.id).length;
              const budget = pkg.budget_at_award || 0;
              const forecast = pkg.forecast_at_completion || 0;
              const variance = forecast - budget;
              const variancePercent = budget > 0 ? ((variance / budget) * 100) : 0;
              const validation = validationResults[pkg.id];
              
              const phaseMap = {
                'pre_fab': { next: 'shop', label: 'Advance to Shop', color: 'bg-blue-500' },
                'shop': { next: 'delivery', label: 'Release for Delivery', color: 'bg-purple-500' },
                'delivery': { next: 'erection', label: 'Start Erection', color: 'bg-amber-500' },
                'erection': { next: 'punch', label: 'Begin Punchlist', color: 'bg-green-500' },
                'punch': { next: 'completed', label: 'Mark Complete', color: 'bg-zinc-500' }
              };
              const currentPhase = phaseMap[pkg.phase];

              return (
                <div key={pkg.id} className="space-y-2">
                  {validation && (
                    <WorkflowGuidancePanel 
                      validationResult={validation}
                      workPackage={pkg}
                      showHints={showHints}
                    />
                  )}
                  
                  <Card 
                    className="bg-gradient-to-r from-zinc-800 to-zinc-900 border-zinc-700/50 hover:border-zinc-600/50 transition-all cursor-pointer group rounded-lg"
                    onClick={() => setViewingPackage(pkg)}
                  >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Phase Indicator */}
                      <div className={cn("w-1 h-20 rounded-full", currentPhase?.color || 'bg-zinc-600')} />

                      {/* Package Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-white text-base group-hover:text-blue-400 transition-colors">
                            {pkg.title}
                          </h3>
                          <Badge variant="outline" className="text-[9px] font-mono bg-zinc-800 border-zinc-600/50 text-zinc-300">
                            {pkg.wpid || pkg.id.slice(0, 8)}
                          </Badge>
                          <Badge className={cn(
                            "text-[9px] font-semibold border",
                            pkg.status === 'completed' && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                            pkg.status === 'in_progress' && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                            pkg.status === 'on_hold' && "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          )}>
                            {pkg.status?.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] text-zinc-500 font-mono">
                          <span className="text-zinc-300 font-semibold">{project?.project_number}</span>
                          <span className="text-zinc-700">•</span>
                          <span>{pkg.assigned_pm || 'Unassigned'}</span>
                          <span className="text-zinc-700">•</span>
                          <span>{(pkg.linked_drawing_set_ids?.length || 0)} drawings</span>
                          <span className="text-zinc-700">•</span>
                          <span>{(pkg.linked_delivery_ids?.length || 0)} deliveries</span>
                          <span className="text-zinc-700">•</span>
                          <span>{taskCount} tasks</span>
                          {pkg.target_date && (
                            <>
                              <span className="text-zinc-700">•</span>
                              <span className="text-cyan-400 font-semibold">Target: {format(parseISO(pkg.target_date), 'MMM d')}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="flex items-center gap-4">
                        <div className="text-right min-w-[65px]">
                          <div className="text-2xl font-bold text-cyan-400">{pkg.percent_complete || 0}%</div>
                          <div className="w-20 h-1.5 bg-zinc-700 rounded-full overflow-hidden mt-2">
                            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{ width: `${pkg.percent_complete || 0}%` }} />
                          </div>
                        </div>

                        {/* Budget */}
                        <div className="text-right min-w-[90px]">
                          <div className="text-sm font-semibold text-white">${(budget / 1000).toFixed(0)}K</div>
                          <div className={cn(
                            "text-[10px] font-semibold mt-1",
                            variance > 0 ? "text-red-400" : variance < 0 ? "text-emerald-400" : "text-zinc-600"
                          )}>
                            {variance !== 0 && (variance > 0 ? '+' : '')}{variancePercent.toFixed(0)}%
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 ml-2">
                          {currentPhase && pkg.status !== 'completed' && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                advancePhaseMutation.mutate({ 
                                  work_package_id: pkg.id, 
                                  target_phase: currentPhase.next,
                                  wp: pkg 
                                });
                              }}
                              disabled={validation && !validation.canAdvance}
                              className={cn(
                                "h-9 px-3 text-xs font-semibold rounded-md whitespace-nowrap",
                                validation?.canAdvance 
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                              )}
                              title={validation?.canAdvance ? currentPhase.label : 'Prerequisites not met'}
                            >
                              {currentPhase.label}
                              <ArrowRight size={14} className="ml-1" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletePackage(pkg);
                            }}
                            className="h-9 px-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-md"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </ContentSection>

      <Sheet open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingPackage(null);
      }}>
        <SheetContent className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-zinc-700/50 overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="text-white font-semibold">{editingPackage ? 'Edit' : 'Create'} Work Package</SheetTitle>
          </SheetHeader>
          <WorkPackageForm
            package={editingPackage}
            projectId={activeProjectId}
            sovItems={sovItems}
            costCodes={costCodes}
            documents={documents}
            drawings={drawings}
            deliveries={deliveries}
            onSubmit={(data) => {
              if (editingPackage) {
                updateMutation.mutate({ id: editingPackage.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingPackage(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={!!viewingPackage} onOpenChange={(open) => {
        if (!open) setViewingPackage(null);
      }}>
        <SheetContent className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-zinc-700/50 overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle className="text-white font-semibold">Package Details</SheetTitle>
          </SheetHeader>
          {viewingPackage && (
            <WorkPackageDetails
              package={viewingPackage}
              projectId={activeProjectId}
              tasks={tasks.filter(t => t.work_package_id === viewingPackage.id)}
              sovItems={sovItems}
              costCodes={costCodes}
              documents={documents}
              drawings={drawings}
              deliveries={deliveries}
              onEdit={() => {
                setEditingPackage(viewingPackage);
                setViewingPackage(null);
                setShowForm(true);
              }}
              onAdvancePhase={(pkg, nextPhase) => advancePhaseMutation.mutate({ work_package_id: pkg.id, target_phase: nextPhase })}
              onUpdate={(data) => updateMutation.mutate({ id: viewingPackage.id, data })}
            />
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletePackage} onOpenChange={() => setDeletePackage(null)}>
        <AlertDialogContent className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-zinc-700/50 rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-semibold">Delete Package?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              Delete "{deletePackage?.wpid} - {deletePackage?.title}" and {tasks.filter(t => t.work_package_id === deletePackage?.id).length} tasks? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800 rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deletePackage.id)} className="bg-red-600 hover:bg-red-700 rounded-lg">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}