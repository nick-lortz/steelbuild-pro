import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Upload, FolderOpen, Clock, Download, Share2, Trash2, FileText, Filter } from 'lucide-react';
import DocumentUploader from '@/components/documents/DocumentUploader.jsx';
import DocumentList from '@/components/documents/DocumentList.jsx';
import DocumentVersionHistory from '@/components/documents/DocumentVersionHistory.jsx';
import DocumentActions from '@/components/documents/DocumentActions.jsx';

const CATEGORIES = [
  { value: 'drawing', label: 'Drawings', color: 'bg-blue-100 text-blue-800' },
  { value: 'specification', label: 'Specifications', color: 'bg-purple-100 text-purple-800' },
  { value: 'rfi', label: 'RFIs', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'submittal', label: 'Submittals', color: 'bg-green-100 text-green-800' },
  { value: 'contract', label: 'Contracts', color: 'bg-red-100 text-red-800' },
  { value: 'report', label: 'Reports', color: 'bg-orange-100 text-orange-800' },
  { value: 'correspondence', label: 'Correspondence', color: 'bg-pink-100 text-pink-800' },
  { value: 'safety_form', label: 'Safety Forms', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'photo', label: 'Photos', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' },
];

export default function DocumentManagement() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  // Fetch documents for selected project
  const { data: documents = [], refetch: refetchDocuments } = useQuery({
    queryKey: ['documents', selectedProject],
    queryFn: () => selectedProject 
      ? base44.entities.Document.filter({ project_id: selectedProject })
      : Promise.resolve([]),
    enabled: !!selectedProject,
  });

  // Filter and search documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, selectedCategory]);

  // Group by category
  const documentsByCategory = useMemo(() => {
    const grouped = {};
    filteredDocuments.forEach(doc => {
      if (!grouped[doc.category]) grouped[doc.category] = [];
      grouped[doc.category].push(doc);
    });
    return grouped;
  }, [filteredDocuments]);

  // Stats
  const stats = {
    totalDocs: documents.length,
    versions: documents.reduce((sum, doc) => sum + (doc.version || 1), 0),
    drafts: documents.filter(d => d.status === 'draft').length,
    pending: documents.filter(d => d.workflow_stage === 'pending_review').length,
  };

  const handleDeleteDocument = async (docId) => {
    await base44.entities.Document.delete(docId);
    refetchDocuments();
  };

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Document Management</h1>
            <p className="text-gray-400">Organize, version, and share project documentation</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <Card key={project.id} className="cursor-pointer hover:shadow-lg transition-shadow" 
                    onClick={() => setSelectedProject(project.id)}>
                <CardHeader>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <p className="text-sm text-gray-600">{project.project_number}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">{project.location}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {projects.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
              <p className="text-gray-400">No projects available</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentProject = projects.find(p => p.id === selectedProject);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <Button variant="ghost" onClick={() => setSelectedProject(null)} className="text-gray-400 mb-4 p-0">
              ← Back to Projects
            </Button>
            <h1 className="text-3xl font-bold text-white mb-1">{currentProject?.name}</h1>
            <p className="text-gray-400">Documents & Versions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <p className="text-gray-400 text-sm">Total Documents</p>
              <p className="text-2xl font-bold text-white">{stats.totalDocs}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <p className="text-gray-400 text-sm">Versions</p>
              <p className="text-2xl font-bold text-white">{stats.versions}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <p className="text-gray-400 text-sm">In Review</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <p className="text-gray-400 text-sm">Draft</p>
              <p className="text-2xl font-bold text-blue-400">{stats.drafts}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-800 border-b border-gray-700 mb-6">
            <TabsTrigger value="browse">Browse Documents</TabsTrigger>
            <TabsTrigger value="upload">Upload New</TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-6">
            {/* Search & Filter */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <Input
                  placeholder="Search documents by title, file name, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory('all')}
                >
                  All Categories ({documents.length})
                </Badge>
                {CATEGORIES.map(cat => (
                  <Badge 
                    key={cat.value}
                    variant={selectedCategory === cat.value ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedCategory(cat.value)}
                  >
                    {cat.label} ({documents.filter(d => d.category === cat.value).length})
                  </Badge>
                ))}
              </div>
            </div>

            {/* Document List by Category */}
            <div className="space-y-6">
              {Object.entries(documentsByCategory).length === 0 ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-12 text-center">
                    <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
                    <p className="text-gray-400">No documents found</p>
                  </CardContent>
                </Card>
              ) : (
                Object.entries(documentsByCategory).map(([category, docs]) => (
                  <div key={category}>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      {CATEGORIES.find(c => c.value === category)?.label}
                      <Badge variant="secondary">{docs.length}</Badge>
                    </h2>
                    <DocumentList 
                      documents={docs}
                      onSelectDocument={setSelectedDocument}
                      onDelete={handleDeleteDocument}
                    />
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <DocumentUploader 
              projectId={selectedProject}
              onUploadSuccess={() => {
                refetchDocuments();
                setActiveTab('browse');
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Version History Modal */}
      {selectedDocument && (
        <DocumentVersionHistory 
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  );
}