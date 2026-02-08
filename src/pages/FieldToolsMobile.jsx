import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Camera, AlertCircle, Wrench, Plus, Image as ImageIcon, Wifi, WifiOff, Check, Clock, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { OfflineStorage, getAllDB, deleteDB } from '@/components/shared/offlineStorage';
import { useNetworkStatus } from '@/components/shared/useNetworkStatus';

export default function FieldToolsMobile() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  
  const [activeTab, setActiveTab] = useState('photos');
  const [showForm, setShowForm] = useState(null);
  const [syncProgress, setSyncProgress] = useState(null);

  const { data: dailyPhotos = [] } = useQuery({
    queryKey: ['daily-photos', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      return await apiClient.entities.Document.filter({
        project_id: activeProjectId,
        category: 'photo'
      }, '-created_date');
    },
    enabled: !!activeProjectId && isOnline
  });

  const { data: punchItems = [] } = useQuery({
    queryKey: ['punch-items', activeProjectId],
    queryFn: () => activeProjectId ? apiClient.entities.PunchItem.filter({ project_id: activeProjectId }) : [],
    enabled: !!activeProjectId && isOnline
  });

  const { data: installs = [] } = useQuery({
    queryKey: ['field-installs', activeProjectId],
    queryFn: () => activeProjectId ? apiClient.entities.FieldInstall.filter({ project_id: activeProjectId }) : [],
    enabled: !!activeProjectId && isOnline
  });

  const createPunchMutation = useMutation({
    mutationFn: (data) => apiClient.entities.PunchItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] });
      toast.success('Punch logged');
      setShowForm(null);
    }
  });

  const createInstallMutation = useMutation({
    mutationFn: (data) => apiClient.entities.FieldInstall.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-installs'] });
      toast.success('Install logged');
      setShowForm(null);
    }
  });

  const handlePhotoCapture = async (files) => {
    if (!activeProjectId) return;

    if (isOnline) {
      // Upload immediately
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
            folder_path: '/',
            description: `Field photo - ${new Date().toLocaleTimeString()}`,
            status: 'issued'
          });
        }
        queryClient.invalidateQueries({ queryKey: ['daily-photos'] });
        toast.success(`${files.length} photo(s) uploaded`);
      } catch (error) {
        toast.error('Upload failed');
      }
    } else {
      // Save for sync when online
      try {
        for (const file of files) {
          await OfflineStorage.savePendingPhoto(file, {
            projectId: activeProjectId,
            timestamp: new Date().toLocaleTimeString()
          });
        }
        toast.success(`${files.length} photo(s) saved - will sync when online`);
      } catch (error) {
        toast.error('Failed to save offline');
      }
    }
  };

  const handleSyncPending = async () => {
    setSyncProgress('Syncing...');
    try {
      const pendingPhotos = await getAllDB('pendingPhotos');
      
      for (const photo of pendingPhotos) {
        const blob = new Blob([photo.file]);
        const file = new File([blob], photo.fileName, { type: 'image/jpeg' });
        
        try {
          const { file_url } = await apiClient.integrations.Core.UploadFile({ file });
          await apiClient.entities.Document.create({
            project_id: activeProjectId,
            title: photo.fileName.replace(/\.[^/.]+$/, ''),
            file_url,
            file_name: photo.fileName,
            file_size: photo.fileSize,
            category: 'photo',
            folder_path: '/',
            description: `Field photo - ${new Date(photo.timestamp).toLocaleString()}`,
            status: 'issued'
          });
          await deleteDB('pendingPhotos', photo.id);
        } catch (error) {
          console.error('Failed to sync photo:', error);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['daily-photos'] });
      setSyncProgress(null);
      toast.success('Sync complete');
    } catch (error) {
      setSyncProgress(null);
      toast.error('Sync failed');
    }
  };

  if (!activeProjectId) {
    return (
      <div className="h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <Wrench size={32} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-sm text-zinc-400">Select a project first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-white">Field Ops</h1>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi size={16} className="text-green-500" />
            ) : (
              <WifiOff size={16} className="text-red-500" />
            )}
            <span className="text-xs text-zinc-400">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        {/* Sync Banner */}
        {!isOnline && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2 mb-3">
            <p className="text-xs text-amber-400">Offline mode - data will sync when online</p>
          </div>
        )}

        {/* Pending Sync */}
        {!isOnline && (
          <Button
            size="sm"
            onClick={handleSyncPending}
            disabled={syncProgress !== null}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
          >
            {syncProgress ? (
              <>
                <Clock size={12} className="mr-1 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Upload size={12} className="mr-1" />
                Sync Data
              </>
            )}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-3 border-b border-zinc-800 overflow-x-auto">
        {['photos', 'punch', 'install'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 rounded text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-amber-500 text-black'
                : 'bg-zinc-900 text-zinc-400'
            }`}
          >
            {tab === 'photos' && <Camera size={12} className="inline mr-1" />}
            {tab === 'punch' && <AlertCircle size={12} className="inline mr-1" />}
            {tab === 'install' && <Wrench size={12} className="inline mr-1" />}
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <>
            <label className="block">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={(e) => handlePhotoCapture(Array.from(e.target.files || []))}
                className="hidden"
                id="photo-input"
              />
              <div
                onClick={() => document.getElementById('photo-input').click()}
                className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg p-6 text-center cursor-pointer"
              >
                <Camera size={32} className="mx-auto mb-2 text-white" />
                <p className="text-white font-semibold text-sm">Capture Photo</p>
                <p className="text-xs text-amber-100 mt-1">Tap to use device camera</p>
              </div>
            </label>

            <div className="space-y-2">
              {dailyPhotos.slice(0, 5).map((photo) => (
                <div
                  key={photo.id}
                  className="bg-zinc-900 rounded border border-zinc-800 p-3 flex gap-3"
                >
                  <img
                    src={photo.file_url}
                    alt="thumbnail"
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{photo.title}</p>
                    <p className="text-[10px] text-zinc-500">
                      {new Date(photo.created_date).toLocaleTimeString()}
                    </p>
                  </div>
                  <Check size={14} className="text-green-500 flex-shrink-0" />
                </div>
              ))}
              {dailyPhotos.length === 0 && (
                <div className="text-center py-6">
                  <ImageIcon size={24} className="mx-auto mb-2 text-zinc-700" />
                  <p className="text-xs text-zinc-500">No photos yet</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Punch Tab */}
        {activeTab === 'punch' && (
          <>
            <Button
              onClick={() => setShowForm('punch')}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-sm h-10"
            >
              <Plus size={16} className="mr-2" />
              Log Punch Item
            </Button>

            <div className="space-y-2">
              {punchItems.filter(p => p.status !== 'closed').slice(0, 8).map((punch) => (
                <div
                  key={punch.id}
                  className={`bg-zinc-900 rounded border p-3 ${
                    punch.severity === 'critical' ? 'border-red-500' : 'border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">{punch.title}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{punch.area_gridline}</p>
                    </div>
                    <Badge
                      className={
                        punch.severity === 'critical'
                          ? 'bg-red-500 text-white text-[10px]'
                          : punch.severity === 'major'
                          ? 'bg-orange-500 text-white text-[10px]'
                          : 'bg-yellow-500 text-black text-[10px]'
                      }
                    >
                      {punch.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Install Tab */}
        {activeTab === 'install' && (
          <>
            <Button
              onClick={() => setShowForm('install')}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-sm h-10"
            >
              <Plus size={16} className="mr-2" />
              Log Installation
            </Button>

            <div className="space-y-2">
              {installs.slice(0, 8).map((install) => (
                <div key={install.id} className="bg-zinc-900 rounded border border-zinc-800 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">{install.piece_mark}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{install.area_gridline}</p>
                    </div>
                    <Badge
                      className={
                        install.status === 'complete'
                          ? 'bg-green-500 text-white text-[10px]'
                          : install.status === 'in_progress'
                          ? 'bg-blue-500 text-white text-[10px]'
                          : 'bg-zinc-700 text-zinc-300 text-[10px]'
                      }
                    >
                      {install.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Forms */}
      {showForm === 'punch' && (
        <MobilePunchForm
          projectId={activeProjectId}
          onSubmit={(data) => createPunchMutation.mutate(data)}
          onCancel={() => setShowForm(null)}
          isOffline={!isOnline}
        />
      )}

      {showForm === 'install' && (
        <MobileInstallForm
          projectId={activeProjectId}
          onSubmit={(data) => createInstallMutation.mutate(data)}
          onCancel={() => setShowForm(null)}
          isOffline={!isOnline}
        />
      )}
    </div>
  );
}

function MobilePunchForm({ projectId, onSubmit, onCancel, isOffline }) {
  const [data, setData] = useState({
    project_id: projectId,
    title: '',
    area_gridline: '',
    description: '',
    category: 'other',
    severity: 'major',
    status: 'open'
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="w-full bg-zinc-900 rounded-t-lg border-t border-zinc-800 p-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-sm font-bold text-white mb-4">Log Punch Item</h2>
        {isOffline && <p className="text-[10px] text-amber-400 mb-3">Will save offline & sync later</p>}
        
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Title *</label>
            <Input
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              placeholder="What needs fixing"
              className="h-9 bg-zinc-800 border-zinc-700 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Location</label>
            <Input
              value={data.area_gridline}
              onChange={(e) => setData({ ...data, area_gridline: e.target.value })}
              placeholder="Grid/Area"
              className="h-9 bg-zinc-800 border-zinc-700 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Details</label>
            <Textarea
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              placeholder="Description..."
              className="bg-zinc-800 border-zinc-700 text-sm"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Type</label>
              <Select value={data.category} onValueChange={(v) => setData({ ...data, category: v })}>
                <SelectTrigger className="h-9 bg-zinc-800 border-zinc-700 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weld">Weld</SelectItem>
                  <SelectItem value="bolt">Bolt</SelectItem>
                  <SelectItem value="alignment">Align</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Severity</label>
              <Select value={data.severity} onValueChange={(v) => setData({ ...data, severity: v })}>
                <SelectTrigger className="h-9 bg-zinc-800 border-zinc-700 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={onCancel} className="flex-1 h-10 text-sm">
              Cancel
            </Button>
            <Button
              onClick={() => onSubmit(data)}
              disabled={!data.title}
              className="flex-1 bg-red-600 hover:bg-red-700 h-10 text-sm"
            >
              Log
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileInstallForm({ projectId, onSubmit, onCancel, isOffline }) {
  const [data, setData] = useState({
    project_id: projectId,
    piece_mark: '',
    area_gridline: '',
    status: 'not_started',
    install_date: new Date().toISOString().split('T')[0]
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="w-full bg-zinc-900 rounded-t-lg border-t border-zinc-800 p-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-sm font-bold text-white mb-4">Log Installation</h2>
        {isOffline && <p className="text-[10px] text-amber-400 mb-3">Will save offline & sync later</p>}
        
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Piece Mark *</label>
            <Input
              value={data.piece_mark}
              onChange={(e) => setData({ ...data, piece_mark: e.target.value })}
              placeholder="e.g., B1-COL-01"
              className="h-9 bg-zinc-800 border-zinc-700 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Location</label>
            <Input
              value={data.area_gridline}
              onChange={(e) => setData({ ...data, area_gridline: e.target.value })}
              placeholder="Grid/Area"
              className="h-9 bg-zinc-800 border-zinc-700 text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={onCancel} className="flex-1 h-10 text-sm">
              Cancel
            </Button>
            <Button
              onClick={() => onSubmit(data)}
              disabled={!data.piece_mark}
              className="flex-1 bg-green-600 hover:bg-green-700 h-10 text-sm"
            >
              Log
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}