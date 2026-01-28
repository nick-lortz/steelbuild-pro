import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  Plus, Search, MessageSquareWarning, Mail, Copy, FileSpreadsheet, 
  Trash2, BarChart3, Clock, AlertTriangle 
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import RFIWizard from '@/components/rfis/RFIWizard';
import RFIDetailPanel from '@/components/rfis/RFIDetailPanel';
import RFIInbox from '@/components/rfis/RFIInbox';
import RFITemplateSelector, { RFI_TEMPLATES } from '@/components/rfis/RFITemplateSelector';
import RFIKPIDashboard from '@/components/rfis/RFIKPIDashboard';
import RFIAgingDashboard from '@/components/rfis/RFIAgingDashboard';
import BulkRFICreator from '@/components/rfis/BulkRFICreator';
import CSVUpload from '@/components/shared/CSVUpload';

export default function RFIs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editingRFI, setEditingRFI] = useState(null);
  const [selectedRFI, setSelectedRFI] = useState(null);
  const [deleteRFI, setDeleteRFI] = useState(null);
  const [showBulkCreator, setShowBulkCreator] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [activeView, setActiveView] = useState('inbox');

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 30 * 60 * 1000
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list('-created_date'),
    staleTime: 2 * 60 * 1000
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings'],
    queryFn: () => base44.entities.DrawingSet.list(),
    staleTime: 10 * 60 * 1000
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list(),
    staleTime: 10 * 60 * 1000
  });

  const { data: submittal = [] } = useQuery({
    queryKey: ['submittals'],
    queryFn: () => base44.entities.Submittal.list(),
    staleTime: 10 * 60 * 1000
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => base44.entities.Delivery.list(),
    staleTime: 10 * 60 * 1000
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      // Auto-generate RFI number if not provided
      if (!data.rfi_number) {
        const projectRFIs = rfis.filter(r => r.project_id === data.project_id);
        const maxNumber = projectRFIs.reduce((max, r) => Math.max(max, r.rfi_number || 0), 0);
        data.rfi_number = maxNumber + 1;
      }

      const activityLog = {
        action: `RFI created by ${user?.full_name || user?.email}`,
        user: user?.email || 'system',
        timestamp: new Date().toISOString()
      };

      return base44.entities.RFI.create({
        ...data,
        activity_log: [activityLog]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      setShowWizard(false);
      setShowTemplateSelector(false);
      setSelectedTemplate(null);
      setEditingRFI(null);
      toast.success('RFI created successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data, logAction }) => {
      const activityLog = [
        ...(editingRFI?.activity_log || []),
        {
          action: logAction || `RFI updated by ${user?.full_name || user?.email}`,
          user: user?.email || 'system',
          timestamp: new Date().toISOString(),
          changes: data
        }
      ];
      return base44.entities.RFI.update(id, { ...data, activity_log });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      setShowWizard(false);
      setEditingRFI(null);
      setSelectedRFI(null);
      toast.success('RFI updated successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RFI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      setDeleteRFI(null);
      toast.success('RFI deleted');
    }
  });

  const filteredRFIs = useMemo(() => {
    return rfis.filter(r => {
      const matchesSearch = 
        r.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(r.rfi_number).includes(searchTerm) ||
        r.question?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesProject = projectFilter === 'all' || r.project_id === projectFilter;
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

      return matchesSearch && matchesProject && matchesStatus;
    }).sort((a, b) => {
      // Sort by project, then RFI number
      const projA = projects.find(p => p.id === a.project_id);
      const projB = projects.find(p => p.id === b.project_id);
      const projCompare = (projA?.name || '').localeCompare(projB?.name || '');
      if (projCompare !== 0) return projCompare;
      return (b.rfi_number || 0) - (a.rfi_number || 0);
    });
  }, [rfis, searchTerm, projectFilter, statusFilter, projects]);

  const kpis = useMemo(() => {
    const overdue = filteredRFIs.filter(r => 
      r.due_date && 
      !['answered', 'closed'].includes(r.status) &&
      differenceInDays(new Date(), parseISO(r.due_date)) > 0
    ).length;

    const awaitingAction = filteredRFIs.filter(r => 
      r.ball_in_court === 'internal' && !['answered', 'closed'].includes(r.status)
    ).length;

    const withImpact = filteredRFIs.filter(r => 
      r.cost_impact === 'yes' || r.schedule_impact === 'yes'
    ).length;

    return {
      total: filteredRFIs.length,
      overdue,
      awaitingAction,
      withImpact
    };
  }, [filteredRFIs]);

  const handleStatusChange = (id, newStatus) => {
    const rfi = rfis.find(r => r.id === id);
    const updates = { status: newStatus };
    
    if (newStatus === 'submitted' && !rfi.submitted_date) {
      updates.submitted_date = new Date().toISOString().split('T')[0];
    }
    if (newStatus === 'answered' && !rfi.response_date) {
      updates.response_date = new Date().toISOString().split('T')[0];
      if (rfi.submitted_date) {
        updates.response_days_actual = differenceInDays(new Date(), parseISO(rfi.submitted_date));
      }
    }
    if (newStatus === 'closed') {
      updates.closed_date = new Date().toISOString().split('T')[0];
    }

    updateMutation.mutate({
      id,
      data: updates,
      logAction: `Status changed to ${newStatus}`
    });
  };

  const handleUpdateCloseout = (rfiId, checklistKey, checked) => {
    const rfi = rfis.find(r => r.id === rfiId);
    const updatedChecklist = {
      ...rfi.closeout_checklist,
      [checklistKey]: checked,
      [`${checklistKey}_date`]: checked ? new Date().toISOString() : null
    };

    updateMutation.mutate({
      id: rfiId,
      data: { closeout_checklist: updatedChecklist },
      logAction: `Closeout: ${checklistKey.replace('_', ' ')} ${checked ? 'completed' : 'unchecked'}`
    });
  };

  const handleGenerateEmail = (rfi) => {
    const project = projects.find(p => p.id === rfi.project_id);
    const emailBody = `
Subject: RFI-${String(rfi.rfi_number).padStart(3, '0')} - ${rfi.subject}

Project: ${project?.name}
Location: ${rfi.location_area || 'N/A'}
Priority: ${rfi.priority?.toUpperCase()}
Due Date: ${rfi.due_date ? format(parseISO(rfi.due_date), 'MMMM d, yyyy') : 'TBD'}

QUESTION:
${rfi.question}

${rfi.spec_section ? `Spec Section: ${rfi.spec_section}` : ''}
${rfi.linked_drawing_set_ids?.length > 0 ? `Drawing References: ${rfi.linked_drawing_set_ids.length} attached` : ''}

Please respond by ${rfi.due_date ? format(parseISO(rfi.due_date), 'MMMM d, yyyy') : 'ASAP'}.

---
${user?.full_name || 'Project Team'}
    `.trim();

    navigator.clipboard.writeText(emailBody);
    toast.success('Email draft copied to clipboard');
  };

  const columns = [
    {
      header: 'RFI #',
      accessor: 'rfi_number',
      render: (row) => (
        <span className="font-mono text-amber-400 font-bold text-sm">
          RFI-{String(row.rfi_number).padStart(3, '0')}
        </span>
      )
    },
    {
      header: 'Subject',
      accessor: 'subject',
      render: (row) => {
        const project = projects.find(p => p.id === row.project_id);
        return (
          <div>
            <p className="font-semibold text-sm line-clamp-1">{row.subject}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-zinc-500">{project?.name}</p>
              {row.category && <Badge className="bg-zinc-700 text-xs">{row.category}</Badge>}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Ball in Court',
      accessor: 'ball_in_court',
      render: (row) => {
        const colors = {
          internal: 'bg-blue-500',
          external: 'bg-amber-500',
          gc: 'bg-purple-500',
          architect: 'bg-green-500',
          engineer: 'bg-cyan-500',
          vendor: 'bg-pink-500'
        };
        return (
          <Badge className={colors[row.ball_in_court] || 'bg-zinc-700'}>
            {row.ball_in_court?.toUpperCase()}
          </Badge>
        );
      }
    },
    {
      header: 'Priority',
      accessor: 'priority',
      render: (row) => <StatusBadge status={row.priority} />
    },
    {
      header: 'Due',
      accessor: 'due_date',
      render: (row) => {
        if (!row.due_date) return '-';
        const daysUntil = differenceInDays(parseISO(row.due_date), new Date());
        const isOverdue = daysUntil < 0 && !['answered', 'closed'].includes(row.status);
        return (
          <div>
            <p className={isOverdue ? 'text-red-400 font-bold' : ''}>{format(parseISO(row.due_date), 'MMM d')}</p>
            {isOverdue && (
              <p className="text-xs text-red-500">{Math.abs(daysUntil)}d overdue</p>
            )}
          </div>
        );
      }
    },
    {
      header: 'Impact',
      accessor: 'impact',
      render: (row) => (
        <div className="flex gap-1">
          {row.cost_impact === 'yes' && <Badge className="bg-green-600 text-xs">$</Badge>}
          {row.schedule_impact === 'yes' && <Badge className="bg-orange-600 text-xs">📅</Badge>}
        </div>
      )
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteRFI(row);
          }}
          className="text-zinc-400 hover:text-red-400"
        >
          <Trash2 size={16} />
        </Button>
      )
    }
  ];

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
    setShowWizard(true);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">RFI Management</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">
                {kpis.total} TOTAL • {kpis.awaitingAction} AWAITING ACTION • {kpis.overdue} OVERDUE
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowCSVImport(true)}
                variant="outline"
                className="border-zinc-700 text-white hover:bg-zinc-800 text-xs uppercase tracking-wider"
              >
                <FileSpreadsheet size={14} className="mr-1" />
                IMPORT
              </Button>
              <Button
                onClick={() => setShowBulkCreator(true)}
                variant="outline"
                className="border-zinc-700 text-white hover:bg-zinc-800 text-xs uppercase tracking-wider"
                disabled={projectFilter === 'all'}
              >
                <Copy size={14} className="mr-1" />
                BULK
              </Button>
              <Button
                onClick={() => setShowTemplateSelector(true)}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider"
              >
                <Plus size={14} className="mr-1" />
                NEW RFI
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Bar */}
      {kpis.overdue > 0 && (
        <div className="border-b border-red-800 bg-red-950/20">
          <div className="max-w-[1800px] mx-auto px-6 py-3">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">
                {kpis.overdue} OVERDUE RFIs NEED IMMEDIATE ATTENTION
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <Tabs value={activeView} onValueChange={setActiveView} className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="inbox">
              <MessageSquareWarning size={14} className="mr-2" />
              Inbox
            </TabsTrigger>
            <TabsTrigger value="list">All RFIs</TabsTrigger>
            <TabsTrigger value="dashboard">
              <BarChart3 size={14} className="mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="aging">Aging Report</TabsTrigger>
          </TabsList>

          {/* Inbox View */}
          <TabsContent value="inbox">
            <RFIInbox
              rfis={filteredRFIs}
              onSelectRFI={(rfi) => setSelectedRFI(rfi)}
              onQuickAction={(rfi, action) => handleStatusChange(rfi.id, action)}
            />
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <Input
                  placeholder="SEARCH RFIs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 placeholder:uppercase placeholder:text-xs"
                />
              </div>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="reopened">Reopened</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DataTable
              columns={columns}
              data={filteredRFIs}
              onRowClick={(rfi) => setSelectedRFI(rfi)}
              emptyMessage="No RFIs found. Create your first RFI to get started."
            />
          </TabsContent>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <RFIKPIDashboard rfis={filteredRFIs} />
          </TabsContent>

          {/* Aging */}
          <TabsContent value="aging">
            <RFIAgingDashboard rfis={filteredRFIs} projects={projects} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Template Selector */}
      <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
        <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Create RFI</DialogTitle>
          </DialogHeader>
          <RFITemplateSelector
            onSelectTemplate={handleTemplateSelect}
            onCancel={() => setShowTemplateSelector(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Wizard */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>{editingRFI ? 'Edit RFI' : 'Create New RFI'}</DialogTitle>
          </DialogHeader>
          <RFIWizard
            rfi={editingRFI}
            projects={projects}
            drawings={drawings}
            changeOrders={changeOrders}
            submittals={submittal}
            deliveries={deliveries}
            templateData={selectedTemplate}
            onSubmit={(data) => {
              if (editingRFI) {
                updateMutation.mutate({ id: editingRFI.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowWizard(false);
              setEditingRFI(null);
              setSelectedTemplate(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Panel */}
      <Sheet open={!!selectedRFI} onOpenChange={(open) => !open && setSelectedRFI(null)}>
        <SheetContent className="w-full sm:max-w-2xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">RFI Details</SheetTitle>
          </SheetHeader>
          {selectedRFI && (
            <div className="mt-6">
              <RFIDetailPanel
                rfi={selectedRFI}
                project={projects.find(p => p.id === selectedRFI.project_id)}
                onEdit={(r) => {
                  setEditingRFI(r);
                  setSelectedRFI(null);
                  setShowWizard(true);
                }}
                onDelete={(r) => {
                  setSelectedRFI(null);
                  setDeleteRFI(r);
                }}
                onStatusChange={handleStatusChange}
                onUpdateCloseout={(key, checked) => handleUpdateCloseout(selectedRFI.id, key, checked)}
                onGenerateEmail={() => handleGenerateEmail(selectedRFI)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Bulk Creator */}
      <BulkRFICreator
        open={showBulkCreator}
        onOpenChange={setShowBulkCreator}
        projectId={projectFilter !== 'all' ? projectFilter : ''}
      />

      {/* CSV Import */}
      <CSVUpload
        entityName="RFI"
        templateFields={[
          { label: 'Project Number', key: 'project_number', example: 'P-001' },
          { label: 'Subject', key: 'subject', example: 'Column connection detail' },
          { label: 'Question', key: 'question', example: 'Please clarify...' },
          { label: 'Category', key: 'category', example: 'structural' },
          { label: 'Priority', key: 'priority', example: 'high' },
          { label: 'Due Date', key: 'due_date', example: '2025-01-15' }
        ]}
        transformRow={(() => {
          const projectCounters = {};
          return (row) => {
            const project = projects.find(p => p.project_number === row.project_number);
            if (!project?.id) throw new Error(`Project not found: ${row.project_number}`);
            
            if (!projectCounters[project.id]) {
              const projectRFIs = rfis.filter(r => r.project_id === project.id);
              projectCounters[project.id] = Math.max(...projectRFIs.map(r => r.rfi_number || 0), 0);
            }
            projectCounters[project.id]++;

            return {
              project_id: project.id,
              rfi_number: projectCounters[project.id],
              subject: row.subject,
              question: row.question || '',
              category: row.category || 'structural',
              priority: row.priority || 'medium',
              status: 'draft',
              due_date: row.due_date || '',
              ball_in_court: 'internal'
            };
          };
        })()}
        onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['rfis'] })}
        open={showCSVImport}
        onOpenChange={setShowCSVImport}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRFI} onOpenChange={() => setDeleteRFI(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete RFI?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Delete RFI-{String(deleteRFI?.rfi_number).padStart(3, '0')} "{deleteRFI?.subject}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteRFI.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}