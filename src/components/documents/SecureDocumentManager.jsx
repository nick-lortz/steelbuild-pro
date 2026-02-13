import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { File, Upload, Eye, Download, Lock, Unlock, History, Trash2, Search, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/notifications';
import DocumentUploadZone from './DocumentUploadZone';
import DocumentVersionHistory from './DocumentVersionHistory';

export default function SecureDocumentManager({ projectId }) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => base44.entities.Document.filter({ 
      project_id: projectId,
      is_current: true 
    }),
    enabled: !!projectId
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      toast.success('Document deleted');
    }
  });

  const updateAccessMutation = useMutation({
    mutationFn: ({ id, isRestricted }) => 
      base44.entities.Document.update(id, { 
        access_restricted: isRestricted,
        allowed_roles: isRestricted ? ['admin'] : ['admin', 'user']
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      toast.success('Access updated');
    }
  });

  // Role-based access control
  const canAccess = (doc) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (doc.access_restricted && !doc.allowed_roles?.includes(currentUser.role)) return false;
    return true;
  };

  const canEdit = (doc) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (doc.created_by === currentUser.email) return true;
    return false;
  };

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (!canAccess(doc)) return false;
      const matchesSearch = 
        doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [documents, searchTerm, categoryFilter, currentUser]);

  const categories = useMemo(() => 
    [...new Set(documents.map(d => d.category))].filter(Boolean),
    [documents]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Project Documents</h3>
          <p className="text-xs text-zinc-500">{filteredDocs.length} documents</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowUpload(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          <Plus size={14} className="mr-2" />
          Upload
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 h-9 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-sm text-white"
        >
          <option value="all">All Types</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {filteredDocs.map(doc => (
          <Card 
            key={doc.id} 
            className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
            onClick={() => setSelectedDoc(doc)}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-zinc-800 rounded">
                  <File size={16} className="text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-sm text-white truncate">{doc.title}</p>
                    <div className="flex items-center gap-1">
                      {doc.access_restricted && (
                        <Lock size={12} className="text-red-400" />
                      )}
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {doc.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                    <span>v{doc.version || 1}</span>
                    <span>•</span>
                    <span>{format(new Date(doc.created_date), 'MMM d, yyyy')}</span>
                    <span>•</span>
                    <span>{doc.created_by?.split('@')[0]}</span>
                  </div>
                </div>
                <div className="flex gap-1">
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
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredDocs.length === 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8 text-center">
              <File size={32} className="mx-auto mb-2 text-zinc-700" />
              <p className="text-zinc-500 text-sm">No documents found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Dialog */}
      <DocumentUploadZone
        projectId={projectId}
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploadComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
          setShowUpload(false);
        }}
      />

      {/* Document Detail Sheet */}
      <Sheet open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <SheetContent className="w-full sm:max-w-2xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedDoc?.title}</SheetTitle>
          </SheetHeader>
          
          {selectedDoc && (
            <div className="mt-6 space-y-6">
              {/* Document Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="capitalize">
                    {selectedDoc.category}
                  </Badge>
                  <span className="text-sm text-zinc-500">v{selectedDoc.version || 1}</span>
                </div>
                
                {selectedDoc.description && (
                  <p className="text-sm text-zinc-400">{selectedDoc.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-zinc-500 mb-1">Uploaded</p>
                    <p className="text-white">{format(new Date(selectedDoc.created_date), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 mb-1">By</p>
                    <p className="text-white">{selectedDoc.created_by}</p>
                  </div>
                </div>
              </div>

              {/* Access Control (Admin Only) */}
              {currentUser?.role === 'admin' && (
                <Card className="bg-zinc-950 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white mb-1">Access Control</p>
                        <p className="text-xs text-zinc-500">
                          {selectedDoc.access_restricted ? 'Admin only' : 'All users'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAccessMutation.mutate({
                          id: selectedDoc.id,
                          isRestricted: !selectedDoc.access_restricted
                        })}
                        className="border-zinc-700"
                      >
                        {selectedDoc.access_restricted ? (
                          <>
                            <Unlock size={14} className="mr-2" />
                            Unlock
                          </>
                        ) : (
                          <>
                            <Lock size={14} className="mr-2" />
                            Restrict
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Version History */}
              <DocumentVersionHistory documentId={selectedDoc.id} />

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-zinc-800">
                {selectedDoc.file_url && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedDoc.file_url, '_blank')}
                      className="flex-1 border-zinc-700"
                    >
                      <Eye size={14} className="mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = selectedDoc.file_url;
                        a.download = selectedDoc.file_name || 'document';
                        a.click();
                      }}
                      className="flex-1 border-zinc-700"
                    >
                      <Download size={14} className="mr-2" />
                      Download
                    </Button>
                  </>
                )}
                {canEdit(selectedDoc) && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Delete this document?')) {
                        deleteMutation.mutate(selectedDoc.id);
                        setSelectedDoc(null);
                      }
                    }}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}