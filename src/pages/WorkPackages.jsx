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
    mutationFn: (data) => base44.entities.WorkPackage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      setShowForm(false);
      toast.success('Work package created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      setShowForm(false);
      setEditingPackage(null);
      setViewingPackage(null);
      toast.success('Updated');
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
    mutationFn: async ({ work_package_id, target_phase }) => {
      const response = await base44.functions.invoke('advanceWorkPackagePhase', { work_package_id, target_phase });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      toast.success('Phase advanced');
    }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <Package size={64} className="mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold text-foreground mb-4">Select Project</h3>
          <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose project..." />
            </SelectTrigger>
            <SelectContent>
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-[1800px] mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Work Packages</h1>
              <p className="text-xs text-muted-foreground mt-1.5">{selectedProject?.project_number} · {stats.total} packages</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
                <SelectTrigger className="w-64 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowForm(true)} className="h-9 gap-2">
                <Plus size={14} />
                New Package
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-muted/30 border-b border-border">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="grid grid-cols-5 gap-4">
            <Card className="card-elevated border-info/20 bg-info/5">
              <CardContent className="p-4">
                <div className="text-[11px] text-info uppercase tracking-wider font-semibold mb-2">In Progress</div>
                <div className="text-3xl font-semibold text-foreground tabular-nums">{stats.inProgress}</div>
              </CardContent>
            </Card>
            <Card className="card-elevated border-success/20 bg-success/5">
              <CardContent className="p-4">
                <div className="text-[11px] text-success uppercase tracking-wider font-semibold mb-2">Completed</div>
                <div className="text-3xl font-semibold text-foreground tabular-nums">{stats.completed}</div>
              </CardContent>
            </Card>
            <Card className="card-elevated">
              <CardContent className="p-4">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Avg Progress</div>
                <div className="text-3xl font-semibold text-primary tabular-nums">{stats.avgProgress.toFixed(0)}%</div>
              </CardContent>
            </Card>
            <Card className="card-elevated">
              <CardContent className="p-4">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Budget</div>
                <div className="text-xl font-semibold text-foreground tabular-nums">${(stats.totalBudget / 1000).toFixed(0)}K</div>
              </CardContent>
            </Card>
            <Card className={cn(
              "card-elevated",
              stats.variance > 0 ? "bg-destructive/5 border-destructive/20" : ""
            )}>
              <CardContent className="p-4">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Forecast</div>
                <div className={cn(
                  "text-xl font-semibold tabular-nums",
                  stats.variance > 0 ? "text-destructive" : "text-foreground"
                )}>
                  ${(stats.totalForecast / 1000).toFixed(0)}K
                </div>
                {stats.variance !== 0 && (
                  <div className={cn("text-xs tabular-nums", stats.variance > 0 ? "text-destructive" : "text-success")}>
                    {stats.variance > 0 ? '+' : ''}{(stats.variance / 1000).toFixed(0)}K
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-card border-b border-border">
        <div className="max-w-[1800px] mx-auto px-6 py-3">
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredPackages.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="p-12 text-center">
              <Package size={64} className="mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Work Packages</h3>
              <p className="text-sm text-muted-foreground mb-4">Create packages to track execution</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus size={16} className="mr-2" />
                Create First Package
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
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
                'delivery': { next: 'erection', label: 'To Erection', color: 'bg-primary' },
                'erection': { next: 'punch', label: 'To Punch', color: 'bg-success' },
                'punch': { next: 'completed', label: 'Complete', color: 'bg-muted-foreground' }
              };
              const currentPhase = phaseMap[pkg.phase];

              return (
                <Card 
                  key={pkg.id} 
                  className="card-elevated hover:border-border/80 transition-smooth cursor-pointer group"
                  onClick={() => setViewingPackage(pkg)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Phase Indicator */}
                      <div className={cn("w-1.5 h-20 rounded-full", currentPhase?.color || 'bg-muted-foreground')} />

                      {/* Package Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-foreground text-sm group-hover:text-primary transition-smooth">
                            {pkg.title}
                          </h3>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {pkg.wpid || pkg.id.slice(0, 8)}
                          </Badge>
                          <Badge variant="outline" className={cn(
                            "text-[10px] font-medium",
                            pkg.status === 'completed' && "border-success/50 text-success",
                            pkg.status === 'in_progress' && "border-info/50 text-info",
                            pkg.status === 'on_hold' && "border-warning/50 text-warning"
                          )}>
                            {pkg.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-mono text-foreground">{project?.project_number}</span>
                          <span>·</span>
                          <span>{pkg.assigned_pm || 'No PM'}</span>
                          <span>·</span>
                          <span>{(pkg.linked_drawing_set_ids?.length || 0)} dwgs</span>
                          <span>·</span>
                          <span>{(pkg.linked_delivery_ids?.length || 0)} deliveries</span>
                          <span>·</span>
                          <span>{taskCount} tasks</span>
                          {pkg.target_date && (
                            <>
                              <span>·</span>
                              <span className="text-primary">Target: {format(parseISO(pkg.target_date), 'MMM d')}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="flex items-center gap-4">
                        <div className="text-right min-w-[70px]">
                          <div className="text-2xl font-semibold text-primary tabular-nums">{pkg.percent_complete || 0}%</div>
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden mt-1.5">
                            <div className="h-full bg-primary transition-smooth" style={{ width: `${pkg.percent_complete || 0}%` }} />
                          </div>
                        </div>

                        {/* Budget */}
                        <div className="text-right min-w-[90px]">
                          <div className="text-sm font-medium text-foreground tabular-nums">${(budget / 1000).toFixed(0)}K</div>
                          <div className={cn(
                            "text-xs font-medium tabular-nums",
                            variance > 0 ? "text-destructive" : variance < 0 ? "text-success" : "text-muted-foreground"
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
                              className="h-8 px-3 bg-success hover:bg-success/90 text-white"
                            >
                              <ArrowRight size={14} />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletePackage(pkg);
                            }}
                            className="h-8 px-2 hover:text-destructive"
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
        <SheetContent className="overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{editingPackage ? 'Edit' : 'New'} Work Package</SheetTitle>
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
        <SheetContent className="overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Package Details</SheetTitle>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deletePackage?.wpid} - {deletePackage?.title}" and {tasks.filter(t => t.work_package_id === deletePackage?.id).length} tasks? Cannot undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deletePackage.id)} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}