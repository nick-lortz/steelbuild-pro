import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Search, Filter, AlertTriangle, Clock, CheckCircle2, 
  TrendingUp, Users, FileText, Calendar, Target
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import RFIHubKPIs from '@/components/rfi-hub/RFIHubKPIs';
import RFIHubFilters from '@/components/rfi-hub/RFIHubFilters';
import RFIHubTable from '@/components/rfi-hub/RFIHubTable';
import RFIHubForm from '@/components/rfi-hub/RFIHubForm';
import RFIHubTrends from '@/components/rfi-hub/RFIHubTrends';
import { toast } from 'sonner';
import { usePagination } from '@/components/shared/hooks/usePagination';
import Pagination from '@/components/ui/Pagination';
import { useEntitySubscription } from '@/components/shared/hooks/useSubscription';
import { groupBy, indexBy } from '@/components/shared/arrayUtils';
import { getRFIEscalationLevel, getBusinessDaysBetween } from '@/components/shared/businessRules';

export default function RFIHub() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('portfolio');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRFI, setEditingRFI] = useState(null);
  const { page, pageSize, skip, limit, goToPage, changePageSize, reset } = usePagination(1, 50);
  
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    ball_in_court: 'all',
    rfi_type: 'all',
    aging_bucket: 'all',
    date_range: 'all'
  });

  // Fetch all data
  const { data: allRFIs = [], isLoading: rfisLoading, isError: rfisError, error: rfisErrorObj } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list('-created_date'),
    retry: 2,
    retryDelay: 1000
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    retry: 2,
    retryDelay: 1000
  });

  // Real-time subscription with auto-reconnect
  useEntitySubscription('RFI', ['rfis'], {
    onEvent: (event) => {
      // Visual notification for new/updated RFIs
      if (event.type === 'create') {
        toast.info(`New RFI #${event.data.rfi_number}: ${event.data.subject}`);
      } else if (event.type === 'update' && event.data.status) {
        toast.info(`RFI #${event.data.rfi_number} → ${event.data.status}`);
      }
    }
  });

  // Computed RFIs with enrichment (optimized with pre-indexed projects)
  const enrichedRFIs = useMemo(() => {
    // Pre-index projects for O(1) lookup instead of O(n²)
    const projectsById = indexBy(projects, 'id');
    
    return allRFIs.map(rfi => {
      const project = projectsById[rfi.project_id];
      const submittedDate = rfi.submitted_date || rfi.created_date;
      const dueDate = rfi.due_date ? parseISO(rfi.due_date) : null;
      const today = new Date();
      
      // Calculate business days age
      const businessDaysOpen = submittedDate 
        ? getBusinessDaysBetween(new Date(submittedDate), today)
        : 0;
      
      // Escalation level (normal → warning → urgent → overdue)
      const escalationLevel = submittedDate 
        ? getRFIEscalationLevel(submittedDate, rfi.status)
        : 'normal';
      
      // Aging bucket based on business days
      let aging_bucket = '0-5 days';
      if (businessDaysOpen > 20) aging_bucket = '20+ days';
      else if (businessDaysOpen > 10) aging_bucket = '11-20 days';
      else if (businessDaysOpen > 5) aging_bucket = '6-10 days';
      
      // At risk flag
      const isOverdue = dueDate && today > dueDate;
      const isAtRisk = escalationLevel === 'urgent' || escalationLevel === 'overdue';
      
      // Days until due
      const daysUntilDue = dueDate ? differenceInDays(dueDate, today) : null;
      
      return {
        ...rfi,
        project_name: project?.name || 'Unknown',
        project_number: project?.project_number || 'N/A',
        business_days_open: businessDaysOpen,
        escalation_level: escalationLevel,
        aging_bucket,
        is_at_risk: isAtRisk,
        is_overdue: isOverdue,
        days_until_due: daysUntilDue
      };
    });
  }, [allRFIs, projects]);

  // Filter RFIs based on view mode and filters
  const filteredRFIs = useMemo(() => {
    let result = enrichedRFIs;

    // View mode filter
    if (viewMode === 'project' && selectedProjectId) {
      result = result.filter(r => r.project_id === selectedProjectId);
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter(r => r.status === filters.status);
    }

    // Priority filter
    if (filters.priority !== 'all') {
      result = result.filter(r => r.priority === filters.priority);
    }

    // Ball in court filter
    if (filters.ball_in_court !== 'all') {
      result = result.filter(r => r.ball_in_court === filters.ball_in_court);
    }

    // RFI type filter
    if (filters.rfi_type !== 'all') {
      result = result.filter(r => r.rfi_type === filters.rfi_type);
    }

    // Aging bucket filter
    if (filters.aging_bucket !== 'all') {
      result = result.filter(r => r.aging_bucket === filters.aging_bucket);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.subject?.toLowerCase().includes(term) ||
        r.question?.toLowerCase().includes(term) ||
        r.rfi_number?.toString().includes(term) ||
        r.project_name?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [enrichedRFIs, viewMode, selectedProjectId, filters, searchTerm]);

  // Group RFIs by category with pagination
  const { groupedRFIs, paginatedGroups } = useMemo(() => {
    const grouped = {
      active: filteredRFIs.filter(r => ['draft', 'internal_review', 'submitted', 'under_review'].includes(r.status)),
      awaiting: filteredRFIs.filter(r => r.ball_in_court === 'external' && r.status === 'submitted'),
      closed: filteredRFIs.filter(r => ['answered', 'closed'].includes(r.status)),
      highPriority: filteredRFIs.filter(r => r.priority === 'critical' || r.priority === 'high'),
      coordination: filteredRFIs.filter(r => r.category === 'coordination'),
      all: filteredRFIs
    };
    
    const paginated = {
      active: grouped.active.slice(skip, skip + limit),
      awaiting: grouped.awaiting.slice(skip, skip + limit),
      closed: grouped.closed.slice(skip, skip + limit),
      highPriority: grouped.highPriority.slice(skip, skip + limit),
      coordination: grouped.coordination.slice(skip, skip + limit),
      all: grouped.all.slice(skip, skip + limit)
    };
    
    return { groupedRFIs: grouped, paginatedGroups: paginated };
  }, [filteredRFIs, skip, limit]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RFI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      toast.success('RFI deleted');
    },
    onError: () => toast.error('Failed to delete RFI')
  });

  const handleDelete = (rfi) => {
    if (window.confirm(`Delete RFI #${rfi.rfi_number} - ${rfi.subject}?`)) {
      deleteMutation.mutate(rfi.id);
    }
  };

  const handleEdit = (rfi) => {
    setEditingRFI(rfi);
    setFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingRFI(null);
    setFormOpen(true);
  };

  if (rfisLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading RFI Hub...</p>
        </div>
      </div>
    );
  }

  if (rfisError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md">
          <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-bold mb-2">Failed to Load RFIs</h3>
          <p className="text-sm text-muted-foreground mb-4">{rfisErrorObj?.message || 'Network error'}</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['rfis'] })}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-foreground uppercase tracking-wide">RFI Hub</h1>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {filteredRFIs.length} RFIs • {groupedRFIs.active.length} ACTIVE • {groupedRFIs.closed.length} CLOSED
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-3">
              <div className="flex bg-muted border border-border rounded-lg p-1">
                <button
                  onClick={() => {
                    setViewMode('portfolio');
                    setSelectedProjectId(null);
                  }}
                  className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                    viewMode === 'portfolio' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Portfolio
                </button>
                <button
                  onClick={() => setViewMode('project')}
                  className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                    viewMode === 'project' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Project
                </button>
              </div>

              {viewMode === 'project' && (
                <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-80">
                    <SelectValue placeholder="Select Project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.project_number} - {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                onClick={handleAddNew}
                className="font-bold text-xs uppercase tracking-wider"
              >
                <Plus size={14} className="mr-1" />
                Add RFI
              </Button>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex items-center gap-3 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Search RFIs by number, subject, or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
            
            <RFIHubFilters filters={filters} onFilterChange={setFilters} />
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-6 space-y-6">
        {/* KPIs */}
        <RFIHubKPIs rfis={filteredRFIs} groupedRFIs={groupedRFIs} />

        {/* Trends */}
        <RFIHubTrends rfis={enrichedRFIs} viewMode={viewMode} selectedProjectId={selectedProjectId} />

        {/* RFI Lists by Category */}
         <Tabs defaultValue="active" className="space-y-4">
           <TabsList className="bg-muted border border-border">
            <TabsTrigger value="active">
              <FileText size={14} className="mr-2" />
              Active ({groupedRFIs.active.length})
            </TabsTrigger>
            <TabsTrigger value="awaiting">
              <Clock size={14} className="mr-2" />
              Awaiting Response ({groupedRFIs.awaiting.length})
            </TabsTrigger>
            <TabsTrigger value="closed">
              <CheckCircle2 size={14} className="mr-2" />
              Closed ({groupedRFIs.closed.length})
            </TabsTrigger>
            <TabsTrigger value="highPriority">
              <AlertTriangle size={14} className="mr-2" />
              High Priority ({groupedRFIs.highPriority.length})
            </TabsTrigger>
            <TabsTrigger value="coordination">
              <Users size={14} className="mr-2" />
              Coordination ({groupedRFIs.coordination.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({filteredRFIs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <RFIHubTable 
              rfis={paginatedGroups.active} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              title="Active RFIs"
            />
            {groupedRFIs.active.length > 0 && (
              <div className="mt-4">
                <Pagination
                  total={groupedRFIs.active.length}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={goToPage}
                  onPageSizeChange={changePageSize}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="awaiting">
            <RFIHubTable 
              rfis={paginatedGroups.awaiting} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              title="RFIs Awaiting External Response"
            />
            {groupedRFIs.awaiting.length > 0 && (
              <div className="mt-4">
                <Pagination
                  total={groupedRFIs.awaiting.length}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={goToPage}
                  onPageSizeChange={changePageSize}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="closed">
            <RFIHubTable 
              rfis={paginatedGroups.closed} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              title="Closed RFIs"
            />
            {groupedRFIs.closed.length > 0 && (
              <div className="mt-4">
                <Pagination
                  total={groupedRFIs.closed.length}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={goToPage}
                  onPageSizeChange={changePageSize}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="highPriority">
            <RFIHubTable 
              rfis={paginatedGroups.highPriority} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              title="High Priority RFIs"
            />
            {groupedRFIs.highPriority.length > 0 && (
              <div className="mt-4">
                <Pagination
                  total={groupedRFIs.highPriority.length}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={goToPage}
                  onPageSizeChange={changePageSize}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="coordination">
            <RFIHubTable 
              rfis={paginatedGroups.coordination} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              title="Coordination RFIs"
            />
            {groupedRFIs.coordination.length > 0 && (
              <div className="mt-4">
                <Pagination
                  total={groupedRFIs.coordination.length}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={goToPage}
                  onPageSizeChange={changePageSize}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            <RFIHubTable 
              rfis={paginatedGroups.all} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              title="All RFIs"
            />
            {groupedRFIs.all.length > 0 && (
              <div className="mt-4">
                <Pagination
                  total={groupedRFIs.all.length}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={goToPage}
                  onPageSizeChange={changePageSize}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Form Dialog */}
      {formOpen && (
        <RFIHubForm
          rfi={editingRFI}
          projects={projects}
          allRFIs={allRFIs}
          onClose={() => {
            setFormOpen(false);
            setEditingRFI(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['rfis'] });
            setFormOpen(false);
            setEditingRFI(null);
          }}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}