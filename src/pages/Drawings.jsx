import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, AlertTriangle, Clock, CheckCircle, FileSpreadsheet, Upload, Zap } from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '@/components/ui/PageHeader';
import DrawingSetTable from '@/components/drawings/DrawingSetTable';
import DrawingSetForm from '@/components/drawings/DrawingSetForm';
import BulkEditDrawings from '@/components/drawings/BulkEditDrawings';
import DrawingSetDetails from '@/components/drawings/DrawingSetDetails.jsx';
import DrawingNotifications from '@/components/drawings/DrawingNotifications';
import CSVUpload from '@/components/shared/CSVUpload';
import QuickAddDrawingSet from '@/components/drawings/QuickAddDrawingSet';
import { differenceInDays } from 'date-fns';

export default function Drawings() {
  const [showForm, setShowForm] = useState(false);
  const [selectedSet, setSelectedSet] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawingSets'],
    queryFn: () => base44.entities.DrawingSet.list('-created_date'),
  });

  const { data: drawingSheets = [] } = useQuery({
    queryKey: ['drawingSheets'],
    queryFn: () => base44.entities.DrawingSheet.list(),
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ['drawingRevisions'],
    queryFn: () => base44.entities.DrawingRevision.list('-revision_date'),
  });

  const handleFormSubmit = () => {
    queryClient.invalidateQueries({ queryKey: ['drawingSets'] });
    setShowForm(false);
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DrawingSet.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawingSets'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DrawingSet.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawingSets'] });
      setSelectedSet(null);
    },
  });

  const filteredSets = useMemo(() => {
    return drawingSets.filter(d => {
      const matchesSearch = 
        d.set_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.set_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchesProject = projectFilter === 'all' || d.project_id === projectFilter;
      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [drawingSets, searchTerm, statusFilter, projectFilter]);

  // Calculate overdue sets
  const overdueSets = useMemo(() => {
    return filteredSets.filter(d => {
      if (!d.due_date || d.status === 'FFF' || d.status === 'As-Built') return false;
      return differenceInDays(new Date(), new Date(d.due_date)) > 0;
    });
  }, [filteredSets]);

  // Calculate pending releases
  const pendingRelease = useMemo(() => {
    return filteredSets.filter(d => d.status === 'BFS' && !d.released_for_fab_date);
  }, [filteredSets]);

  // Export drawing registry
  const exportDrawingRegistry = () => {
    const headers = [
      'Set Number',
      'Set Name',
      'Project',
      'Discipline',
      'Current Revision',
      'Status',
      'Sheet Count',
      'IFA Date',
      'BFA Date',
      'Released Date',
      'Due Date',
      'Reviewer',
      'AI Review Status'
    ];

    const rows = drawingSets.map(set => {
      const project = projects.find(p => p.id === set.project_id);
      return [
        set.set_number || '',
        set.set_name || '',
        project?.project_number || '',
        set.discipline || '',
        set.current_revision || '',
        set.status || '',
        set.sheet_count || 0,
        set.ifa_date || '',
        set.bfa_date || '',
        set.released_for_fab_date || '',
        set.due_date || '',
        set.reviewer || '',
        set.ai_review_status || ''
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `drawing_registry_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <PageHeader
        title="Drawing Sets"
        subtitle="Manage drawing submissions and revisions"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCSVImport(true)}
              className="border-zinc-700"
            >
              <Upload size={18} className="mr-2" />
              Import CSV
            </Button>
            <Button
              variant="outline"
              onClick={exportDrawingRegistry}
              className="border-zinc-700"
            >
              <FileSpreadsheet size={18} className="mr-2" />
              Export
            </Button>
            <Button 
              onClick={() => setShowBulkEdit(true)}
              variant="outline"
              className="border-zinc-700"
              disabled={filteredSets.length === 0}
            >
              Bulk Edit
            </Button>
            <Button 
              onClick={() => setShowQuickAdd(true)}
              variant="outline"
              className="border-zinc-700"
            >
              <Zap size={18} className="mr-2" />
              Quick Add
            </Button>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={18} className="mr-2" />
              Full Form
            </Button>
          </div>
        }
      />

      {/* Alert Summary */}
      {(overdueSets.length > 0 || pendingRelease.length > 0) && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {overdueSets.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">{overdueSets.length} Overdue Set{overdueSets.length !== 1 ? 's' : ''}</p>
                <p className="text-xs text-zinc-400">Requires immediate attention</p>
              </div>
            </div>
          )}
          {pendingRelease.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-3">
              <Clock size={18} className="text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-400">{pendingRelease.length} Ready for Release</p>
                <p className="text-xs text-zinc-400">Back from scrub, pending fabrication release</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drawing Notifications */}
      <div className="mb-6">
        <DrawingNotifications drawingSets={drawingSets} projects={projects} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <p className="text-xs text-zinc-500">Total Sets</p>
          <p className="text-2xl font-bold text-white">{filteredSets.length}</p>
        </div>
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-zinc-500">In Review</p>
          <p className="text-2xl font-bold text-blue-400">
            {filteredSets.filter(d => d.status === 'IFA' || d.status === 'BFA').length}
          </p>
        </div>
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-xs text-zinc-500">Released</p>
          <p className="text-2xl font-bold text-green-400">
            {filteredSets.filter(d => d.status === 'FFF' || d.status === 'As-Built').length}
          </p>
        </div>
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-zinc-500">Pending Action</p>
          <p className="text-2xl font-bold text-amber-400">
            {overdueSets.length + pendingRelease.length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search drawing sets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800 text-white"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="IFA">IFA</SelectItem>
            <SelectItem value="BFA">BFA</SelectItem>
            <SelectItem value="BFS">BFS</SelectItem>
            <SelectItem value="FFF">Released</SelectItem>
            <SelectItem value="As-Built">As-Built</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DrawingSetTable
        sets={filteredSets}
        sheets={drawingSheets}
        revisions={revisions}
        projects={projects}
        onSelectSet={setSelectedSet}
      />

      {/* Create Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>New Drawing Set</DialogTitle>
          </DialogHeader>
          <DrawingSetForm
            projects={projects}
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Details Sheet */}
      {selectedSet && (
        <DrawingSetDetails
          drawingSet={selectedSet}
          sheets={drawingSheets.filter(s => s.drawing_set_id === selectedSet.id)}
          revisions={revisions.filter(r => r.drawing_set_id === selectedSet.id)}
          projects={projects}
          onClose={() => setSelectedSet(null)}
          onUpdate={(data) => updateMutation.mutate({ id: selectedSet.id, data })}
          onDelete={() => deleteMutation.mutate(selectedSet.id)}
          isUpdating={updateMutation.isPending}
        />
      )}

      {/* Bulk Edit Dialog */}
      <BulkEditDrawings
        drawingSets={filteredSets}
        projects={projects}
        open={showBulkEdit}
        onOpenChange={setShowBulkEdit}
      />

      {/* Quick Add Dialog */}
      <QuickAddDrawingSet
        projects={projects}
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['drawingSets'] });
          setShowQuickAdd(false);
        }}
      />

      {/* CSV Import */}
      <CSVUpload
        entityName="DrawingSet"
        templateFields={[
          { label: 'Project Number', key: 'project_number', example: 'P-001' },
          { label: 'Set Number', key: 'set_number', example: 'S-101' },
          { label: 'Set Name', key: 'set_name', example: 'Structural Steel - Level 1' },
          { label: 'Discipline', key: 'discipline', example: 'structural' },
          { label: 'Current Revision', key: 'current_revision', example: 'Rev 0' },
          { label: 'Status', key: 'status', example: 'IFA' },
          { label: 'IFA Date', key: 'ifa_date', example: '2025-01-15' },
          { label: 'Due Date', key: 'due_date', example: '2025-01-25' },
          { label: 'Sheet Count', key: 'sheet_count', example: '5' },
          { label: 'Reviewer', key: 'reviewer', example: 'John Smith' },
        ]}
        transformRow={(row) => {
          const project = projects.find(p => p.project_number === row.project_number);
          return {
            project_id: project?.id || '',
            set_number: row.set_number || '',
            set_name: row.set_name || '',
            discipline: row.discipline || 'structural',
            current_revision: row.current_revision || 'Rev 0',
            status: row.status || 'IFA',
            ifa_date: row.ifa_date || '',
            due_date: row.due_date || '',
            sheet_count: parseInt(row.sheet_count) || 0,
            reviewer: row.reviewer || '',
            ai_review_status: 'pending',
          };
        }}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['drawingSets'] });
        }}
        open={showCSVImport}
        onOpenChange={setShowCSVImport}
      />
    </div>
  );
}