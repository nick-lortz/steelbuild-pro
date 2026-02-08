import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import ContentSection from '@/components/layout/ContentSection';
import SectionCard from '@/components/layout/SectionCard';
import MetricsBar from '@/components/layout/MetricsBar';
import DataTable from '@/components/ui/DataTable';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { FileText, TrendingUp, Clock, DollarSign, Plus, Edit, Users, Upload, Download, Trash2, File } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Contracts() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [editingProject, setEditingProject] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [newProject, setNewProject] = useState({
    project_number: '',
    name: '',
    client: '',
    contract_value: 0,
    contract_received_date: '',
    contract_due_date: '',
    ball_in_court: 'internal',
    contract_status: 'received',
    status: 'bidding'
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: []
  });

  const { data: changeOrders } = useQuery({
    queryKey: ['change-orders', activeProjectId],
    queryFn: () => base44.entities.ChangeOrder.filter(
      activeProjectId ? { project_id: activeProjectId } : {}
    ),
    initialData: []
  });

  const filteredProjects = activeProjectId 
    ? projects.filter(p => p.id === activeProjectId)
    : projects;

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowEditDialog(false);
      setEditingProject(null);
      toast.success('Contract updated successfully');
    },
    onError: () => {
      toast.error('Failed to update contract');
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowAddDialog(false);
      setNewProject({
        project_number: '',
        name: '',
        client: '',
        contract_value: 0,
        contract_received_date: '',
        contract_due_date: '',
        ball_in_court: 'internal',
        contract_status: 'received',
        status: 'bidding'
      });
      toast.success('Contract added successfully');
    },
    onError: () => {
      toast.error('Failed to add contract');
    }
  });

  const handleEdit = (project) => {
    setEditingProject({...project});
    setShowEditDialog(true);
  };

  const handleSave = () => {
    if (editingProject) {
      updateMutation.mutate({ 
        id: editingProject.id, 
        data: editingProject 
      });
    }
  };

  const handleAdd = () => {
    if (!newProject.project_number || !newProject.name) {
      toast.error('Project number and name are required');
      return;
    }
    createMutation.mutate(newProject);
  };

  const handleFileUpload = async (e, project) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const user = await apiClient.auth.me();
      
      const newDoc = {
        file_url,
        file_name: file.name,
        uploaded_date: new Date().toISOString(),
        uploaded_by: user.email,
        document_type: 'contract'
      };

      const existingDocs = project.contract_documents || [];
      updateMutation.mutate({
        id: project.id,
        data: {
          ...project,
          contract_documents: [...existingDocs, newDoc]
        }
      });
      
      toast.success('Document uploaded');
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = (project, docIndex) => {
    const updatedDocs = (project.contract_documents || []).filter((_, i) => i !== docIndex);
    updateMutation.mutate({
      id: project.id,
      data: {
        ...project,
        contract_documents: updatedDocs
      }
    });
    toast.success('Document removed');
  };

  // Calculate KPIs
  const totalContractValue = filteredProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
  const totalApprovedCOs = changeOrders.filter(co => co.status === 'approved').length;
  const totalCOValue = changeOrders
    .filter(co => co.status === 'approved')
    .reduce((sum, co) => sum + (co.cost_impact || 0), 0);
  const revisedContractValue = totalContractValue + totalCOValue;
  const pendingCOs = changeOrders.filter(co => ['submitted', 'under_review'].includes(co.status)).length;
  
  const awaitingSignature = filteredProjects.filter(p => p.contract_status === 'awaiting_signature').length;
  const underReview = filteredProjects.filter(p => p.contract_status === 'under_review').length;
  const internalBall = filteredProjects.filter(p => p.ball_in_court === 'internal').length;

  const metrics = [
    { label: 'Contract Value', value: `$${(totalContractValue / 1000000).toFixed(2)}M`, color: 'text-white', icon: DollarSign },
    { label: 'Current Value', value: `$${(revisedContractValue / 1000000).toFixed(2)}M`, color: 'text-green-400', icon: TrendingUp },
    { label: 'Awaiting Action', value: awaitingSignature + underReview, color: 'text-amber-400', icon: Clock },
    { label: 'Our Responsibility', value: internalBall, color: 'text-blue-400', icon: Users }
  ];

  const contractColumns = [
    {
      accessor: 'project_number',
      header: 'Project #',
      render: (row) => (
        <div className="font-mono font-bold text-white">{row.project_number}</div>
      )
    },
    {
      accessor: 'name',
      header: 'Project Name',
      render: (row) => (
        <div className="font-medium text-white">{row.name}</div>
      )
    },
    {
      accessor: 'client',
      header: 'Client',
      render: (row) => (
        <div className="text-zinc-400">{row.client || '—'}</div>
      )
    },
    {
      accessor: 'contract_received_date',
      header: 'Received',
      render: (row) => (
        <div className="text-sm text-zinc-400">
          {row.contract_received_date ? format(new Date(row.contract_received_date), 'MMM d, yyyy') : '—'}
        </div>
      )
    },
    {
      accessor: 'contract_due_date',
      header: 'Due',
      render: (row) => {
        if (!row.contract_due_date) return <span className="text-zinc-600">—</span>;
        const dueDate = new Date(row.contract_due_date);
        const today = new Date();
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        const isOverdue = daysUntil < 0;
        const isUrgent = daysUntil >= 0 && daysUntil <= 7;
        
        return (
          <div className={`text-sm font-medium ${isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-zinc-400'}`}>
            {format(dueDate, 'MMM d, yyyy')}
            {isOverdue && <span className="text-xs ml-1">({Math.abs(daysUntil)}d late)</span>}
            {isUrgent && !isOverdue && <span className="text-xs ml-1">({daysUntil}d)</span>}
          </div>
        );
      }
    },
    {
      accessor: 'ball_in_court',
      header: 'Responsibility',
      render: (row) => {
        const ballColors = {
          internal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          client: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
          gc: 'bg-green-500/20 text-green-400 border-green-500/30',
          architect: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          engineer: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
          legal: 'bg-red-500/20 text-red-400 border-red-500/30',
          finance: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          estimating: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
          operations: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
        };
        return (
          <Badge className={`${ballColors[row.ball_in_court]} border font-medium`}>
            {row.ball_in_court?.toUpperCase() || 'INTERNAL'}
          </Badge>
        );
      }
    },
    {
      accessor: 'contract_status',
      header: 'Contract Status',
      render: (row) => {
        const statusColors = {
          received: 'bg-zinc-500/20 text-zinc-400',
          under_review: 'bg-blue-500/20 text-blue-400',
          awaiting_signature: 'bg-amber-500/20 text-amber-400',
          signed: 'bg-green-500/20 text-green-400',
          executed: 'bg-emerald-500/20 text-emerald-400',
          void: 'bg-red-500/20 text-red-400'
        };
        return (
          <Badge className={statusColors[row.contract_status || 'received']}>
            {(row.contract_status || 'received').replace('_', ' ').toUpperCase()}
          </Badge>
        );
      }
    },
    {
      accessor: 'contract_value',
      header: 'Contract Value',
      render: (row) => (
        <div className="text-right font-mono font-bold text-green-400">
          ${(row.contract_value || 0).toLocaleString()}
        </div>
      )
    },
    {
      accessor: 'revised_value',
      header: 'Current Value',
      render: (row) => {
        const projectCOs = changeOrders.filter(co => 
          co.project_id === row.id && co.status === 'approved'
        );
        const coValue = projectCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
        const revised = (row.contract_value || 0) + coValue;
        const diff = coValue;
        
        return (
          <div className="text-right">
            <div className="font-mono font-bold text-white">${revised.toLocaleString()}</div>
            {diff !== 0 && (
              <div className={`text-xs ${diff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {diff > 0 ? '+' : ''}{diff.toLocaleString()}
              </div>
            )}
          </div>
        );
      }
    },
    {
      accessor: 'actions',
      header: '',
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(row);
          }}
          className="text-zinc-400 hover:text-white"
        >
          <Edit size={14} />
        </Button>
      )
    }
  ];

  const { totalReports, activeReports, scheduledReports } = reportStats;

  return (
    <PageShell>
      <PageHeader
        title="Report Center"
        subtitle={`${totalReports} reports • ${activeReports} active`}
        actions={
          <Button 
            onClick={() => {
              resetForm();
              setEditingReport(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            <FileText size={16} className="mr-2" />
            Create
          </Button>
        }
      />

      <MetricsBar metrics={metrics} />

      <ContentSection>
      {/* Contract Table */}
      <SectionCard title="Contract Registry">
          <DataTable
            columns={contractColumns}
            data={filteredProjects}
            onRowClick={handleEdit}
            emptyMessage="No contracts found. Add a new contract to get started."
          />
      </SectionCard>

      {/* Add Contract Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add New Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-zinc-400">Project Number *</Label>
                <Input
                  value={newProject.project_number}
                  onChange={(e) => setNewProject({...newProject, project_number: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                  placeholder="e.g., 2025-001"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-zinc-400">Project Name *</Label>
                <Input
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                  placeholder="e.g., Downtown Office Tower"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-zinc-400">Client</Label>
                <Input
                  value={newProject.client}
                  onChange={(e) => setNewProject({...newProject, client: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                  placeholder="GC name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-zinc-400">Contract Value</Label>
                <Input
                  type="number"
                  value={newProject.contract_value}
                  onChange={(e) => setNewProject({...newProject, contract_value: parseFloat(e.target.value) || 0})}
                  className="bg-zinc-800 border-zinc-700"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-zinc-400">Status</Label>
                <Select 
                  value={newProject.status} 
                  onValueChange={(v) => setNewProject({...newProject, status: v})}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bidding">Bidding</SelectItem>
                    <SelectItem value="awarded">Awarded</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-zinc-400">Contract Received</Label>
                <Input
                  type="date"
                  value={newProject.contract_received_date}
                  onChange={(e) => setNewProject({...newProject, contract_received_date: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-zinc-400">Due Date</Label>
                <Input
                  type="date"
                  value={newProject.contract_due_date}
                  onChange={(e) => setNewProject({...newProject, contract_due_date: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-zinc-400">Ball in Court</Label>
                <Select 
                  value={newProject.ball_in_court} 
                  onValueChange={(v) => setNewProject({...newProject, ball_in_court: v})}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="gc">GC</SelectItem>
                    <SelectItem value="architect">Architect</SelectItem>
                    <SelectItem value="engineer">Engineer</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="estimating">Estimating</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-zinc-400">Contract Status</Label>
                <Select 
                  value={newProject.contract_status} 
                  onValueChange={(v) => setNewProject({...newProject, contract_status: v})}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="awaiting_signature">Awaiting Signature</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                    <SelectItem value="executed">Executed</SelectItem>
                    <SelectItem value="void">Void</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={createMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600 text-black font-bold"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Contract'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contract Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Contract</DialogTitle>
          </DialogHeader>
          {editingProject && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-zinc-400">Project Number</Label>
                  <Input
                    value={editingProject.project_number}
                    onChange={(e) => setEditingProject({...editingProject, project_number: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-zinc-400">Project Name</Label>
                  <Input
                    value={editingProject.name}
                    onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-zinc-400">Client</Label>
                  <Input
                    value={editingProject.client || ''}
                    onChange={(e) => setEditingProject({...editingProject, client: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-zinc-400">Location</Label>
                  <Input
                    value={editingProject.location || ''}
                    onChange={(e) => setEditingProject({...editingProject, location: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-zinc-400">Status</Label>
                  <Select 
                    value={editingProject.status} 
                    onValueChange={(v) => setEditingProject({...editingProject, status: v})}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bidding">Bidding</SelectItem>
                      <SelectItem value="awarded">Awarded</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-zinc-400">Contract Value</Label>
                  <Input
                    type="number"
                    value={editingProject.contract_value || 0}
                    onChange={(e) => setEditingProject({...editingProject, contract_value: parseFloat(e.target.value)})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-zinc-400">Project Manager</Label>
                  <Input
                    value={editingProject.project_manager || ''}
                    onChange={(e) => setEditingProject({...editingProject, project_manager: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-zinc-400">Contract Received</Label>
                  <Input
                    type="date"
                    value={editingProject.contract_received_date || ''}
                    onChange={(e) => setEditingProject({...editingProject, contract_received_date: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-zinc-400">Due Date</Label>
                  <Input
                    type="date"
                    value={editingProject.contract_due_date || ''}
                    onChange={(e) => setEditingProject({...editingProject, contract_due_date: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-zinc-400">Ball in Court</Label>
                  <Select 
                    value={editingProject.ball_in_court || 'internal'} 
                    onValueChange={(v) => setEditingProject({...editingProject, ball_in_court: v})}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="gc">GC</SelectItem>
                      <SelectItem value="architect">Architect</SelectItem>
                      <SelectItem value="engineer">Engineer</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="estimating">Estimating</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-zinc-400">Contract Status</Label>
                  <Select 
                    value={editingProject.contract_status || 'received'} 
                    onValueChange={(v) => setEditingProject({...editingProject, contract_status: v})}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="awaiting_signature">Awaiting Signature</SelectItem>
                      <SelectItem value="signed">Signed</SelectItem>
                      <SelectItem value="executed">Executed</SelectItem>
                      <SelectItem value="void">Void</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-zinc-400">Start Date</Label>
                  <Input
                    type="date"
                    value={editingProject.start_date || ''}
                    onChange={(e) => setEditingProject({...editingProject, start_date: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-zinc-400">Target Completion</Label>
                  <Input
                    type="date"
                    value={editingProject.target_completion || ''}
                    onChange={(e) => setEditingProject({...editingProject, target_completion: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-zinc-400">Scope of Work</Label>
                <Textarea
                  value={editingProject.scope_of_work || ''}
                  onChange={(e) => setEditingProject({...editingProject, scope_of_work: e.target.value})}
                  className="bg-zinc-800 border-zinc-700 h-24"
                  placeholder="Detailed scope description..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-zinc-400">Exclusions</Label>
                <Textarea
                  value={editingProject.exclusions || ''}
                  onChange={(e) => setEditingProject({...editingProject, exclusions: e.target.value})}
                  className="bg-zinc-800 border-zinc-700 h-20"
                  placeholder="Items excluded from scope..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-zinc-400">Notes</Label>
                <Textarea
                  value={editingProject.notes || ''}
                  onChange={(e) => setEditingProject({...editingProject, notes: e.target.value})}
                  className="bg-zinc-800 border-zinc-700 h-20"
                  placeholder="Internal notes..."
                />
              </div>

              {/* Contract Documents */}
              <div className="space-y-3 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase font-bold text-zinc-400">Contract Documents</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-zinc-700"
                    disabled={uploadingFile}
                    onClick={() => document.getElementById('contract-file-upload').click()}
                  >
                    <Upload size={14} className="mr-2" />
                    {uploadingFile ? 'Uploading...' : 'Upload'}
                  </Button>
                  <input
                    id="contract-file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, editingProject)}
                  />
                </div>
                
                {editingProject.contract_documents && editingProject.contract_documents.length > 0 ? (
                  <div className="space-y-2">
                    {editingProject.contract_documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                        <div className="flex items-center gap-3 flex-1">
                          <File size={16} className="text-blue-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{doc.file_name}</p>
                            <p className="text-xs text-zinc-500">
                              {doc.uploaded_date && format(new Date(doc.uploaded_date), 'MMM d, yyyy')} · {doc.uploaded_by}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-zinc-700 rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={14} className="text-zinc-400" />
                          </a>
                          <button
                            onClick={() => handleDeleteDocument(editingProject, index)}
                            className="p-2 hover:bg-zinc-700 rounded"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 text-center py-4">No documents uploaded</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  className="border-zinc-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-blue-500 hover:bg-blue-600 text-black font-bold"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </ContentSection>
    </PageShell>
  );
}