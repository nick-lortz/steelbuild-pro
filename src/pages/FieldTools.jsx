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
import { Camera, CheckSquare, FileText, AlertCircle, Wrench, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';

export default function FieldToolsPage() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('install');
  const [showForm, setShowForm] = useState(null);

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

  const { data: dailyReports = [] } = useQuery({
    queryKey: ['daily-reports', activeProjectId],
    queryFn: () => activeProjectId ? base44.entities.FieldDailyReport.filter({ project_id: activeProjectId }) : [],
    enabled: !!activeProjectId
  });

  const createInstallMutation = useMutation({
    mutationFn: (data) => base44.entities.FieldInstall.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-installs'] });
      toast.success('Install tracking created');
      setShowForm(null);
    }
  });

  const updateInstallMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FieldInstall.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-installs'] });
      toast.success('Updated');
    }
  });

  const createPunchMutation = useMutation({
    mutationFn: (data) => base44.entities.PunchItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] });
      toast.success('Punch item created');
      setShowForm(null);
    }
  });

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayInstalls = installs.filter(i => i.install_date === today);
    const openPunch = punchItems.filter(p => p.status !== 'closed').length;
    
    return {
      installed: todayInstalls.filter(i => i.status === 'complete').length,
      inProgress: todayInstalls.filter(i => i.status === 'in_progress').length,
      openPunch
    };
  }, [installs, punchItems]);

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <PageHeader title="Field Tools" />
        <Card className="mt-6">
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
        subtitle="Mobile-First Field Operations"
      />

      <div className="grid grid-cols-3 gap-4">
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="install">
            <Wrench size={14} className="mr-2" />
            Install Tracking ({installs.length})
          </TabsTrigger>
          <TabsTrigger value="punch">
            <AlertCircle size={14} className="mr-2" />
            Punch List ({punchItems.length})
          </TabsTrigger>
          <TabsTrigger value="daily">
            <FileText size={14} className="mr-2" />
            Daily Reports ({dailyReports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="install" className="space-y-4">
          <div className="flex justify-between">
            <div className="text-sm text-zinc-400">Track piece installation progress</div>
            <Button 
              onClick={() => setShowForm('install')}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={14} className="mr-1" />
              Track Install
            </Button>
          </div>

          <div className="space-y-2">
            {installs.map(install => (
              <Card key={install.id} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{install.piece_mark}</div>
                      <div className="text-xs text-zinc-500">{install.area_gridline}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={install.status} />
                      <Select
                        value={install.status}
                        onValueChange={(val) => updateInstallMutation.mutate({ id: install.id, data: { status: val } })}
                      >
                        <SelectTrigger className="w-32 h-8 bg-zinc-800 border-zinc-700">
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
            ))}
            {installs.length === 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <Wrench size={48} className="mx-auto mb-4 text-zinc-600" />
                  <p className="text-zinc-400">No install tracking records</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="punch" className="space-y-4">
          <div className="flex justify-between">
            <div className="text-sm text-zinc-400">Manage field punch items</div>
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
            {punchItems.map(punch => (
              <Card key={punch.id} className={`bg-zinc-900 border-zinc-800 ${punch.severity === 'critical' ? 'ring-2 ring-red-500/50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{punch.title}</div>
                      <div className="text-xs text-zinc-500 mt-1">{punch.area_gridline}</div>
                      {punch.description && (
                        <div className="text-sm text-zinc-400 mt-2">{punch.description}</div>
                      )}
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
                  <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                    <span>{punch.category}</span>
                    {punch.assigned_to && <span>Assigned: {punch.assigned_to.split('@')[0]}</span>}
                    {punch.due_date && <span>Due: {format(new Date(punch.due_date), 'MMM d')}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {punchItems.length === 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <CheckSquare size={48} className="mx-auto mb-4 text-zinc-600" />
                  <p className="text-zinc-400">No punch items</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="daily">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <FileText size={48} className="mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-400 mb-4">Daily reports module</p>
              <Button size="sm">Create Today's Report</Button>
            </CardContent>
          </Card>
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
          <h2 className="text-xl font-bold">Track Install</h2>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Piece Mark *</label>
            <Input
              value={formData.piece_mark}
              onChange={(e) => setFormData({ ...formData, piece_mark: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Area/Gridline</label>
            <Input
              value={formData.area_gridline}
              onChange={(e) => setFormData({ ...formData, area_gridline: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button 
              onClick={() => onSubmit(formData)}
              disabled={!formData.piece_mark}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Create
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
    category: 'other',
    severity: 'major',
    status: 'open'
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-zinc-900 border-zinc-800 w-full max-w-lg">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Add Punch Item</h2>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Category</label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
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
              <Select
                value={formData.severity}
                onValueChange={(val) => setFormData({ ...formData, severity: val })}
              >
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
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button 
              onClick={() => onSubmit(formData)}
              disabled={!formData.title}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Create
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}