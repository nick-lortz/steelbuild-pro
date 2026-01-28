import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Package, Trash2, FileText, Link as LinkIcon, ArrowRight, List, LayoutGrid } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import WorkPackageForm from '@/components/work-packages/WorkPackageForm';
import WorkPackageDetails from '@/components/work-packages/WorkPackageDetails';
import KanbanView from '@/components/schedule/KanbanView';

export default function WorkPackages() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [viewingPackage, setViewingPackage] = useState(null);
  const [deletePackage, setDeletePackage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const projects = currentUser?.role === 'admin' ?
  allProjects :
  allProjects.filter((p) => p.assigned_users?.includes(currentUser?.email));

  const { data: workPackages = [], isLoading } = useQuery({
    queryKey: ['work-packages', activeProjectId],
    queryFn: () => base44.entities.WorkPackage.filter({ project_id: activeProjectId }, '-created_date'),
    enabled: !!activeProjectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', activeProjectId],
    queryFn: () => base44.entities.Task.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', activeProjectId]);
      toast.success('Task updated');
    }
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', activeProjectId],
    queryFn: () => base44.entities.SOVItem.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => base44.entities.CostCode.list('code')
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', activeProjectId],
    queryFn: () => base44.entities.Document.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings', activeProjectId],
    queryFn: () => base44.entities.DrawingSet.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkPackage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      setShowForm(false);
      toast.success('Work package created');
    },
    onError: (error) => {
      toast.error('Failed to create: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      setShowForm(false);
      setEditingPackage(null);
      setViewingPackage(null);
      toast.success('Work package updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (work_package_id) => {
      const response = await base44.functions.invoke('cascadeDeleteWorkPackage', { work_package_id });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      queryClient.invalidateQueries(['tasks', activeProjectId]);
      setDeletePackage(null);
      toast.success(data.message || 'Work package deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete');
    }
  });

  const advancePhaseMutation = useMutation({
    mutationFn: async ({ work_package_id, target_phase }) => {
      const response = await base44.functions.invoke('advanceWorkPackagePhase', {
        work_package_id,
        target_phase
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      queryClient.invalidateQueries(['tasks', activeProjectId]);
      toast.success('Phase advanced');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to advance phase');
    }
  });

  const handleAdvancePhase = (pkg, nextPhase) => {
    advancePhaseMutation.mutate({ work_package_id: pkg.id, target_phase: nextPhase });
  };

  const getPackageTaskCount = (packageId) => {
    return tasks.filter((t) => t.work_package_id === packageId).length;
  };

  const columns = [
  {
    header: 'Package',
    accessor: 'wpid',
    render: (pkg) =>
    <div>
          <div className="font-mono text-amber-500">{pkg.wpid || pkg.id.slice(0, 8)}</div>
          <div className="text-sm text-white font-medium">{pkg.title}</div>
        </div>

  },
  {
    header: 'Phase',
    render: (pkg) => <StatusBadge status={pkg.phase} />
  },
  {
    header: 'Status',
    render: (pkg) => <StatusBadge status={pkg.status} />
  },
  {
    header: 'Progress',
    render: (pkg) =>
    <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
          className="h-full bg-amber-500 transition-all"
          style={{ width: `${pkg.percent_complete || 0}%` }} />

          </div>
          <span className="text-sm text-zinc-400">{pkg.percent_complete || 0}%</span>
        </div>

  },
  {
    header: 'Tonnage',
    render: (pkg) =>
    <div className="text-zinc-200">{pkg.tonnage ? `${pkg.tonnage} tons` : '-'}</div>

  },
  {
    header: 'SOV Lines',
    render: (pkg) =>
    <div className="text-zinc-200">{pkg.sov_item_ids?.length || 0}</div>

  },
  {
    header: 'Tasks',
    render: (pkg) =>
    <div className="text-zinc-200">{getPackageTaskCount(pkg.id)}</div>

  },
  {
    header: 'Target',
    render: (pkg) => pkg.target_date ? format(new Date(pkg.target_date), 'MMM d') : '-'
  },
  {
    header: '',
    render: (pkg) => {
      const phaseMap = {
        'pre_fab': { next: 'shop', label: 'To Shop' },
        'shop': { next: 'delivery', label: 'To Delivery' },
        'delivery': { next: 'erection', label: 'To Erection' },
        'erection': { next: 'punch', label: 'To Punch' },
        'punch': { next: 'completed', label: 'Complete' }
      };
      const currentPhase = phaseMap[pkg.phase];

      return (
        <div className="flex items-center gap-2">
            {currentPhase && pkg.status !== 'complete' &&
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleAdvancePhase(pkg, currentPhase.next);
            }}
            className="text-green-400 hover:text-green-300 hover:bg-green-500/10">

                <ArrowRight size={16} />
              </Button>
          }
            <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setDeletePackage(pkg);
            }}
            className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10">

              <Trash2 size={16} />
            </Button>
          </div>);

    }
  }];


  const selectedProject = projects.find((p) => p.id === activeProjectId);

  const filteredPackages = useMemo(() => {
    return workPackages.filter((wp) => {
      const matchesStatus = statusFilter === 'all' || wp.status === statusFilter;
      const matchesPhase = phaseFilter === 'all' || wp.phase === phaseFilter;
      return matchesStatus && matchesPhase;
    });
  }, [workPackages, statusFilter, phaseFilter]);

  const summaryStats = useMemo(() => {
    const inProgress = workPackages.filter((wp) => wp.status === 'in_progress').length;
    const completed = workPackages.filter((wp) => wp.status === 'completed' || wp.status === 'closed').length;
    const totalBudget = workPackages.reduce((sum, wp) => sum + (wp.budget_at_award || 0), 0);
    const totalForecast = workPackages.reduce((sum, wp) => sum + (wp.forecast_at_completion || 0), 0);
    const avgProgress = workPackages.length > 0 ?
    workPackages.reduce((sum, wp) => sum + (wp.percent_complete || 0), 0) / workPackages.length :
    0;

    return { inProgress, completed, totalBudget, totalForecast, avgProgress };
  }, [workPackages]);

  if (!activeProjectId) {
    return (
      <div className="min-h-screen bg-black">
        <div className="border-b border-zinc-800 bg-black">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Work Packages</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">SELECT PROJECT</p>
            </div>
          </div>
        </div>
        <div className="max-w-[1600px] mx-auto px-6 py-12">
          <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
            <SelectTrigger className="w-[280px] bg-zinc-900 border-zinc-800 text-white">
              <SelectValue placeholder="SELECT PROJECT" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
              {projects.map((p) =>
                <SelectItem key={p.id} value={p.id} className="text-white">
                  {p.project_number} - {p.name}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Work Packages</h1>
              <p className="text-xs text-zinc-600 mt-1">{selectedProject?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
                <SelectTrigger className="w-[280px] bg-zinc-900 border-zinc-800 text-white">
                  <SelectValue>
                    {selectedProject ? `${selectedProject.project_number} - ${selectedProject.name}` : 'Select project'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
                  {projects.map((p) =>
                    <SelectItem key={p.id} value={p.id} className="text-white">
                      {p.project_number} - {p.name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider">
                <Plus size={14} className="mr-1" />
                NEW
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">IN PROGRESS</div>
              <div className="text-2xl font-bold font-mono text-white">{summaryStats.inProgress}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">COMPLETED</div>
              <div className="text-2xl font-bold font-mono text-green-500">{summaryStats.completed}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">BUDGET</div>
              <div className="text-2xl font-bold font-mono text-amber-500">${(summaryStats.totalBudget / 1000).toFixed(0)}K</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">FORECAST</div>
              <div className="text-2xl font-bold font-mono text-white">${(summaryStats.totalForecast / 1000).toFixed(0)}K</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-3">
          <div className="flex gap-3 items-center justify-between">
            <div className="flex gap-3">
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 text-white">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              <Button
                size="sm"
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'bg-amber-500 text-black hover:bg-amber-600' : 'text-zinc-400 hover:text-white'}
              >
                <List size={14} />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                onClick={() => setViewMode('kanban')}
                className={viewMode === 'kanban' ? 'bg-amber-500 text-black hover:bg-amber-600' : 'text-zinc-400 hover:text-white'}
              >
                <LayoutGrid size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-xs text-zinc-600 uppercase tracking-widest">LOADING...</p>
            </div>
          </div>
        ) : viewMode === 'kanban' ? (
          <KanbanView
            tasks={tasks}
            projects={projects}
            onTaskUpdate={(taskId, updates) => updateTaskMutation.mutate({ id: taskId, data: updates })}
            onTaskClick={(task) => {
              const pkg = workPackages.find(wp => wp.id === task.work_package_id);
              if (pkg) setViewingPackage(pkg);
            }}
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredPackages}
            onRowClick={(pkg) => setViewingPackage(pkg)}
            emptyMessage="No work packages yet. Create packages to track execution, link to SOV and cost codes."
          />
        )}
      </div>

      {/* Create/Edit Sheet */}
      <Sheet open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingPackage(null);
      }}>
        <SheetContent className="bg-zinc-900 border-zinc-800 overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="text-white">
              {editingPackage ? 'Edit Work Package' : 'New Work Package'}
            </SheetTitle>
          </SheetHeader>
          <WorkPackageForm
            package={editingPackage}
            projectId={activeProjectId}
            sovItems={sovItems}
            costCodes={costCodes}
            documents={documents}
            drawings={drawings}
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
            isLoading={createMutation.isPending || updateMutation.isPending} />

        </SheetContent>
      </Sheet>

      {/* Details Sheet */}
      <Sheet open={!!viewingPackage} onOpenChange={(open) => {
        if (!open) setViewingPackage(null);
      }}>
        <SheetContent className="bg-zinc-900 border-zinc-800 overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle className="text-white">Work Package Details</SheetTitle>
          </SheetHeader>
          {viewingPackage &&
          <WorkPackageDetails
            package={viewingPackage}
            projectId={activeProjectId}
            tasks={tasks.filter((t) => t.work_package_id === viewingPackage.id)}
            sovItems={sovItems}
            costCodes={costCodes}
            documents={documents}
            drawings={drawings}
            onEdit={() => {
              setEditingPackage(viewingPackage);
              setViewingPackage(null);
              setShowForm(true);
            }}
            onAdvancePhase={handleAdvancePhase}
            onUpdate={(data) => updateMutation.mutate({ id: viewingPackage.id, data })} />

          }
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePackage} onOpenChange={() => setDeletePackage(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Work Package?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Permanently delete "{deletePackage?.wpid} - {deletePackage?.title}" and {getPackageTaskCount(deletePackage?.id || '')} tasks. Cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deletePackage.id)}
              className="bg-red-500 hover:bg-red-600">

              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}