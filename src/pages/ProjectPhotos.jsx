import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Upload, Trash2, Download, Filter, Search, Image as ImageIcon, Zap } from 'lucide-react';
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

export default function ProjectPhotos() {
  const { activeProjectId } = useActiveProject();
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [deletePhoto, setDeletePhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['projectPhotos', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const docs = await base44.entities.Document.filter({
        project_id: activeProjectId,
        category: 'photo'
      }, '-created_date');
      return docs;
    },
    enabled: !!activeProjectId
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId) => {
      return await base44.entities.Document.delete(docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectPhotos'] });
      toast.success('Photo deleted');
    },
    onError: () => toast.error('Failed to delete photo')
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !activeProjectId) return;

    setUploading(true);
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        await base44.entities.Document.create({
          project_id: activeProjectId,
          title: file.name,
          file_url,
          file_name: file.name,
          category: 'photo',
          phase: phaseFilter !== 'all' ? phaseFilter : undefined,
          description: `Field photo - ${new Date().toLocaleDateString()}`
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
      return matchesSearch && matchesPhase;
    });
  }, [photos, searchTerm, phaseFilter]);

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
          <p className="text-sm text-zinc-400">Select a project to view photos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-600/10 via-zinc-900/50 to-amber-600/5">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Project Photos</h1>
              <p className="text-xs text-zinc-400 font-mono mt-1">
                FIELD DOCUMENTATION • {photos.length} PHOTOS
              </p>
            </div>
            <label className="cursor-pointer">
              <Button disabled={uploading} className="bg-amber-500 hover:bg-amber-600 text-black gap-2">
                <Upload size={16} />
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex gap-4 items-center">
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
              <SelectValue placeholder="Phase" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all" className="text-white">All Phases</SelectItem>
              <SelectItem value="detailing" className="text-white">Detailing</SelectItem>
              <SelectItem value="fabrication" className="text-white">Fabrication</SelectItem>
              <SelectItem value="delivery" className="text-white">Delivery</SelectItem>
              <SelectItem value="erection" className="text-white">Erection</SelectItem>
              <SelectItem value="closeout" className="text-white">Closeout</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Photos */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent animate-spin" />
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-16">
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
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h2>
                  <span className="text-xs text-zinc-500">({dayPhotos.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {dayPhotos.map(photo => (
                    <div key={photo.id} className="group relative aspect-square bg-zinc-900 rounded border border-zinc-800 overflow-hidden hover:border-amber-500/50 transition-colors">
                      <img
                        src={photo.file_url}
                        alt={photo.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        {photo.phase && (
                          <span className="text-[10px] font-bold text-amber-400 uppercase">
                            {photo.phase}
                          </span>
                        )}
                        <div className="flex gap-2">
                          <a
                            href={photo.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                            title="View full size"
                          >
                            <Download size={14} className="text-white" />
                          </a>
                          <button
                            onClick={() => setDeletePhoto(photo)}
                            className="p-2 bg-red-900/50 hover:bg-red-800 rounded transition-colors"
                            title="Delete photo"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-white truncate">{photo.title}</p>
                        {photo.description && (
                          <p className="text-[10px] text-zinc-400 truncate">{photo.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
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