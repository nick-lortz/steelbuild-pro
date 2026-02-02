import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Activity, AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import RFIPortfolioKPIs from '@/components/rfi-hub/RFIPortfolioKPIs';
import RFIFiltersPanel from '@/components/rfi-hub/RFIFiltersPanel';
import RFIListView from '@/components/rfi-hub/RFIListView';
import RFIStatusGroups from '@/components/rfi-hub/RFIStatusGroups';
import RFIAgingBuckets from '@/components/rfi-hub/RFIAgingBuckets';
import RFITrendChart from '@/components/rfi-hub/RFITrendChart';
import RFIDetailDrawer from '@/components/rfi-hub/RFIDetailDrawer';

export default function RFIHub() {
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [activeTab, setActiveTab] = useState('portfolio');
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    ballInCourt: 'all',
    discipline: 'all',
    agingBucket: 'all',
    searchTerm: '',
    dateRange: 'all'
  });
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedRFI, setSelectedRFI] = useState(null);

  // Fetch all RFIs (read-only from existing entity)
  const { data: allRFIs = [], isLoading } = useQuery({
    queryKey: ['rfi-hub-all'],
    queryFn: () => base44.entities.RFI.list('-created_date'),
    staleTime: 2 * 60 * 1000
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  // Computed: Filter and sort RFIs
  const filteredRFIs = useMemo(() => {
    let result = [...allRFIs];

    // Project filter
    if (selectedProjectId !== 'all') {
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
    if (filters.ballInCourt !== 'all') {
      result = result.filter(r => r.ball_in_court === filters.ballInCourt);
    }

    // Discipline filter
    if (filters.discipline !== 'all') {
      result = result.filter(r => r.discipline === filters.discipline);
    }

    // Search filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(r => 
        r.subject?.toLowerCase().includes(term) ||
        r.question?.toLowerCase().includes(term) ||
        r.rfi_number?.toString().includes(term)
      );
    }

    // Aging bucket filter
    if (filters.agingBucket !== 'all') {
      const now = new Date();
      result = result.filter(r => {
        if (!r.submitted_date) return false;
        const daysSince = Math.floor((now - new Date(r.submitted_date)) / (1000 * 60 * 60 * 24));
        
        switch(filters.agingBucket) {
          case '1-7': return daysSince >= 1 && daysSince <= 7;
          case '8-14': return daysSince >= 8 && daysSince <= 14;
          case '15-30': return daysSince >= 15 && daysSince <= 30;
          case '30+': return daysSince > 30;
          default: return true;
        }
      });
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      switch(filters.dateRange) {
        case '7d': cutoff.setDate(now.getDate() - 7); break;
        case '30d': cutoff.setDate(now.getDate() - 30); break;
        case '90d': cutoff.setDate(now.getDate() - 90); break;
        default: cutoff.setFullYear(2000);
      }
      result = result.filter(r => new Date(r.created_date) >= cutoff);
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'created_date' || sortBy === 'submitted_date' || sortBy === 'due_date') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      
      if (sortBy === 'rfi_number') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [allRFIs, selectedProjectId, filters, sortBy, sortOrder]);

  // Computed: Project-level metrics
  const projectMetrics = useMemo(() => {
    const metrics = {};
    
    projects.forEach(project => {
      const projectRFIs = allRFIs.filter(r => r.project_id === project.id);
      metrics[project.id] = {
        total: projectRFIs.length,
        open: projectRFIs.filter(r => !['closed', 'answered'].includes(r.status)).length,
        high_priority: projectRFIs.filter(r => r.priority === 'high' || r.priority === 'critical').length,
        overdue: projectRFIs.filter(r => r.due_date && new Date(r.due_date) < new Date() && !['closed', 'answered'].includes(r.status)).length
      };
    });
    
    return metrics;
  }, [allRFIs, projects]);

  if (isLoading) {
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">RFI Hub</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">
                {filteredRFIs.length} of {allRFIs.length} RFIs
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-2 rounded"
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.project_number} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="portfolio">
              <Building2 size={14} className="mr-2" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="active">
              <Activity size={14} className="mr-2" />
              Active
            </TabsTrigger>
            <TabsTrigger value="awaiting">
              <Clock size={14} className="mr-2" />
              Awaiting Response
            </TabsTrigger>
            <TabsTrigger value="high-priority">
              <AlertCircle size={14} className="mr-2" />
              High Priority
            </TabsTrigger>
            <TabsTrigger value="aging">
              <TrendingUp size={14} className="mr-2" />
              Aging Analysis
            </TabsTrigger>
            <TabsTrigger value="all">
              All RFIs
            </TabsTrigger>
          </TabsList>

          {/* Portfolio Dashboard */}
          <TabsContent value="portfolio" className="space-y-6">
            <RFIPortfolioKPIs 
              rfis={filteredRFIs} 
              allRFIs={allRFIs}
              projects={projects}
              projectMetrics={projectMetrics}
            />
            
            <RFITrendChart rfis={allRFIs} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RFIStatusGroups 
                  rfis={filteredRFIs}
                  onSelectRFI={setSelectedRFI}
                />
              </div>
              <div>
                <RFIAgingBuckets rfis={filteredRFIs} />
              </div>
            </div>
          </TabsContent>

          {/* Active RFIs */}
          <TabsContent value="active" className="space-y-6">
            <RFIFiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              sortBy={sortBy}
              onSortChange={setSortBy}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
            />
            <RFIListView
              rfis={filteredRFIs.filter(r => !['closed', 'answered'].includes(r.status))}
              projects={projects}
              onSelectRFI={setSelectedRFI}
            />
          </TabsContent>

          {/* Awaiting Response */}
          <TabsContent value="awaiting" className="space-y-6">
            <RFIFiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              sortBy={sortBy}
              onSortChange={setSortBy}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
            />
            <RFIListView
              rfis={filteredRFIs.filter(r => ['submitted', 'under_review'].includes(r.status))}
              projects={projects}
              onSelectRFI={setSelectedRFI}
            />
          </TabsContent>

          {/* High Priority */}
          <TabsContent value="high-priority" className="space-y-6">
            <RFIFiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              sortBy={sortBy}
              onSortChange={setSortBy}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
            />
            <RFIListView
              rfis={filteredRFIs.filter(r => ['high', 'critical'].includes(r.priority))}
              projects={projects}
              onSelectRFI={setSelectedRFI}
            />
          </TabsContent>

          {/* Aging Analysis */}
          <TabsContent value="aging" className="space-y-6">
            <RFIAgingBuckets rfis={filteredRFIs} detailed />
          </TabsContent>

          {/* All RFIs */}
          <TabsContent value="all" className="space-y-6">
            <RFIFiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              sortBy={sortBy}
              onSortChange={setSortBy}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
            />
            <RFIListView
              rfis={filteredRFIs}
              projects={projects}
              onSelectRFI={setSelectedRFI}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Drawer */}
      <RFIDetailDrawer
        rfi={selectedRFI}
        projects={projects}
        open={!!selectedRFI}
        onClose={() => setSelectedRFI(null)}
      />
    </div>
  );
}