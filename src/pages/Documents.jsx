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
import { Plus, Upload, Search, File, History, Eye, Download, Loader2, CheckCircle, XCircle, FileSpreadsheet, Trash2, List, Sparkles } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CSVUpload from '@/components/shared/CSVUpload';
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
  const [viewMode, setViewMode] = useState('tree');
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
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">PENDING REVIEW</div>
              <div className={`text-2xl font-bold font-mono ${docStats.pendingReview > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                {docStats.pendingReview}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">APPROVED</div>
              <div className="text-2xl font-bold font-mono text-green-500">{docStats.approved}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">CURRENT</div>
              <div className="text-2xl font-bold font-mono text-white">{docStats.total}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* AI Semantic Search */}
        <Card className="mb-6 bg-gradient-to-br from-amber-950/20 to-orange-950/20 border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="text-amber-500" size={18} />
              AI Semantic Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AISearchPanel 
              projectId={projectFilter !== 'all' ? projectFilter : null} 
              onDocumentClick={handleEdit}
            />
          </CardContent>
        </Card>

        {/* View Mode Toggle */}
        <div className="flex gap-1 border border-zinc-800 p-1 mb-4 w-fit">
          {['tree', 'list'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                viewMode === mode ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {mode === 'tree' ? 'TREE' : 'LIST'}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <Input
              placeholder="SEARCH DOCUMENTS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 placeholder:uppercase placeholder:text-xs h-9 w-full"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white text-xs h-9">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white text-xs h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="drawing">Drawing</SelectItem>
                <SelectItem value="specification">Spec</SelectItem>
                <SelectItem value="rfi">RFI</SelectItem>
                <SelectItem value="submittal">Submittal</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white text-xs h-9">
                <SelectValue placeholder="Status" />
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
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white text-xs h-9">
                <SelectValue placeholder="Phase" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Phases</SelectItem>
                <SelectItem value="detailing">Detailing</SelectItem>
                <SelectItem value="fabrication">Fab</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="erection">Erection</SelectItem>
                <SelectItem value="closeout">Closeout</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white text-xs h-9">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 max-h-60">
                <SelectItem value="all">All Tags</SelectItem>
                {Array.from(new Set((documents || []).flatMap(d => d.tags || []))).sort().map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={wpFilter} onValueChange={setWpFilter}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white text-xs h-9">
                <SelectValue placeholder="Work Package" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 max-h-60">
                <SelectItem value="all">All WPs</SelectItem>
                <SelectItem value="unlinked">Not Linked</SelectItem>
                {workPackages
                  .filter(wp => projectFilter === 'all' || wp.project_id === projectFilter)
                  .map(wp => (
                    <SelectItem key={wp.id} value={wp.id}>
                      {wp.wpid || wp.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={taskFilter} onValueChange={setTaskFilter}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white text-xs h-9">
                <SelectValue placeholder="Task" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 max-h-60">
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="unlinked">Not Linked</SelectItem>
                {tasks
                  .filter(t => projectFilter === 'all' || t.project_id === projectFilter)
                  .slice(0, 50)
                  .map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content - Faceted Filters + Folder Tree + Documents */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <FacetedSearchPanel
              documents={documents}
              projects={projects}
              workPackages={workPackages}
              tasks={tasks}
              activeFilters={{
                project: projectFilter,
                category: categoryFilter,
                status: statusFilter,
                phase: phaseFilter,
                tag: tagFilter,
                wp: wpFilter
              }}
              onFilterChange={(type, value) => {
                if (type === 'project') setProjectFilter(value);
                if (type === 'category') setCategoryFilter(value);
                if (type === 'status') setStatusFilter(value);
                if (type === 'phase') setPhaseFilter(value);
                if (type === 'tag') setTagFilter(value);
                if (type === 'wp') setWpFilter(value);
              }}
              onClearAll={() => {
                setProjectFilter('all');
                setCategoryFilter('all');
                setStatusFilter('all');
                setPhaseFilter('all');
                setTagFilter('all');
                setWpFilter('all');
                setTaskFilter('all');
              }}
            />
            
            <DocumentFolderTree
              documents={documents.filter(d => projectFilter === 'all' || d.project_id === projectFilter)}
              projects={projects}
              onDocClick={handleEdit}
              onFolderSelect={setSelectedFolder}
            />
          </div>

          <div className="lg:col-span-4">
            <DataTable
              columns={columns}
              data={filteredDocuments}
              onRowClick={handleEdit}
              emptyMessage="No documents found. Upload your first document or adjust filters."
            />
          </div>
        </div>
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