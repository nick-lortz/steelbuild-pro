import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Filter, Search, Image as ImageIcon, Trash2, Download, Edit } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
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
import DocumentUploadZone from '@/components/documents/DocumentUploadZone';
import FolderBreadcrumb from '@/components/documents/FolderBreadcrumb';
import PhotoGallery from '@/components/photos/PhotoGallery';
import DrawingMarkup from '@/components/drawings/DrawingMarkup';

export default function ProjectPhotos() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [deletePhoto, setDeletePhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('/');
  const [showAnnotateDialog, setShowAnnotateDialog] = useState(false);
  const [annotatingPhoto, setAnnotatingPhoto] = useState(null);

  const { data: photos = [] } = useQuery({
    queryKey: ['projectPhotos', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      return await apiClient.entities.Document.filter({
        project_id: activeProjectId,
        category: 'photo'
      }, '-created_date');
    },
    enabled: !!activeProjectId
  });

  const deleteMutation = useMutation({
    mutationFn: (docId) => apiClient.entities.Document.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectPhotos'] });
      toast.success('Photo deleted');
    }
  });

  const saveAnnotationsMutation = useMutation({
    mutationFn: ({ id, annotations }) => 
      apiClient.entities.Document.update(id, { 
        notes: JSON.stringify(annotations)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectPhotos'] });
      setShowAnnotateDialog(false);
      setAnnotatingPhoto(null);
      toast.success('Annotations saved');
    },
    onError: () => toast.error('Save failed')
  });

  const handlePhotoUpload = async (files) => {
    if (!activeProjectId) return;
    setUploading(true);
    
    try {
      for (const file of files) {
        const { file_url } = await apiClient.integrations.Core.UploadFile({ file });
        
        await apiClient.entities.Document.create({
          project_id: activeProjectId,
          title: file.name.replace(/\.[^/.]+$/, ''),
          file_url,
          file_name: file.name,
          file_size: file.size,
          category: 'photo',
          folder_path: currentFolder,
          phase: phaseFilter !== 'all' ? phaseFilter : undefined,
          description: `Field photo - ${new Date().toLocaleDateString()}`,
          status: 'issued'
        });
      }
      queryClient.invalidateQueries({ queryKey: ['projectPhotos'] });
      toast.success(`${files.length} photo(s) uploaded`);
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const filteredPhotos = useMemo(() => {
    return photos.filter(photo => {
      const matchesSearch = !searchTerm || 
        photo.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPhase = phaseFilter === 'all' || photo.phase === phaseFilter;
      const matchesFolder = currentFolder === '/' || (photo.folder_path || '/').startsWith(currentFolder);
      return matchesSearch && matchesPhase && matchesFolder;
    });
  }, [photos, searchTerm, phaseFilter, currentFolder]);

  const photosByDate = useMemo(() => {
    const grouped = {};
    filteredPhotos.forEach(photo => {
      const date = photo.created_date?.split('T')[0] || 'Unknown Date';
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(photo);
    });
    return Object.entries(grouped).sort(([dateA], [dateB]) => dateB.localeCompare(dateA));
  }, [filteredPhotos]);

  if (!activeProjectId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <ImageIcon size={48} className="mx-auto mb-4 text-zinc-600" />
          <p className="text-sm text-zinc-400">Select a project to manage photos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-600/10 via-zinc-900/50 to-amber-600/5">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <h1 className="text-xl font-bold text-white uppercase tracking-wide mb-2">Project Photos</h1>
          <p className="text-xs text-zinc-400 font-mono">{photos.length} PHOTOS</p>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 border-b border-zinc-800">
        <DocumentUploadZone onUpload={handlePhotoUpload} isLoading={uploading} multiple />
      </div>

      {/* Filters & Folder Nav */}
      <div className="max-w-[1600px] mx-auto px-6 py-4 border-b border-zinc-800">
        <div className="space-y-3">
          <FolderBreadcrumb currentPath={currentFolder} onNavigate={setCurrentFolder} />
          
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <Input
                placeholder="SEARCH PHOTOS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 placeholder:uppercase placeholder:text-xs h-9"
              />
            </div>
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-40 bg-zinc-950 border-zinc-800 text-white h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all">All Phases</SelectItem>
                <SelectItem value="detailing">Detailing</SelectItem>
                <SelectItem value="fabrication">Fabrication</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="erection">Erection</SelectItem>
                <SelectItem value="closeout">Closeout</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Photos Grid */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon size={48} className="mx-auto mb-4 text-zinc-700" />
            <p className="text-sm text-zinc-400 uppercase tracking-widest">No photos found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {photosByDate.map(([date, dayPhotos]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4 pb-2 border-b border-zinc-800">
                  <Calendar size={16} className="text-amber-500" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { 
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                  </h2>
                  <span className="text-xs text-zinc-500">({dayPhotos.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {dayPhotos.map(photo => (
                    <div key={photo.id} className="group relative aspect-square bg-zinc-900 rounded border border-zinc-800 overflow-hidden hover:border-amber-500/50 transition-colors">
                      <img
                        src={photo.file_url}
                        alt={photo.title}
                        className="w-full h-full object-cover"
                      />
                      {photo.notes && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-purple-500 p-1 rounded">
                            <Edit size={12} className="text-white" />
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        {photo.phase && (
                          <span className="text-[10px] font-bold text-amber-400 uppercase">
                            {photo.phase}
                          </span>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setAnnotatingPhoto(photo);
                              setShowAnnotateDialog(true);
                            }}
                            className="p-2 bg-purple-800 hover:bg-purple-700 rounded transition-colors"
                            title="Annotate"
                          >
                            <Edit size={14} className="text-white" />
                          </button>
                          <a
                            href={photo.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                            title="Download"
                          >
                            <Download size={14} className="text-white" />
                          </a>
                          <button
                            onClick={() => setDeletePhoto(photo)}
                            className="p-2 bg-red-900/50 hover:bg-red-800 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-white truncate">{photo.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Annotate Photo Dialog */}
      <Dialog open={showAnnotateDialog} onOpenChange={setShowAnnotateDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Annotate Photo</DialogTitle>
          </DialogHeader>
          {annotatingPhoto && (
            <DrawingMarkup
              imageUrl={annotatingPhoto.file_url}
              existingAnnotations={annotatingPhoto.notes ? JSON.parse(annotatingPhoto.notes).annotations || [] : []}
              onSave={(data) => saveAnnotationsMutation.mutate({
                id: annotatingPhoto.id,
                annotations: data
              })}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePhoto} onOpenChange={() => setDeletePhoto(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate(deletePhoto.id);
                setDeletePhoto(null);
              }}
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