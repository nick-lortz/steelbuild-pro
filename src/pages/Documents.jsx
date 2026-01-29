import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Upload, Search, File, History, Eye, Download, Loader2, CheckCircle, XCircle, FileSpreadsheet, Trash2, List, Sparkles, FileText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import CSVUpload from '@/components/shared/CSVUpload';
import FacetedSearchPanel from '@/components/documents/FacetedSearchPanel';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import DocumentTreeView from '@/components/documents/DocumentTreeView';
import DocumentFolderTree from '@/components/documents/DocumentFolderTree';
import AISearchPanel from '@/components/documents/AISearchPanel';
import ApprovalWorkflowPanel from '@/components/documents/ApprovalWorkflowPanel';
import { format } from 'date-fns';
import { toast } from '@/components/ui/notifications';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const initialFormState = {
  project_id: '',
  folder_path: '/',
  work_package_id: '',
  daily_log_id: '',
  task_id: '',
  expense_id: '',
  sov_item_id: '',
  title: '',
  description: '',
  category: 'other',
  phase: '',
  status: 'draft',
  workflow_stage: 'uploaded',
  reviewer: '',
  review_due_date: '',
  revision: '',
  revision_notes: '',
  tags: [],
  is_current: true,
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
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [processingOCR, setProcessingOCR] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [wpFilter, setWpFilter] = useState('all');
  const [taskFilter, setTaskFilter] = useState('all');
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [bulkActing, setBulkActing] = useState(false);
  const [analyzingDoc, setAnalyzingDoc] = useState(null);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
    staleTime: 2 * 60 * 1000
  });

  const { data: workPackages = [] } = useQuery({
    queryKey: ['work-packages'],
    queryFn: () => base44.entities.WorkPackage.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-expense_date', 500),
    staleTime: 5 * 60 * 1000
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items'],
    queryFn: () => base44.entities.SOVItem.list(),
    staleTime: 10 * 60 * 1000
  });

  const { data: dailyLogs = [] } = useQuery({
    queryKey: ['daily-logs'],
    queryFn: () => base44.entities.DailyLog.list(),
    staleTime: 10 * 60 * 1000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
    staleTime: 5 * 60 * 1000
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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDeleteDoc(null);
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
          is_current: true,
        });
        
        // Mark old document as not current
        await updateMutation.mutateAsync({
          id: selectedDoc.id,
          data: { status: 'superseded', is_current: false }
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
      folder_path: doc.folder_path || '/',
      work_package_id: doc.work_package_id || '',
      daily_log_id: doc.daily_log_id || '',
      task_id: doc.task_id || '',
      expense_id: doc.expense_id || '',
      sov_item_id: doc.sov_item_id || '',
      title: doc.title || '',
      description: doc.description || '',
      category: doc.category || 'other',
      phase: doc.phase || '',
      status: doc.status || 'draft',
      workflow_stage: doc.workflow_stage || 'uploaded',
      reviewer: doc.reviewer || '',
      review_due_date: doc.review_due_date || '',
      revision: doc.revision || '',
      revision_notes: doc.revision_notes || '',
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

  const handleProcessOCR = async (docId) => {
    setProcessingOCR(docId);
    try {
      await base44.functions.invoke('processDocumentOCR', { documentId: docId });
      toast.success('Document processed with OCR');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (error) {
      console.error('OCR processing failed:', error);
      toast.error('OCR processing failed');
    } finally {
      setProcessingOCR(null);
    }
  };

  const handleAnalyzeDocument = async (doc) => {
    setAnalyzingDoc(doc.id);
    try {
      const { data } = await base44.functions.invoke('analyzeDocumentContent', {
        document_id: doc.id,
        file_url: doc.file_url,
        title: doc.title,
        current_category: doc.category
      });

      if (data.auto_applied) {
        toast.success('AI suggestions applied automatically');
        queryClient.invalidateQueries({ queryKey: ['documents'] });
      } else {
        toast.info(`Suggested: ${data.analysis.suggested_category}, Tags: ${data.analysis.suggested_tags.join(', ')}`);
      }
    } catch (error) {
      toast.error('AI analysis failed');
    } finally {
      setAnalyzingDoc(null);
    }
  };

  const handleBulkAction = async (action, rejectionReason) => {
    if (selectedDocs.length === 0) return;
    
    setBulkActing(true);
    try {
      const { data } = await base44.functions.invoke('bulkUpdateDocuments', {
        document_ids: selectedDocs,
        action,
        updates: action === 'reject' ? { rejection_reason: rejectionReason } : undefined
      });

      toast.success(`${data.processed} documents ${action}d`);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSelectedDocs([]);
    } catch (error) {
      toast.error(`Bulk ${action} failed`);
    } finally {
      setBulkActing(false);
    }
  };

  const toggleDocSelection = (docId) => {
    setSelectedDocs(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDocs.length === filteredDocuments.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(filteredDocuments.map(d => d.id));
    }
  };

  const getVersions = (doc) => {
    if (!doc) return [];
    const rootId = doc.parent_document_id || doc.id;
    return (documents || [])
      .filter(d => d.id === rootId || d.parent_document_id === rootId)
      .sort((a, b) => (b.version || 1) - (a.version || 1));
  };

  const filteredDocuments = useMemo(() => {
    let filtered = (documents || []).filter(d => {
      const matchesSearch = 
        d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
      const matchesProject = projectFilter === 'all' || d.project_id === projectFilter;
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchesPhase = phaseFilter === 'all' || d.phase === phaseFilter;
      const matchesTag = tagFilter === 'all' || d.tags?.includes(tagFilter);
      const matchesWP = wpFilter === 'all' || 
        (wpFilter === 'unlinked' ? !d.work_package_id : d.work_package_id === wpFilter);
      const matchesTask = taskFilter === 'all' || 
        (taskFilter === 'unlinked' ? !d.task_id : d.task_id === taskFilter);
      const matchesFolder = !selectedFolder || selectedFolder === 'root' || (d.folder_path || '/').startsWith(selectedFolder);
      return matchesSearch && matchesCategory && matchesProject && matchesStatus && matchesPhase && matchesTag && matchesWP && matchesTask && matchesFolder && d.is_current !== false;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch(sortBy) {
        case 'title': aVal = a.title?.toLowerCase(); bVal = b.title?.toLowerCase(); break;
        case 'category': aVal = a.category; bVal = b.category; break;
        case 'status': aVal = a.status; bVal = b.status; break;
        case 'created_date': aVal = new Date(a.created_date); bVal = new Date(b.created_date); break;
        default: aVal = a.created_date; bVal = b.created_date;
      }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    return filtered;
  }, [documents, searchTerm, categoryFilter, projectFilter, statusFilter, phaseFilter, tagFilter, wpFilter, taskFilter, selectedFolder, sortBy, sortOrder]);

  const columns = [
    {
      header: (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedDocs.length === filteredDocuments.length && filteredDocuments.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span>Document</span>
        </div>
      ),
      accessor: 'title',
      render: (row) => {
        const project = projects.find(p => p.id === row.project_id);
        const isSelected = selectedDocs.includes(row.id);
        return (
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleDocSelection(row.id)}
              onClick={(e) => e.stopPropagation()}
            />
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
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleAnalyzeDocument(row);
            }}
            disabled={analyzingDoc === row.id}
            className="text-blue-400 hover:text-blue-300"
          >
            {analyzingDoc === row.id ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
          </Button>
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
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteDoc(row);
            }}
            className="text-zinc-500 hover:text-red-500"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  const docStats = useMemo(() => {
    const current = (documents || []).filter(d => d.status !== 'superseded');
    const pendingReview = (documents || []).filter(d => d.workflow_stage === 'pending_review').length;
    const approved = (documents || []).filter(d => d.status === 'approved').length;
    return { total: current.length, pendingReview, approved };
  }, [documents]);

  return (
    <div className="min-h-screen bg-black">
      {/* Header Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Document Library</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">{docStats.total} TOTAL • {docStats.pendingReview} REVIEW</p>
            </div>
            <div className="flex gap-2">
              {selectedDocs.length > 0 && (
                <div className="flex gap-2 items-center mr-2 px-3 py-1.5 bg-zinc-800 rounded border border-zinc-700">
                  <span className="text-xs font-bold text-amber-500">{selectedDocs.length} SELECTED</span>
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction('approve')}
                    disabled={bulkActing}
                    className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs px-2"
                  >
                    <CheckCircle size={12} className="mr-1" />
                    APPROVE
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const reason = prompt('Rejection reason (optional):');
                      handleBulkAction('reject', reason);
                    }}
                    disabled={bulkActing}
                    className="bg-red-600 hover:bg-red-700 text-white h-7 text-xs px-2"
                  >
                    <XCircle size={12} className="mr-1" />
                    REJECT
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setSelectedDocs([])}
                    variant="ghost"
                    className="text-zinc-400 hover:text-white h-7 text-xs px-2"
                  >
                    CLEAR
                  </Button>
                </div>
              )}
              <Button 
                onClick={() => setShowCSVImport(true)}
                variant="outline"
                className="border-zinc-700 text-white hover:bg-zinc-800 text-xs uppercase tracking-wider"
              >
                <FileSpreadsheet size={14} className="mr-1" />
                IMPORT
              </Button>
              <Button 
                onClick={() => {
                  setFormData(initialFormState);
                  setShowForm(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider"
              >
                <Plus size={14} className="mr-1" />
                NEW
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="grid grid-cols-5 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <File size={10} />
                  Total Documents
                </div>
                <div className="text-2xl font-bold font-mono text-white">{docStats.total}</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <CheckCircle size={10} />
                  Approved
                </div>
                <div className="text-2xl font-bold font-mono text-green-500">{docStats.approved}</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Eye size={10} />
                  Pending Review
                </div>
                <div className={`text-2xl font-bold font-mono ${docStats.pendingReview > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                  {docStats.pendingReview}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <FileText size={10} />
                  By Category
                </div>
                <div className="text-sm font-mono text-zinc-400">
                  {Array.from(new Set((documents || []).map(d => d.category))).length} types
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <History size={10} />
                  Versions
                </div>
                <div className="text-2xl font-bold font-mono text-blue-500">
                  {(documents || []).filter(d => (d.version || 1) > 1).length}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <Tabs value={viewMode} onValueChange={setViewMode} className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="grid" className="text-xs">
                <FileText size={14} className="mr-2" />
                Grid View
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs">
                <List size={14} className="mr-2" />
                List View
              </TabsTrigger>
              <TabsTrigger value="tree" className="text-xs">
                <FileText size={14} className="mr-2" />
                Folder Tree
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="created_date">Recent</SelectItem>
                  <SelectItem value="title">Name</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="border-zinc-700 text-xs h-9 px-3"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <Input
                    placeholder="Search by title, description, tags, or filename..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-zinc-800 border-zinc-700 text-white h-10"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-xs">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.project_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="drawing">Drawings</SelectItem>
                      <SelectItem value="specification">Specs</SelectItem>
                      <SelectItem value="rfi">RFIs</SelectItem>
                      <SelectItem value="submittal">Submittals</SelectItem>
                      <SelectItem value="contract">Contracts</SelectItem>
                      <SelectItem value="photo">Photos</SelectItem>
                      <SelectItem value="report">Reports</SelectItem>
                      <SelectItem value="correspondence">Correspondence</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-xs">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="issued">Issued</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="for_review">For Review</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-xs">
                      <SelectValue placeholder="All Phases" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all">All Phases</SelectItem>
                      <SelectItem value="detailing">Detailing</SelectItem>
                      <SelectItem value="fabrication">Fabrication</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="erection">Erection</SelectItem>
                      <SelectItem value="closeout">Closeout</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={wpFilter} onValueChange={setWpFilter}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-xs">
                      <SelectValue placeholder="Work Package" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 max-h-60">
                      <SelectItem value="all">All WPs</SelectItem>
                      <SelectItem value="unlinked">Unlinked</SelectItem>
                      {workPackages
                        .filter(wp => projectFilter === 'all' || wp.project_id === projectFilter)
                        .map(wp => (
                          <SelectItem key={wp.id} value={wp.id}>
                            {wp.wpid}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setProjectFilter('all');
                      setCategoryFilter('all');
                      setStatusFilter('all');
                      setPhaseFilter('all');
                      setTagFilter('all');
                      setWpFilter('all');
                      setTaskFilter('all');
                      setSearchTerm('');
                    }}
                    className="border-zinc-700 text-xs"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

        <TabsContent value="grid" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDocuments.map(doc => {
              const project = projects.find(p => p.id === doc.project_id);
              const wp = workPackages.find(w => w.id === doc.work_package_id);
              const isSelected = selectedDocs.includes(doc.id);

              return (
                <Card 
                  key={doc.id} 
                  className={`bg-zinc-900 border-zinc-800 hover:border-amber-500/50 transition-all cursor-pointer group ${isSelected ? 'border-amber-500' : ''}`}
                  onClick={() => handleEdit(doc)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleDocSelection(doc.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        <div className="p-3 bg-zinc-800 rounded-lg">
                          <File size={24} className="text-amber-500" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-amber-400 transition-colors">
                            {doc.title}
                          </h3>
                          <StatusBadge status={doc.status} />
                        </div>

                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="bg-zinc-800 border-zinc-700 capitalize text-[10px]">
                              {doc.category}
                            </Badge>
                            {doc.phase && (
                              <Badge variant="outline" className="bg-zinc-800 border-zinc-700 capitalize text-[10px]">
                                {doc.phase}
                              </Badge>
                            )}
                            {doc.version > 1 && (
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
                                v{doc.version}
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-zinc-500 font-mono truncate">
                            {project?.project_number} {wp ? `• ${wp.wpid}` : ''}
                          </p>

                          {doc.description && (
                            <p className="text-xs text-zinc-600 line-clamp-2">{doc.description}</p>
                          )}
                        </div>

                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {doc.tags.slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded">
                                {tag}
                              </span>
                            ))}
                            {doc.tags.length > 3 && (
                              <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded">
                                +{doc.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                          <span className="text-[10px] text-zinc-600">
                            {format(new Date(doc.created_date), 'MMM d, yyyy')}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {doc.file_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(doc.file_url, '_blank');
                                }}
                                className="h-7 w-7 p-0 text-zinc-500 hover:text-white"
                              >
                                <Eye size={14} />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyzeDocument(doc);
                              }}
                              disabled={analyzingDoc === doc.id}
                              className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300"
                            >
                              {analyzingDoc === doc.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Sparkles size={14} />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredDocuments.length === 0 && (
            <Card className="bg-zinc-900 border-zinc-800 col-span-full">
              <CardContent className="p-12 text-center">
                <File size={48} className="mx-auto mb-4 text-zinc-700" />
                <p className="text-zinc-400 mb-4">No documents found</p>
                <Button
                  onClick={() => {
                    setFormData(initialFormState);
                    setShowForm(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  <Plus size={16} className="mr-2" />
                  Upload First Document
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-4 mt-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      <Checkbox
                        checked={selectedDocs.length === filteredDocuments.length && filteredDocuments.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-left p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Document</th>
                    <th className="text-left p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Category</th>
                    <th className="text-left p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Phase</th>
                    <th className="text-left p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                    <th className="text-left p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Version</th>
                    <th className="text-left p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Links</th>
                    <th className="text-left p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Date</th>
                    <th className="text-right p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map(doc => {
                    const project = projects.find(p => p.id === doc.project_id);
                    const wp = workPackages.find(w => w.id === doc.work_package_id);
                    const isSelected = selectedDocs.includes(doc.id);

                    return (
                      <tr 
                        key={doc.id} 
                        className="border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer group"
                        onClick={() => handleEdit(doc)}
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleDocSelection(doc.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-zinc-800 rounded">
                              <File size={16} className="text-amber-500" />
                            </div>
                            <div>
                              <p className="font-medium text-white text-sm">{doc.title}</p>
                              <p className="text-xs text-zinc-500 font-mono">{project?.project_number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="bg-zinc-800 border-zinc-700 capitalize text-xs">
                            {doc.category}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {doc.phase ? (
                            <Badge variant="outline" className="bg-zinc-800 border-zinc-700 capitalize text-xs">
                              {doc.phase}
                            </Badge>
                          ) : (
                            <span className="text-zinc-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-sm text-blue-400">v{doc.version || 1}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {wp && (
                              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px]">
                                WP
                              </Badge>
                            )}
                            {doc.task_id && (
                              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px]">
                                Task
                              </Badge>
                            )}
                            {doc.expense_id && (
                              <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px]">
                                $
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-zinc-500">
                          {format(new Date(doc.created_date), 'MMM d, yyyy')}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            {doc.file_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(doc.file_url, '_blank');
                                }}
                                className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                              >
                                <Eye size={14} />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteDoc(doc);
                              }}
                              className="h-7 w-7 p-0 text-zinc-500 hover:text-red-500"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tree" className="space-y-4 mt-6">
          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-1">
              <DocumentFolderTree
                documents={filteredDocuments}
                projects={projects}
                onDocClick={handleEdit}
                onFolderSelect={setSelectedFolder}
              />
            </div>
            <div className="col-span-3">
              {filteredDocuments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDocuments.map(doc => {
                    const project = projects.find(p => p.id === doc.project_id);
                    const isSelected = selectedDocs.includes(doc.id);

                    return (
                      <Card 
                        key={doc.id} 
                        className={`bg-zinc-900 border-zinc-800 hover:border-zinc-700 cursor-pointer ${isSelected ? 'border-amber-500' : ''}`}
                        onClick={() => handleEdit(doc)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleDocSelection(doc.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <h4 className="font-medium text-white text-sm mb-1">{doc.title}</h4>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-[10px] capitalize">{doc.category}</Badge>
                                <StatusBadge status={doc.status} />
                              </div>
                              <p className="text-xs text-zinc-500">{project?.project_number}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-12 text-center">
                    <p className="text-zinc-500">Select a folder to view documents</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        </Tabs>
      </div>

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
            workPackages={workPackages}
            dailyLogs={dailyLogs}
            tasks={tasks}
            expenses={expenses}
            sovItems={sovItems}
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
            {/* Approval Workflow */}
            {selectedDoc && (
              <ApprovalWorkflowPanel 
                document={selectedDoc}
                onWorkflowUpdate={() => {
                  queryClient.invalidateQueries({ queryKey: ['documents'] });
                  setSelectedDoc(null);
                }}
              />
            )}

            {/* OCR Processing */}
            {selectedDoc?.file_url && (
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">AI Document Processing</h4>
                <Button
                  size="sm"
                  onClick={() => handleProcessOCR(selectedDoc.id)}
                  disabled={processingOCR === selectedDoc.id}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {processingOCR === selectedDoc.id ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Extract Text & Metadata (OCR)'
                  )}
                </Button>
                <p className="text-xs text-zinc-500 mt-2">
                  Uses AI to extract searchable text and metadata
                </p>
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
              workPackages={workPackages}
              dailyLogs={dailyLogs}
              tasks={tasks}
              expenses={expenses}
              sovItems={sovItems}
              onSubmit={handleSubmit}
              onFileUpload={handleFileUpload}
              isLoading={updateMutation.isPending || uploading}
              uploading={uploading}
              isEdit
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* CSV Import */}
      <CSVUpload
        entityName="Document"
        templateFields={[
          { label: 'Project Number', key: 'project_number', example: 'P-001' },
          { label: 'Title', key: 'title', example: 'Structural Specs' },
          { label: 'Description', key: 'description', example: 'Main specifications' },
          { label: 'Category', key: 'category', example: 'specification' },
        ]}
        transformRow={(row) => {
          const project = projects.find(p => p.project_number === row.project_number);
          return {
            project_id: project?.id || '',
            title: row.title || '',
            description: row.description || '',
            category: row.category || 'other',
            status: 'draft',
            workflow_stage: 'uploaded',
          };
        }}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['documents'] });
        }}
        open={showCSVImport}
        onOpenChange={setShowCSVImport}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Document?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete "{deleteDoc?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteDoc.id)}
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

function DocumentForm({ formData, setFormData, projects, workPackages, dailyLogs, tasks, expenses, sovItems, onSubmit, onFileUpload, isLoading, uploading, isEdit }) {
  const [tagInput, setTagInput] = React.useState('');
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      handleChange('tags', [...formData.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    handleChange('tags', formData.tags.filter(t => t !== tag));
  };

  const projectWorkPackages = workPackages.filter(wp => wp.project_id === formData.project_id);
  const projectDailyLogs = dailyLogs.filter(d => d.project_id === formData.project_id);
  const projectTasks = tasks.filter(t => t.project_id === formData.project_id);
  const projectExpenses = expenses.filter(e => e.project_id === formData.project_id);
  const projectSOVItems = sovItems.filter(s => s.project_id === formData.project_id);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Project *</Label>
        <Select value={formData.project_id} onValueChange={(v) => {
          handleChange('project_id', v);
          handleChange('work_package_id', '');
          handleChange('expense_id', '');
          handleChange('sov_item_id', '');
        }}>
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

      {/* Folder Path */}
      <div className="space-y-2">
        <Label className="text-xs">Folder Path</Label>
        <Input
          value={formData.folder_path}
          onChange={(e) => handleChange('folder_path', e.target.value)}
          placeholder="/ or /Drawings/Structural/Level1"
          className="bg-zinc-800 border-zinc-700 text-xs"
        />
        <p className="text-[10px] text-zinc-500">Use forward slashes to create hierarchical structure</p>
      </div>

      {/* Associations */}
      {formData.project_id && (
        <div className="grid grid-cols-1 gap-4 p-4 bg-zinc-800/30 rounded-lg">
          <p className="text-sm font-medium text-zinc-400">Link to (optional)</p>
          
          <div className="space-y-2">
            <Label className="text-xs">Work Package</Label>
            <Select value={formData.work_package_id} onValueChange={(v) => handleChange('work_package_id', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-sm">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {projectWorkPackages.map(wp => (
                  <SelectItem key={wp.id} value={wp.id}>
                    {wp.package_number || wp.id.slice(0, 8)} - {wp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Daily Log</Label>
            <Select value={formData.daily_log_id} onValueChange={(v) => handleChange('daily_log_id', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-sm">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value={null}>None</SelectItem>
                {projectDailyLogs.slice(0, 50).map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {format(new Date(d.log_date), 'MMM d, yyyy')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Task</Label>
            <Select value={formData.task_id} onValueChange={(v) => handleChange('task_id', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-sm">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value={null}>None</SelectItem>
                {projectTasks.slice(0, 50).map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title || t.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Expense (Receipt/Invoice)</Label>
            <Select value={formData.expense_id} onValueChange={(v) => handleChange('expense_id', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-sm">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value={null}>None</SelectItem>
                {projectExpenses.slice(0, 50).map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.vendor} - ${e.amount?.toLocaleString()} ({e.expense_date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">SOV Line Item</Label>
            <Select value={formData.sov_item_id} onValueChange={(v) => handleChange('sov_item_id', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-sm">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value={null}>None</SelectItem>
                {projectSOVItems.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.sov_code} - {s.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

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
          <Label>Category *</Label>
          <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="drawing">Drawing</SelectItem>
              <SelectItem value="specification">Specification</SelectItem>
              <SelectItem value="rfi">RFI</SelectItem>
              <SelectItem value="submittal">Submittal</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="report">Report</SelectItem>
              <SelectItem value="photo">Photo</SelectItem>
              <SelectItem value="correspondence">Correspondence</SelectItem>
              <SelectItem value="receipt">Receipt</SelectItem>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Phase</Label>
          <Select value={formData.phase} onValueChange={(v) => handleChange('phase', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              <SelectItem value="detailing">Detailing</SelectItem>
              <SelectItem value="fabrication">Fabrication</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="erection">Erection</SelectItem>
              <SelectItem value="closeout">Closeout</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="for_review">For Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Revision</Label>
          <Input
            value={formData.revision}
            onChange={(e) => handleChange('revision', e.target.value)}
            placeholder="A, B, C or 1, 2, 3"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Reviewer</Label>
          <Input
            value={formData.reviewer}
            onChange={(e) => handleChange('reviewer', e.target.value)}
            placeholder="Email"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
        <div className="space-y-2">
          <Label>Review Due Date</Label>
          <Input
            type="date"
            value={formData.review_due_date}
            onChange={(e) => handleChange('review_due_date', e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tags (for search)</Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Add tag..."
            className="bg-zinc-800 border-zinc-700"
          />
          <Button type="button" onClick={addTag} size="sm" className="bg-zinc-700 hover:bg-zinc-600">
            Add
          </Button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.tags.map((tag, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="bg-amber-500/20 text-amber-400 border-amber-500/40 cursor-pointer hover:bg-amber-500/30"
                onClick={() => removeTag(tag)}
              >
                {tag} ×
              </Badge>
            ))}
          </div>
        )}
      </div>

      {isEdit && (
        <div className="space-y-2">
          <Label>Revision Notes</Label>
          <Textarea
            value={formData.revision_notes}
            onChange={(e) => handleChange('revision_notes', e.target.value)}
            rows={2}
            placeholder="What changed in this revision..."
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      )}

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