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
import { Plus, Package, Trash2, FileText, ArrowRight, Truck, DollarSign, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import WorkPackageForm from '@/components/work-packages/WorkPackageForm';
import WorkPackageDetails from '@/components/work-packages/WorkPackageDetails';

export default function WorkPackages() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [viewingPackage, setViewingPackage] = useState(null);
  const [deletePackage, setDeletePackage] = useState(null);
  const [phaseFilter, setPhaseFilter] = useState('all');
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

  const { data: workPackages = [], isLoading, error: workPackagesError } = useQuery({
    queryKey: ['work-packages', activeProjectId],
    queryFn: () => base44.entities.WorkPackage.filter({ project_id: activeProjectId }, '-created_date'),
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  React.useEffect(() => {
    if (!activeProjectId) return;
    
    let unsubscribed = false;
    const unsub = base44.entities.WorkPackage.subscribe((event) => {
      if (!unsubscribed && event.data?.project_id === activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['work-packages', activeProjectId] });
      }
    });
    
    return () => {
      unsubscribed = true;
      if (typeof unsub === 'function') {
        unsub();
      }
    };
  }, [activeProjectId, queryClient]);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', activeProjectId],
    queryFn: () => base44.entities.Task.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000,
    retry: 2
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', activeProjectId],
    queryFn: () => base44.entities.SOVItem.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000,
    retry: 2
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
    staleTime: 5 * 60 * 1000,
    retry: 2
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings', activeProjectId],
    queryFn: () => base44.entities.DrawingSet.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000,
    retry: 2
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', activeProjectId],
    queryFn: () => base44.entities.Delivery.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000,
    retry: 2
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkPackage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      setShowForm(false);
      toast.success('Work package created');
    },
    onError: (error) => {
      toast.error('Failed to create: ' + (error?.message || 'Unknown error'));
    },
    retry: 2
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      setShowForm(false);
      setEditingPackage(null);
      setViewingPackage(null);
      toast.success('Updated');
    },
    onError: (error) => {
      toast.error('Update failed: ' + (error?.message || 'Unknown error'));
    },
    retry: 2
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
    },
    onError: (error) => {
      toast.error('Delete failed: ' + (error?.message || 'Unknown error'));
    },
    retry: 1
  });

  const advancePhaseMutation = useMutation({
    mutationFn: async ({ work_package_id, target_phase }) => {
      const response = await base44.functions.invoke('advanceWorkPackagePhase', { work_package_id, target_phase });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      toast.success('Phase advanced');
    },
    onError: (error) => {
      toast.error('Failed to advance: ' + (error?.message || 'Unknown error'));
    },
    retry: 1
  });

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <Package size={64} className="mx-auto mb-4 text-zinc-700" />
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

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b-2 border-amber-500 bg-black">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">Work Packages</h1>
              <p className="text-xs text-zinc-500 font-mono mt-1">{selectedProject?.project_number} • {stats.total} PACKAGES</p>
            </div>
            <div className="flex items-center gap-3">
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
              <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-9 text-xs uppercase">
                <Plus size={14} className="mr-1" />
                NEW
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-zinc-950 border-b border-zinc-800">
        <div className="max-w-[1800px] mx-auto px-6 py-3">
          <div className="grid grid-cols-5 gap-3">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">In Progress</div>
                <div className="text-2xl font-black text-blue-400">{stats.inProgress}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
              <CardContent className="p-3">
                <div className="text-[9px] text-green-400 uppercase tracking-widest font-bold mb-0.5">Completed</div>
                <div className="text-2xl font-black text-green-400">{stats.completed}</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Avg Progress</div>
                <div className="text-2xl font-black text-amber-500">{stats.avgProgress.toFixed(0)}%</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Budget</div>
                <div className="text-xl font-black text-white">${(stats.totalBudget / 1000).toFixed(0)}K</div>
              </CardContent>
            </Card>
            <Card className={cn(
              "border",
              stats.variance > 0 ? "bg-red-500/10 border-red-500/20" : "bg-zinc-900 border-zinc-800"
            )}>
              <CardContent className="p-3">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Forecast</div>
                <div className={cn(
                  "text-xl font-black",
                  stats.variance > 0 ? "text-red-400" : "text-white"
                )}>
                  ${(stats.totalForecast / 1000).toFixed(0)}K
                </div>
                {stats.variance !== 0 && (
                  <div className={cn("text-[9px]", stats.variance > 0 ? "text-red-400" : "text-green-400")}>
                    {stats.variance > 0 ? '+' : ''}{(stats.variance / 1000).toFixed(0)}K
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-black border-b border-zinc-800">
        <div className="max-w-[1800px] mx-auto px-6 py-3">
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 h-9 text-sm">
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
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-4">
        {workPackagesError ? (
          <Card className="bg-red-900/20 border-red-500/50">
            <CardContent className="p-12 text-center">
              <AlertTriangle size={64} className="mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-bold text-white uppercase mb-2">Load Failed</h3>
              <p className="text-xs text-zinc-400 mb-4">{workPackagesError?.message || 'Unable to load work packages'}</p>
              <Button onClick={() => queryClient.invalidateQueries(['work-packages', activeProjectId])} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredPackages.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <Package size={64} className="mx-auto mb-4 text-zinc-700" />
              <h3 className="text-lg font-bold text-white uppercase mb-2">No Work Packages</h3>
              <p className="text-xs text-zinc-600 mb-4">Create packages to track execution</p>
              <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
                <Plus size={16} className="mr-2" />
                Create First Package
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredPackages.map(pkg => {
              const project = projects.find(p => p.id === pkg.project_id);
              const taskCount = tasks.filter(t => t.work_package_id === pkg.id).length;
              const budget = pkg.budget_at_award || 0;
              const forecast = pkg.forecast_at_completion || 0;
              const variance = forecast - budget;
              const variancePercent = budget > 0 ? ((variance / budget) * 100) : 0;
              
              const phaseMap = {
                'pre_fab': { next: 'shop', label: 'To Shop', color: 'bg-blue-500' },
                'shop': { next: 'delivery', label: 'To Delivery', color: 'bg-purple-500' },
                'delivery': { next: 'erection', label: 'To Erection', color: 'bg-amber-500' },
                'erection': { next: 'punch', label: 'To Punch', color: 'bg-green-500' },
                'punch': { next: 'completed', label: 'Complete', color: 'bg-zinc-500' }
              };
              const currentPhase = phaseMap[pkg.phase];

              return (
                <Card 
                  key={pkg.id} 
                  className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group"
                  onClick={() => setViewingPackage(pkg)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Phase Indicator */}
                      <div className={cn("w-1.5 h-16 rounded-full", currentPhase?.color || 'bg-zinc-700')} />

                      {/* Package Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">
                            {pkg.title}
                          </h3>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {pkg.wpid || pkg.id.slice(0, 8)}
                          </Badge>
                          <Badge className={cn(
                            "text-[10px] font-bold",
                            pkg.status === 'completed' && "bg-green-500/20 text-green-400",
                            pkg.status === 'in_progress' && "bg-blue-500/20 text-blue-400",
                            pkg.status === 'on_hold' && "bg-amber-500/20 text-amber-400"
                          )}>
                            {pkg.status?.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-mono">
                          <span className="text-white">{project?.project_number}</span>
                          <span>•</span>
                          <span>{pkg.assigned_pm || 'No PM'}</span>
                          <span>•</span>
                          <span>{(pkg.linked_drawing_set_ids?.length || 0)} dwgs</span>
                          <span>•</span>
                          <span>{(pkg.linked_delivery_ids?.length || 0)} deliveries</span>
                          <span>•</span>
                          <span>{taskCount} tasks</span>
                          {pkg.target_date && isValid(parseISO(pkg.target_date)) && (
                            <>
                              <span>•</span>
                              <span className="text-amber-500">Target: {format(parseISO(pkg.target_date), 'MMM d')}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="flex items-center gap-3">
                        <div className="text-right min-w-[60px]">
                          <div className="text-xl font-black text-amber-500">{pkg.percent_complete || 0}%</div>
                          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-amber-500 transition-all" style={{ width: `${pkg.percent_complete || 0}%` }} />
                          </div>
                        </div>

                        {/* Budget */}
                        <div className="text-right min-w-[80px]">
                          <div className="text-sm font-bold text-white">${(budget / 1000).toFixed(0)}K</div>
                          <div className={cn(
                            "text-[10px] font-bold",
                            variance > 0 ? "text-red-400" : variance < 0 ? "text-green-400" : "text-zinc-600"
                          )}>
                            {variance !== 0 && (variance > 0 ? '+' : '')}{variancePercent.toFixed(0)}%
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {currentPhase && pkg.status !== 'completed' && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                advancePhaseMutation.mutate({ work_package_id: pkg.id, target_phase: currentPhase.next });
                              }}
                              disabled={advancePhaseMutation.isPending}
                              className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-bold disabled:opacity-50"
                            >
                              {advancePhaseMutation.isPending ? (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <ArrowRight size={14} />
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletePackage(pkg);
                            }}
                            className="h-8 px-2 text-zinc-500 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingPackage(null);
      }}>
        <SheetContent className="bg-zinc-900 border-zinc-800 overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="text-white">{editingPackage ? 'Edit' : 'New'} Work Package</SheetTitle>
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
        <SheetContent className="bg-zinc-900 border-zinc-800 overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle className="text-white">Package Details</SheetTitle>
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
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Package?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Delete "{deletePackage?.wpid} - {deletePackage?.title}" and {tasks.filter(t => t.work_package_id === deletePackage?.id).length} tasks? Cannot undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deletePackage.id)} 
              disabled={deleteMutation.isPending}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}