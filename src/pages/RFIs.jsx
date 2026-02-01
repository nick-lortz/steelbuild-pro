import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PageHeader from '@/components/ui/PageHeader';
import RFIPortfolioDashboard from '@/components/rfis/RFIPortfolioDashboard';
import RFIFiltersAdvanced from '@/components/rfis/RFIFiltersAdvanced';
import RFIListCompact from '@/components/rfis/RFIListCompact';
import RFIProjectSummary from '@/components/rfis/RFIProjectSummary';
import RFIDetailPanel from '@/components/rfis/RFIDetailPanel';
import RFIWizard from '@/components/rfis/RFIWizard';
import { Plus, LayoutDashboard, List, BarChart3 } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export default function RFIsPage() {
  const [view, setView] = useState('portfolio');
  const [selectedRFI, setSelectedRFI] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    project_id: 'all',
    status: 'all',
    priority: 'all',
    ball_in_court: 'all',
    rfi_type: 'all',
    view: 'active',
    assigned_to: '',
    category: 'all',
    blockers_only: 'all'
  });

  const { data: rfis = [], isLoading: rfisLoading } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      project_id: 'all',
      status: 'all',
      priority: 'all',
      ball_in_court: 'all',
      rfi_type: 'all',
      view: 'active',
      assigned_to: '',
      category: 'all',
      blockers_only: 'all'
    });
  };

  const filteredRFIs = useMemo(() => {
    let result = [...rfis];

    // Search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(r => 
        r.subject?.toLowerCase().includes(search) ||
        r.question?.toLowerCase().includes(search) ||
        String(r.rfi_number).includes(search)
      );
    }

    // Project
    if (filters.project_id !== 'all') {
      result = result.filter(r => r.project_id === filters.project_id);
    }

    // Status
    if (filters.status !== 'all') {
      result = result.filter(r => r.status === filters.status);
    }

    // Priority
    if (filters.priority !== 'all') {
      result = result.filter(r => r.priority === filters.priority);
    }

    // Ball in Court
    if (filters.ball_in_court !== 'all') {
      result = result.filter(r => r.ball_in_court === filters.ball_in_court);
    }

    // RFI Type
    if (filters.rfi_type !== 'all') {
      result = result.filter(r => r.rfi_type === filters.rfi_type);
    }

    // Category
    if (filters.category !== 'all') {
      result = result.filter(r => r.category === filters.category);
    }

    // Assigned To
    if (filters.assigned_to) {
      const assigned = filters.assigned_to.toLowerCase();
      result = result.filter(r => 
        r.assigned_to?.toLowerCase().includes(assigned) ||
        r.response_owner?.toLowerCase().includes(assigned)
      );
    }

    // Blockers Only
    if (filters.blockers_only === 'true') {
      result = result.filter(r => r.blocker_info?.is_blocker);
    }

    // View Mode
    const now = new Date();
    switch (filters.view) {
      case 'active':
        result = result.filter(r => !['answered', 'closed'].includes(r.status));
        break;
      case 'awaiting':
        result = result.filter(r => ['submitted', 'under_review'].includes(r.status));
        break;
      case 'overdue':
        result = result.filter(r => {
          if (['answered', 'closed'].includes(r.status)) return false;
          if (!r.due_date) return false;
          return new Date(r.due_date) < now;
        });
        break;
      case 'blockers':
        result = result.filter(r => r.blocker_info?.is_blocker && !['answered', 'closed'].includes(r.status));
        break;
      case 'answered':
        result = result.filter(r => r.status === 'answered');
        break;
      case 'closed':
        result = result.filter(r => r.status === 'closed');
        break;
      case 'all':
      default:
        break;
    }

    return result;
  }, [rfis, filters]);

  if (rfisLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading RFIs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="RFI Management"
        subtitle={`${rfis.length} total RFIs • ${filteredRFIs.length} matching filters`}
      >
        <Button onClick={() => setShowWizard(true)}>
          <Plus size={16} className="mr-2" />
          New RFI
        </Button>
      </PageHeader>

      <div className="p-6 space-y-6">
        {/* View Tabs */}
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="portfolio">
              <LayoutDashboard size={16} className="mr-2" />
              Portfolio Dashboard
            </TabsTrigger>
            <TabsTrigger value="list">
              <List size={16} className="mr-2" />
              RFI List
            </TabsTrigger>
            <TabsTrigger value="projects">
              <BarChart3 size={16} className="mr-2" />
              By Project
            </TabsTrigger>
          </TabsList>

          {/* Portfolio Dashboard View */}
          <TabsContent value="portfolio" className="space-y-6">
            <RFIPortfolioDashboard rfis={rfis} projects={projects} />
            
            <RFIFiltersAdvanced
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              projects={projects}
            />
            
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <RFIListCompact 
                  rfis={filteredRFIs} 
                  projects={projects}
                  onSelect={setSelectedRFI}
                />
              </div>
              <div>
                <RFIProjectSummary rfis={rfis} projects={projects} />
              </div>
            </div>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="space-y-6">
            <RFIFiltersAdvanced
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              projects={projects}
            />
            
            <RFIListCompact 
              rfis={filteredRFIs} 
              projects={projects}
              onSelect={setSelectedRFI}
            />
          </TabsContent>

          {/* Projects View */}
          <TabsContent value="projects" className="space-y-6">
            <RFIFiltersAdvanced
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              projects={projects}
              showProjectFilter={false}
            />
            
            {projects.map(project => {
              const projectRFIs = filteredRFIs.filter(r => r.project_id === project.id);
              if (projectRFIs.length === 0) return null;

              return (
                <div key={project.id} className="space-y-3">
                  <h2 className="text-lg font-semibold">{project.name}</h2>
                  <RFIListCompact 
                    rfis={projectRFIs} 
                    projects={projects}
                    onSelect={setSelectedRFI}
                  />
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      {/* RFI Detail Panel */}
      <Dialog open={!!selectedRFI} onOpenChange={(open) => !open && setSelectedRFI(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedRFI && (
            <RFIDetailPanel
              rfi={selectedRFI}
              onClose={() => setSelectedRFI(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* RFI Creation Wizard */}
      {showWizard && (
        <RFIWizard
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}