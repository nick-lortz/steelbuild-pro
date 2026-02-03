import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
  const { data: allRFIs = [], isLoading: rfisLoading } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  // Computed RFIs with enrichment
  const enrichedRFIs = useMemo(() => {
    return allRFIs.map(rfi => {
      const project = projects.find(p => p.id === rfi.project_id);
      const createdDate = rfi.created_date ? parseISO(rfi.created_date) : null;
      const dueDate = rfi.due_date ? parseISO(rfi.due_date) : null;
      const today = new Date();
      
      // Calculate age
      const ageDays = createdDate ? differenceInDays(today, createdDate) : 0;
      
      // Aging bucket
      let aging_bucket = '0-7 days';
      if (ageDays > 30) aging_bucket = '30+ days';
      else if (ageDays > 14) aging_bucket = '15-30 days';
      else if (ageDays > 7) aging_bucket = '8-14 days';
      
      // At risk flag
      const isOverdue = dueDate && today > dueDate;
      const isAtRisk = isOverdue || ageDays > 14;
      
      // Days until due
      const daysUntilDue = dueDate ? differenceInDays(dueDate, today) : null;
      
      return {
        ...rfi,
        project_name: project?.name || 'Unknown',
        project_number: project?.project_number || 'N/A',
        age_days: ageDays,
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
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading RFI Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-black sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">RFI Hub</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">
                {filteredRFIs.length} RFIs • {groupedRFIs.active.length} ACTIVE • {groupedRFIs.closed.length} CLOSED
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-3">
              <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => {
                    setViewMode('portfolio');
                    setSelectedProjectId(null);
                  }}
                  className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                    viewMode === 'portfolio' 
                      ? 'bg-amber-500 text-black' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Portfolio
                </button>
                <button
                  onClick={() => setViewMode('project')}
                  className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                    viewMode === 'project' 
                      ? 'bg-amber-500 text-black' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Project
                </button>
              </div>

              {viewMode === 'project' && (
                <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-80 bg-zinc-900 border-zinc-800">
                    <SelectValue placeholder="Select Project..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
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
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider"
              >
                <Plus size={14} className="mr-1" />
                Add RFI
              </Button>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex items-center gap-3 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={16} />
              <Input
                placeholder="Search RFIs by number, subject, or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-800 text-sm"
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
          <TabsList className="bg-zinc-900 border border-zinc-800">
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
  );
}