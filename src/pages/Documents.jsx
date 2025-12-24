import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Plus, Upload, Search, File, History, Eye, Download, Loader2, CheckCircle, XCircle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

const initialFormState = {
  project_id: '',
  title: '',
  description: '',
  category: 'other',
  status: 'draft',
  workflow_stage: 'uploaded',
  reviewer: '',
  tags: [],
};

export default function Documents() {
  const [showForm, setShowForm] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Document.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowForm(false);
      setFormData(initialFormState);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Document.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSelectedDoc(null);
      setFormData(initialFormState);
    },
  });

  const handleFileUpload = async (e, isNewVersion = false) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (isNewVersion && selectedDoc) {
        // Create new version
        const newVersion = (selectedDoc.version || 1) + 1;
        await createMutation.mutateAsync({
          ...formData,
          file_url,
          file_name: file.name,
          file_size: file.size,
          version: newVersion,
          parent_document_id: selectedDoc.parent_document_id || selectedDoc.id,
        });
        
        // Update old document status
        await updateMutation.mutateAsync({
          id: selectedDoc.id,
          data: { status: 'superseded' }
        });
      } else {
        setFormData(prev => ({
          ...prev,
          file_url,
          file_name: file.name,
          file_size: file.size,
        }));
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedDoc) {
      updateMutation.mutate({ id: selectedDoc.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (doc) => {
    setFormData({
      project_id: doc.project_id || '',
      title: doc.title || '',
      description: doc.description || '',
      category: doc.category || 'other',
      status: doc.status || 'draft',
      workflow_stage: doc.workflow_stage || 'uploaded',
      reviewer: doc.reviewer || '',
      tags: doc.tags || [],
      file_url: doc.file_url || '',
      file_name: doc.file_name || '',
      file_size: doc.file_size || 0,
    });
    setSelectedDoc(doc);
  };

  const handleWorkflowAction = async (action) => {
    if (!selectedDoc) return;
    
    const workflowMap = {
      submit: 'pending_review',
      approve: 'approved',
      reject: 'rejected',
    };

    await updateMutation.mutateAsync({
      id: selectedDoc.id,
      data: {
        workflow_stage: workflowMap[action],
        status: action === 'approve' ? 'approved' : selectedDoc.status,
        review_date: new Date().toISOString().split('T')[0],
      }
    });
  };

  const getVersions = (doc) => {
    if (!doc) return [];
    const rootId = doc.parent_document_id || doc.id;
    return documents
      .filter(d => d.id === rootId || d.parent_document_id === rootId)
      .sort((a, b) => (b.version || 1) - (a.version || 1));
  };

  const filteredDocuments = documents.filter(d => {
    const matchesSearch = 
      d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.file_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    const matchesProject = projectFilter === 'all' || d.project_id === projectFilter;
    return matchesSearch && matchesCategory && matchesProject;
  }).filter(d => d.status !== 'superseded'); // Hide superseded versions from main list

  const columns = [
    {
      header: 'Document',
      accessor: 'title',
      render: (row) => {
        const project = projects.find(p => p.id === row.project_id);
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-800 rounded">
              <File size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="font-medium">{row.title}</p>
              <p className="text-xs text-zinc-500">{project?.name}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => (
        <Badge variant="outline" className="bg-zinc-800 text-zinc-300 border-zinc-700 capitalize">
          {row.category}
        </Badge>
      ),
    },
    {
      header: 'Version',
      accessor: 'version',
      render: (row) => (
        <span className="font-mono text-sm">v{row.version || 1}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Workflow',
      accessor: 'workflow_stage',
      render: (row) => <StatusBadge status={row.workflow_stage} />,
    },
    {
      header: 'Uploaded',
      accessor: 'created_date',
      render: (row) => format(new Date(row.created_date), 'MMM d, yyyy'),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {row.file_url && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                window.open(row.file_url, '_blank');
              }}
              className="text-zinc-400 hover:text-white"
            >
              <Eye size={16} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Manage project documentation"
        actions={
          <Button 
            onClick={() => {
              setFormData(initialFormState);
              setShowForm(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            <Plus size={18} className="mr-2" />
            New Document
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-zinc-400 text-sm">Total Documents</p>
          <p className="text-2xl font-bold text-white">{documents.filter(d => d.status !== 'superseded').length}</p>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
          <p className="text-zinc-400 text-sm">Pending Review</p>
          <p className="text-2xl font-bold text-amber-400">
            {documents.filter(d => d.workflow_stage === 'pending_review').length}
          </p>
        </div>
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
          <p className="text-zinc-400 text-sm">Approved</p>
          <p className="text-2xl font-bold text-green-400">
            {documents.filter(d => d.status === 'approved').length}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-zinc-400 text-sm">Archived</p>
          <p className="text-2xl font-bold text-zinc-400">
            {documents.filter(d => d.status === 'archived').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search documents..."
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="specification">Specification</SelectItem>
            <SelectItem value="submittal">Submittal</SelectItem>
            <SelectItem value="correspondence">Correspondence</SelectItem>
            <SelectItem value="report">Report</SelectItem>
            <SelectItem value="photo">Photo</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredDocuments}
        onRowClick={handleEdit}
        emptyMessage="No documents found. Upload your first document to get started."
      />

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Document</DialogTitle>
          </DialogHeader>
          <DocumentForm
            formData={formData}
            setFormData={setFormData}
            projects={projects}
            onSubmit={handleSubmit}
            onFileUpload={handleFileUpload}
            isLoading={createMutation.isPending || uploading}
            uploading={uploading}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Sheet */}
      <Sheet open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <SheetContent className="w-full sm:max-w-2xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white">Document Details</SheetTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="border-zinc-700"
              >
                <History size={16} className="mr-2" />
                Versions ({getVersions(selectedDoc).length})
              </Button>
            </div>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Workflow Actions */}
            {selectedDoc && (
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Workflow Actions</h4>
                <div className="flex gap-2">
                  {selectedDoc.workflow_stage === 'uploaded' && (
                    <Button
                      size="sm"
                      onClick={() => handleWorkflowAction('submit')}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      Submit for Review
                    </Button>
                  )}
                  {selectedDoc.workflow_stage === 'pending_review' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleWorkflowAction('approve')}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle size={16} className="mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleWorkflowAction('reject')}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        <XCircle size={16} className="mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Version Upload */}
            {selectedDoc?.file_url && (
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Upload New Version</h4>
                <div>
                  <input
                    type="file"
                    id="version-upload"
                    onChange={(e) => handleFileUpload(e, true)}
                    className="hidden"
                  />
                  <label htmlFor="version-upload">
                    <Button
                      type="button"
                      size="sm"
                      disabled={uploading}
                      className="bg-amber-500 hover:bg-amber-600 text-black cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('version-upload').click();
                      }}
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={16} className="mr-2" />
                          Upload v{(selectedDoc.version || 1) + 1}
                        </>
                      )}
                    </Button>
                  </label>
                </div>
              </div>
            )}

            {/* Version History */}
            {showVersionHistory && (
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Version History</h4>
                <div className="space-y-2">
                  {getVersions(selectedDoc).map((version) => (
                    <div key={version.id} className="p-3 bg-zinc-900 rounded border border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-500">v{version.version || 1}</span>
                          <StatusBadge status={version.status} />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          {format(new Date(version.created_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      {version.file_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(version.file_url, '_blank')}
                          className="text-zinc-400 hover:text-white"
                        >
                          <Eye size={16} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Edit Form */}
            <DocumentForm
              formData={formData}
              setFormData={setFormData}
              projects={projects}
              onSubmit={handleSubmit}
              onFileUpload={handleFileUpload}
              isLoading={updateMutation.isPending || uploading}
              uploading={uploading}
              isEdit
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DocumentForm({ formData, setFormData, projects, onSubmit, onFileUpload, isLoading, uploading, isEdit }) {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Project *</Label>
        <Select value={formData.project_id} onValueChange={(v) => handleChange('project_id', v)}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Title *</Label>
        <Input
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Document title"
          required
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          placeholder="Document description..."
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="specification">Specification</SelectItem>
              <SelectItem value="submittal">Submittal</SelectItem>
              <SelectItem value="correspondence">Correspondence</SelectItem>
              <SelectItem value="report">Report</SelectItem>
              <SelectItem value="photo">Photo</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isEdit && (
        <div className="space-y-2">
          <Label>Upload File *</Label>
          <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-amber-500 transition-colors">
            <input
              type="file"
              id="file-upload"
              onChange={onFileUpload}
              className="hidden"
              required={!formData.file_url}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 size={32} className="mb-2 animate-spin text-amber-500" />
                  <p className="text-zinc-400">Uploading...</p>
                </div>
              ) : formData.file_url ? (
                <div className="flex flex-col items-center">
                  <File size={32} className="mb-2 text-green-500" />
                  <p className="text-green-400">{formData.file_name}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {(formData.file_size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload size={32} className="mb-2 text-zinc-500" />
                  <p className="text-zinc-400">Click to upload or drag and drop</p>
                  <p className="text-xs text-zinc-500 mt-1">PDF, DOC, XLS, or images</p>
                </div>
              )}
            </label>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}