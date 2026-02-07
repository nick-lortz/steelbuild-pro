import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import RouteGuard from '@/components/shared/RouteGuard';
import { 
  RefreshCw, Package, AlertCircle, Download, Mail, Plus, Edit, Trash2,
  Check, X, CheckCircle, AlertTriangle, Zap, Activity, Target
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ReportScheduler from '@/components/reports/ReportScheduler';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';

/** ---------------------------
 * Helpers: normalization/transform
 * --------------------------- */
function toApiPayload(formLike: any) {
  return {
    // common fields
    name: formLike.name,
    status: formLike.status,
    description: formLike.description,
    target_date: formLike.target_date || null,
    project_id: formLike.project_id,
    // numeric
    progress_pct: Number(
      formLike.progress_percent ?? formLike.progress_pct ?? 0
    ),
    budget: Number(formLike.budget_amount ?? formLike.budget ?? 0),
    // lead
    lead: formLike.assigned_lead ?? formLike.lead ?? '',
  };
}

function normalizeWorkPackage(p: any) {
  const progress_pct = Number(p?.progress_pct ?? p?.progress_percent ?? 0);
  const budget = Number(p?.budget ?? p?.budget_amount ?? 0);
  const actual = Number(p?.actual ?? 0);
  const committed = Number(p?.committed ?? 0);

  return {
    ...p,
    blockers: Array.isArray(p?.blockers) ? p.blockers : [],
    progress_pct: Number.isFinite(progress_pct) ? progress_pct : 0,
    budget: Number.isFinite(budget) ? budget : 0,
    actual: Number.isFinite(actual) ? actual : 0,
    committed: Number.isFinite(committed) ? committed : 0,
    lead: p?.lead ?? p?.assigned_lead ?? '',
  };
}

function normalizeTasks(tasks: any[]) {
  return (tasks ?? []).map((t) => ({
    ...t,
    progress_pct: Number(t?.progress_pct ?? t?.progress_percent ?? 0),
  }));
}

/** ---------------------------
 * Page
 * --------------------------- */
export default function WorkPackagesPage() {
  return (
    <RouteGuard pageLabel="Work Packages">
      <WorkPackages />
    </RouteGuard>
  );
}

function WorkPackages() {
  const { activeProjectId: selectedProject, setActiveProjectId } = useActiveProject();
  const [statusFilter, setStatusFilter] = useState('all');
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showNewPackage, setShowNewPackage] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [showAI, setShowAI] = useState(true);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const projects = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allProjects;
    return allProjects.filter((p: any) =>
      p.project_manager === currentUser.email ||
      p.superintendent === currentUser.email ||
      (p.assigned_users && p.assigned_users.includes(currentUser.email))
    );
  }, [currentUser, allProjects]);

  // Auto-select first accessible project if none is selected
  useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      setActiveProjectId(projects[0].id);
    }
  }, [selectedProject, projects, setActiveProjectId]);

  // Fetch and normalize board data
  const {
    data: wpDataRaw = {},
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['workPackagesBoard', selectedProject],
    queryFn: async () => {
      const response = await base44.functions.invoke('getWorkPackagesBoardData', {
        projectId: selectedProject
      });

      // Unwrap response
      const d = (response?.data ?? response);
      const normalized = (d?.data || d?.body || d?.result) || d;
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug('[getWorkPackagesBoardData] normalized:', normalized);
      }
      return normalized;
    },
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000,
    retry: 2
  });

  const wpData = useMemo(() => {
    const {
      project = {},
      snapshot = {},
      packages = [],
      needsAttention = [],
      tasksByPackage = {},
      ai = {},
      warnings = []
    } = wpDataRaw || {};

    return {
      project,
      snapshot,
      packages: (packages ?? []).map(normalizeWorkPackage),
      needsAttention: (needsAttention ?? []).map(normalizeWorkPackage),
      tasksByPackage,
      ai,
      warnings
    };
  }, [wpDataRaw]);

  const {
    project = {},
    snapshot = {},
    packages = [],
    needsAttention = [],
    tasksByPackage = {},
    ai = {},
    warnings = []
  } = wpData;

  const filteredPackages = useMemo(() => {
    let filtered = packages;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p: any) => p.status === statusFilter);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((p: any) => p.name?.toLowerCase().includes(q));
    }

    if (needsAttentionOnly) {
      filtered = filtered.filter((p: any) => (p.blockers ?? []).length > 0);
    }

    return filtered;
  }, [packages, statusFilter, searchTerm, needsAttentionOnly]);

  const packagesByStatus = useMemo(() => {
    const grouped: Record<string, any[]> = {
      planned: [],
      in_progress: [],
      blocked: [],
      completed: []
    };

    filteredPackages.forEach((p: any) => {
      const status = (p.status ?? 'planned') as keyof typeof grouped;
      (grouped[status] ?? grouped.planned).push(p);
    });

    return grouped;
  }, [filteredPackages]);

  const createMutation = useMutation({
    mutationFn: (data: any) => base44.entities.WorkPackage.create(toApiPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workPackagesBoard', selectedProject] });
      toast.success('Work package created');
      setShowNewPackage(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to create: ${error.message ?? 'Error'}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => base44.entities.WorkPackage.update(id, toApiPayload(data)),
    onSuccess: (updatedData: any) => {
      const updated = updatedData?.data ?? updatedData;
      queryClient.invalidateQueries({ queryKey: ['workPackagesBoard', selectedProject] });
      if (selectedPackage?.id === (updated?.id ?? updated?.data?.id)) {
        setSelectedPackage(normalizeWorkPackage(updated?.data ?? updated));
      }
      toast.success('Package updated');
      setEditingCardId(null);
      setEditData({});
    },
    onError: (error: any) => {
      toast.error(`Failed to update: ${error.message ?? 'Error'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await base44.functions.invoke('cascadeDeleteWorkPackage', { work_package_id: id });
      return response?.data ?? response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workPackagesBoard', selectedProject] });
      toast.success('Package deleted');
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message ?? 'Error'}`);
      setDeleteConfirm(null);
    }
  });

  const handleRefresh = async () => {
    try {
      const result = await refetch();
      // react-query v5 returns { data, error, status }
      // Accept 'success' or presence of data
      // @ts-ignore
      if (result?.status === 'success' || result?.data) {
        setLastRefreshed(new Date());
        toast.success('Work packages refreshed');
      } else {
        toast.error('Failed to refresh');
      }
    } catch {
      toast.error('Failed to refresh');
    }
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      // Try a server-side PDF, gracefully fall back if unavailable
      const res = await base44.functions.invoke('generateWorkPackagesReport', {
        projectId: selectedProject
      }).catch(() => null);

      const data = res?.data ?? res;
      const fileBase64 = data?.fileBase64;
      const fileName = data?.fileName ?? `work-packages-${selectedProject}.pdf`;

      if (fileBase64) {
        const blob = await (await fetch(`data:application/pdf;base64,${fileBase64}`)).blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Work packages report generated');
      } else {
        // Fallback with current behavior
        toast.success('Work packages report generated (placeholder)');
      }
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleEditCard = (pkg: any) => {
    setEditingCardId(pkg.id);
    setEditData({
      name: pkg.name ?? '',
      status: pkg.status ?? 'planned',
      progress_percent: String(pkg.progress_pct ?? ''),
      target_date: pkg.target_date ?? '',
      assigned_lead: pkg.lead ?? '',
      budget_amount: String(pkg.budget ?? '')
    });
  };

  const handleSaveCard = (id: string) => {
    const progress = Number(editData.progress_percent);
    const budget = Number(editData.budget_amount);

    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      toast.error('Progress must be 0-100');
      return;
    }
    if (!Number.isFinite(budget) || budget < 0) {
      toast.error('Budget must be ≥ 0');
      return;
    }

    updateMutation.mutate({
      id,
      data: {
        name: editData.name,
        status: editData.status,
        progress_percent: progress,
        budget_amount: budget,
        target_date: editData.target_date,
        assigned_lead: editData.assigned_lead
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingCardId(null);
    setEditData({});
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Work Packages</h1>
            <p className="text-muted-foreground mt-2">Production Execution • Dependencies • Blockers</p>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm text-muted-foreground">
                {project.project_number} • {project.name}
              </p>
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  (warnings?.length ?? 0) === 0 ? "bg-green-500" : "bg-yellow-500"
                )}
              />
              <span className="text-xs text-muted-foreground">
                Data {(warnings?.length ?? 0) === 0 ? 'Complete' : 'Partial'}
              </span>
              <span className="text-xs text-muted-foreground">• Updated: {lastRefreshed.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedProject} onValueChange={setActiveProjectId} className="w-48">
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_number} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search packages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={needsAttentionOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setNeedsAttentionOnly(!needsAttentionOnly)}
              aria-label="Toggle Needs Attention filter"
              title="Show only packages needing attention"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Needs Attention
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching} aria-label="Refresh">
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={generatingPDF} aria-label="Export PDF">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowReportScheduler(true)} aria-label="Schedule report">
              <Mail className="h-4 w-4 mr-2" />
              Schedule
            </Button>
            <Button size="sm" onClick={() => setShowNewPackage(true)} aria-label="Create new package">
              <Plus className="h-4 w-4 mr-2" />
              New Package
            </Button>
          </div>
        </div>

        {/* Missing Data Warning */}
        {(warnings?.length ?? 0) > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Data Incomplete</p>
                  <ul className="text-xs text-muted-foreground mt-1 list-disc ml-4">
                    {(warnings ?? []).map((w: string, idx: number) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
