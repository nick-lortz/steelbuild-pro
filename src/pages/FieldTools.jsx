import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/ui/PageHeader';
import { Camera, CheckSquare, FileText, AlertCircle, Wrench, Plus, Search, Upload, Image as ImageIcon, Folder, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';
import DocumentUploadZone from '@/components/documents/DocumentUploadZone';
import FolderBreadcrumb from '@/components/documents/FolderBreadcrumb';

export default function FieldToolsPage() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('daily');
  const [showForm, setShowForm] = useState(null);
  const [currentFolder, setCurrentFolder] = useState('/');
  const [uploading, setUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const { data: dailyPhotos = [] } = useQuery({
    queryKey: ['daily-photos', activeProjectId, currentFolder],
    queryFn: async () => {
      if (!activeProjectId) return [];
      return await base44.entities.Document.filter({
        project_id: activeProjectId,
        category: 'photo',
        folder_path: currentFolder
      }, '-created_date');
    },
    enabled: !!activeProjectId
  });

  const { data: installs = [] } = useQuery({
    queryKey: ['field-installs', activeProjectId],
    queryFn: () => activeProjectId ? base44.entities.FieldInstall.filter({ project_id: activeProjectId }) : [],
    enabled: !!activeProjectId
  });

  const { data: punchItems = [] } = useQuery({
    queryKey: ['punch-items', activeProjectId],
    queryFn: () => activeProjectId ? base44.entities.PunchItem.filter({ project_id: activeProjectId }) : [],
    enabled: !!activeProjectId
  });

  const updateInstallMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FieldInstall.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-installs'] });
      toast.success('Updated');
    }
  });

  const createInstallMutation = useMutation({
    mutationFn: (data) => base44.entities.FieldInstall.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-installs'] });
      toast.success('Install recorded');
      setShowForm(null);
    }
  });

  const createPunchMutation = useMutation({
    mutationFn: (data) => base44.entities.PunchItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] });
      toast.success('Punch item added');
      setShowForm(null);
    }
  });

  const handlePhotoUpload = async (files) => {
    if (!activeProjectId) return;
    setUploading(true);
    
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        await base44.entities.Document.create({
          project_id: activeProjectId,
          title: file.name.replace(/\.[^/.]+$/, ''),
          file_url,
          file_name: file.name,
          file_size: file.size,
          category: 'photo',
          folder_path: currentFolder,
          description: `Field photo - ${new Date().toLocaleString()}`,
          status: 'issued'
        });
      }
      queryClient.invalidateQueries({ queryKey: ['daily-photos'] });
      toast.success(`${files.length} photo(s) captured`);
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name required');
      return;
    }
    const newPath = currentFolder === '/' ? `/${newFolderName}` : `${currentFolder}/${newFolderName}`;
    setCurrentFolder(newPath);
    setNewFolderName('');
    setShowForm(null);
    toast.success(`Folder "${newFolderName}" created`);
  };

  const folders = useMemo(() => {
    const uniquePaths = new Set();
    dailyPhotos.forEach(photo => {
      if (photo.folder_path && photo.folder_path !== currentFolder) {
        const relativePath = photo.folder_path.replace(currentFolder, '').split('/').filter(Boolean)[0];
        if (relativePath) {
          uniquePaths.add(relativePath);
        }
      }
    });
    return Array.from(uniquePaths);
  }, [dailyPhotos, currentFolder]);

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayInstalls = installs.filter(i => i.install_date === today);
    const openPunch = punchItems.filter(p => p.status !== 'closed').length;
    const todayPhotos = dailyPhotos.filter(p => p.created_date?.split('T')[0] === today);
    
    return {
      installed: todayInstalls.filter(i => i.status === 'complete').length,
      inProgress: todayInstalls.filter(i => i.status === 'in_progress').length,
      openPunch,
      photosToday: todayPhotos.length
    };
  }, [installs, punchItems, dailyPhotos]);

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <PageHeader title="Field Tools" />
        <Card className="mt-6 bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Wrench size={48} className="mx-auto mb-4 text-zinc-600" />
            <p className="text-zinc-400">Select a project to access field tools</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Field Tools"
        subtitle="Mobile-First On-Site Operations"
      />

      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-500">{todayStats.installed}</div>
            <div className="text-xs text-zinc-500">Installed Today</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-500">{todayStats.inProgress}</div>
            <div className="text-xs text-zinc-500">In Progress</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-500">{todayStats.openPunch}</div>
            <div className="text-xs text-zinc-500">Open Punch</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">{todayStats.photosToday}</div>
            <div className="text-xs text-zinc-500">Photos Today</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="daily">
            <Camera size={14} className="mr-2" />
            Daily Photos
          </TabsTrigger>
          <TabsTrigger value="install">
            <Wrench size={14} className="mr-2" />
            Install Tracking
          </TabsTrigger>
          <TabsTrigger value="punch">
            <AlertCircle size={14} className="mr-2" />
            Punch List
          </TabsTrigger>
        </TabsList>

        {/* Daily Photos Tab */}
        <TabsContent value="daily" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-3">Capture Site Conditions</h3>
              <DocumentUploadZone onUpload={handlePhotoUpload} isLoading={uploading} multiple />
            </div>
            <Button
              onClick={() => setShowForm('folder')}
              variant="outline"
              size="sm"
              className="border-zinc-700 flex-shrink-0"
            >
              <FolderPlus size={14} className="mr-2" />
              New Folder
            </Button>
          </div>

          <div className="space-y-3">
            <FolderBreadcrumb currentPath={currentFolder} onNavigate={setCurrentFolder} />

            {/* Folders */}
            {folders.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {folders.map(folder => (
                  <button
                    key={folder}
                    onClick={() => setCurrentFolder(currentFolder === '/' ? `/${folder}` : `${currentFolder}/${folder}`)}
                    className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded p-3 hover:bg-zinc-800 transition-colors"
                  >
                    <Folder size={20} className="text-amber-500 flex-shrink-0" />
                    <span className="text-xs text-white truncate">{folder}</span>
                  </button>
                ))}
              </div>
            )}
            
            {dailyPhotos.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-8 text-center">
                  <ImageIcon size={32} className="mx-auto mb-2 text-zinc-600" />
                  <p className="text-zinc-400 text-sm">No photos yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {dailyPhotos.map(photo => (
                  <div key={photo.id} className="relative aspect-square bg-zinc-900 rounded border border-zinc-800 overflow-hidden group cursor-pointer">
                    <img src={photo.file_url} alt={photo.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                      <span className="text-[10px] text-white font-medium truncate">{photo.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Install Tracking Tab */}
        <TabsContent value="install" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-white">Piece Installation Progress</h3>
            <Button 
              onClick={() => setShowForm('install')}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={14} className="mr-1" />
              Log Install
            </Button>
          </div>

          <div className="space-y-2">
            {installs.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-8 text-center">
                  <Wrench size={32} className="mx-auto mb-2 text-zinc-600" />
                  <p className="text-zinc-400 text-sm">No installations tracked</p>
                </CardContent>
              </Card>
            ) : (
              installs.map(install => (
                <Card key={install.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">{install.piece_mark}</div>
                        <div className="text-xs text-zinc-500">{install.area_gridline}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={install.status} />
                        <Select
                          value={install.status}
                          onValueChange={(val) => updateInstallMutation.mutate({ id: install.id, data: { status: val } })}
                        >
                          <SelectTrigger className="w-32 h-8 bg-zinc-800 border-zinc-700 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">Not Started</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="set">Set</SelectItem>
                            <SelectItem value="bolted">Bolted</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Punch List Tab */}
        <TabsContent value="punch" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-white">Open Punch Items</h3>
            <Button 
              onClick={() => setShowForm('punch')}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={14} className="mr-1" />
              Add Punch
            </Button>
          </div>

          <div className="space-y-2">
            {punchItems.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-8 text-center">
                  <CheckSquare size={32} className="mx-auto mb-2 text-zinc-600" />
                  <p className="text-zinc-400 text-sm">No punch items</p>
                </CardContent>
              </Card>
            ) : (
              punchItems.map(punch => (
                <Card key={punch.id} className={`bg-zinc-900 border-zinc-800 ${punch.severity === 'critical' ? 'ring-2 ring-red-500/50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-white">{punch.title}</div>
                        <div className="text-xs text-zinc-500 mt-1">{punch.area_gridline}</div>
                        {punch.description && <p className="text-sm text-zinc-400 mt-2">{punch.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          punch.severity === 'critical' ? 'bg-red-500' :
                          punch.severity === 'major' ? 'bg-orange-500' :
                          'bg-yellow-500'
                        }>
                          {punch.severity}
                        </Badge>
                        <StatusBadge status={punch.status} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {showForm === 'install' && (
        <InstallForm
          projectId={activeProjectId}
          onSubmit={(data) => createInstallMutation.mutate(data)}
          onCancel={() => setShowForm(null)}
        />
      )}

      {showForm === 'punch' && (
        <PunchForm
          projectId={activeProjectId}
          onSubmit={(data) => createPunchMutation.mutate(data)}
          onCancel={() => setShowForm(null)}
        />
      )}

      {showForm === 'folder' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-zinc-900 border-zinc-800 w-full max-w-sm">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Create Folder</h2>
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Folder Name *</label>
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g., South Elevation"
                  className="bg-zinc-800 border-zinc-700"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => { setShowForm(null); setNewFolderName(''); }}>Cancel</Button>
                <Button 
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function InstallForm({ projectId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    piece_mark: '',
    area_gridline: '',
    status: 'not_started',
    install_date: new Date().toISOString().split('T')[0]
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-zinc-900 border-zinc-800 w-full max-w-lg">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Track Installation</h2>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Piece Mark *</label>
            <Input
              value={formData.piece_mark}
              onChange={(e) => setFormData({ ...formData, piece_mark: e.target.value })}
              placeholder="e.g., B1-COL"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Area/Gridline</label>
            <Input
              value={formData.area_gridline}
              onChange={(e) => setFormData({ ...formData, area_gridline: e.target.value })}
              placeholder="e.g., Grid A/1"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button 
              onClick={() => onSubmit(formData)}
              disabled={!formData.piece_mark}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Log
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PunchForm({ projectId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    punch_number: Date.now(),
    title: '',
    description: '',
    area_gridline: '',
    category: 'other',
    severity: 'major',
    status: 'open'
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-zinc-900 border-zinc-800 w-full max-w-lg">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Add Punch Item</h2>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Weld repair needed"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Location</label>
            <Input
              value={formData.area_gridline}
              onChange={(e) => setFormData({ ...formData, area_gridline: e.target.value })}
              placeholder="e.g., Grid B/2"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Details</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Category</label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weld">Weld</SelectItem>
                  <SelectItem value="bolt">Bolt</SelectItem>
                  <SelectItem value="alignment">Alignment</SelectItem>
                  <SelectItem value="coating">Coating</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Severity</label>
              <Select value={formData.severity} onValueChange={(val) => setFormData({ ...formData, severity: val })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button 
              onClick={() => onSubmit(formData)}
              disabled={!formData.title}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}