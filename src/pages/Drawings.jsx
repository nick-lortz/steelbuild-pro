import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import MetricsBar from '@/components/layout/MetricsBar';
import FilterBar from '@/components/layout/FilterBar';
import ContentSection from '@/components/layout/ContentSection';
import EmptyState from '@/components/layout/EmptyState';
import LoadingState from '@/components/layout/LoadingState';
import DrawingSetTable from '@/components/drawings/DrawingSetTable';
import DrawingSetForm from '@/components/drawings/DrawingSetForm';
import DrawingSetDetailDialog from '@/components/drawings/DrawingSetDetailDialog';
import DrawingUploadEnhanced from '@/components/drawings/DrawingUploadEnhanced';
import { FileText, Plus, Upload, Search } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function Drawings() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedSet, setSelectedSet] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 5 * 60 * 1000
  });

  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.role === 'admin'
      ? allProjects
      : allProjects.filter(p => p.assigned_users?.includes(currentUser?.email));
  }, [currentUser, allProjects]);

  const { data: drawingSets = [], isLoading } = useQuery({
    queryKey: ['drawing-sets', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.DrawingSet.filter({ project_id: activeProjectId }, '-updated_date')
      : [],
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: sheets = [] } = useQuery({
    queryKey: ['drawing-sheets', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const setIds = drawingSets.map(s => s.id);
      if (setIds.length === 0) return [];
      const allSheets = await base44.entities.DrawingSheet.list();
      return allSheets.filter(sheet => setIds.includes(sheet.drawing_set_id));
    },
    enabled: !!activeProjectId && drawingSets.length > 0,
    staleTime: 2 * 60 * 1000
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ['drawing-revisions', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const setIds = drawingSets.map(s => s.id);
      if (setIds.length === 0) return [];
      const allRevisions = await base44.entities.DrawingRevision.list();
      return allRevisions.filter(rev => setIds.includes(rev.drawing_set_id));
    },
    enabled: !!activeProjectId && drawingSets.length > 0,
    staleTime: 2 * 60 * 1000
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.RFI.filter({ project_id: activeProjectId })
      : [],
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 10 * 60 * 1000
  });

  const createDrawingSetMutation = useMutation({
    mutationFn: async (data) => {
      const createdSet = await base44.entities.DrawingSet.create(data);
      await base44.entities.DrawingRevision.create({
        drawing_set_id: createdSet.id,
        revision_number: data.current_revision || 'Rev 0',
        revision_date: new Date().toISOString().split('T')[0],
        description: 'Initial submission',
        status: data.status || 'IFA',
      });
      return createdSet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing-sets'] });
      setShowCreateDialog(false);
      toast.success('Drawing set created');
    },
    onError: () => toast.error('Creation failed')
  });

  const deleteDrawingSetMutation = useMutation({
    mutationFn: (id) => base44.entities.DrawingSet.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing-sets'] });
      toast.success('Drawing set deleted');
    },
    onError: () => toast.error('Delete failed')
  });

  // Filter and search logic
  const filteredSets = useMemo(() => {
    let filtered = drawingSets;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(set =>
        set.set_name?.toLowerCase().includes(query) ||
        set.set_number?.toLowerCase().includes(query) ||
        set.current_revision?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(set => set.status === statusFilter);
    }

    if (disciplineFilter !== 'all') {
      filtered = filtered.filter(set => set.discipline === disciplineFilter);
    }

    return filtered;
  }, [drawingSets, searchQuery, statusFilter, disciplineFilter]);

  // Dashboard metrics
  const metrics = useMemo(() => {
    const total = drawingSets.length;
    const released = drawingSets.filter(s => s.status === 'FFF' || s.status === 'As-Built').length;
    const needsReview = drawingSets.filter(s => s.status === 'IFA').length;
    const needsRevision = drawingSets.filter(s => s.status === 'Revise & Resubmit' || s.status === 'BFA').length;
    const aiReviewed = drawingSets.filter(s => s.ai_review_status === 'completed').length;

    return { total, released, needsReview, needsRevision, aiReviewed };
  }, [drawingSets]);

  const selectedProject = allProjects.find(p => p.id === activeProjectId);

  const handleSelectSet = (set) => {
    setSelectedSet(set);
    setShowDetailDialog(true);
  };

  return (
    <PageShell>
      <PageHeader
        title="Drawings"
        subtitle={selectedProject ? `${selectedProject.project_number} • ${metrics.total} sets` : 'Select project'}
        actions={
          <>
            <Select value={activeProjectId || ''} onValueChange={(val) => {
              const { setActiveProjectId } = require('@/components/shared/hooks/useActiveProject').useActiveProject();
              setActiveProjectId(val || null);
            }}>
              <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {userProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_number} • {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowUploadDialog(true)}
              disabled={!activeProjectId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload size={16} className="mr-2" />
              Upload Drawings
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              disabled={!activeProjectId}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
            >
              <Plus size={16} className="mr-2" />
              New Set
            </Button>
          </>
        }
      />

      {!activeProjectId ? (
        <ContentSection>
          <EmptyState
            icon={FileText}
            title="No Project Selected"
            description="Select a project to view and manage drawings"
          />
        </ContentSection>
      ) : (
        <>
          <MetricsBar
            metrics={[
              { label: 'Total Sets', value: metrics.total },
              { label: 'Released', value: metrics.released, color: 'text-green-400' },
              { label: 'Needs Review', value: metrics.needsReview, color: 'text-blue-400' },
              { label: 'Needs Revision', value: metrics.needsRevision, color: 'text-amber-400' },
              { label: 'AI Reviewed', value: metrics.aiReviewed, color: 'text-purple-400' }
            ]}
          />

          <FilterBar>
            <div className="flex-1 relative max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search by set name, number, or revision..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-800 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="IFA">IFA</SelectItem>
                <SelectItem value="BFA">BFA</SelectItem>
                <SelectItem value="BFS">BFS</SelectItem>
                <SelectItem value="Revise & Resubmit">Revise & Resubmit</SelectItem>
                <SelectItem value="FFF">FFF</SelectItem>
                <SelectItem value="As-Built">As-Built</SelectItem>
              </SelectContent>
            </Select>
            <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
              <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="Filter by Discipline" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Disciplines</SelectItem>
                <SelectItem value="structural">Structural</SelectItem>
                <SelectItem value="misc_metals">Misc Metals</SelectItem>
                <SelectItem value="stairs">Stairs</SelectItem>
                <SelectItem value="handrails">Handrails</SelectItem>
                <SelectItem value="connections">Connections</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>

          <ContentSection>
            {isLoading ? (
              <LoadingState message="Loading drawings..." />
            ) : filteredSets.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={drawingSets.length === 0 ? 'No Drawing Sets Yet' : 'No Results Found'}
                description={drawingSets.length === 0 ? 'Create your first drawing set or upload drawings to get started' : 'Try adjusting your search or filters'}
                actionLabel={drawingSets.length === 0 ? 'Create Drawing Set' : null}
                onAction={drawingSets.length === 0 ? () => setShowCreateDialog(true) : null}
              />
            ) : (
              <DrawingSetTable
                sets={filteredSets}
                sheets={sheets}
                revisions={revisions}
                projects={userProjects}
                onSelectSet={handleSelectSet}
              />
            )}
          </ContentSection>
        </>
      )}

      {/* Create Drawing Set Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>New Drawing Set</DialogTitle>
          </DialogHeader>
          <DrawingSetForm
            projectId={activeProjectId}
            onSubmit={(data) => createDrawingSetMutation.mutate(data)}
            onCancel={() => setShowCreateDialog(false)}
            isLoading={createDrawingSetMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Upload Drawings Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Upload Drawings</DialogTitle>
          </DialogHeader>
          <DrawingUploadEnhanced
            projectId={activeProjectId}
            onUploadComplete={() => {
              queryClient.invalidateQueries({ queryKey: ['drawing-sets'] });
              queryClient.invalidateQueries({ queryKey: ['drawing-sheets'] });
              setShowUploadDialog(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Drawing Set Detail Dialog */}
      <DrawingSetDetailDialog
        drawingSetId={selectedSet?.id}
        open={showDetailDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDetailDialog(false);
            setSelectedSet(null);
          }
        }}
        users={users}
        rfis={rfis}
      />
    </PageShell>
  );
}