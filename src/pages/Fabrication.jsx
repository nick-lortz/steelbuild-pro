import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/PageHeader';
import { Search, Plus, Filter, Package, AlertTriangle, Wrench, BarChart3, Settings } from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';

export default function FabricationPage() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('dashboard');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: fabricationItems = [], isLoading } = useQuery({
    queryKey: ['fabrication', activeProjectId],
    queryFn: () => activeProjectId ? base44.entities.Fabrication.filter({ project_id: activeProjectId }) : [],
    enabled: !!activeProjectId
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['fabrication-packages', activeProjectId],
    queryFn: () => activeProjectId ? base44.entities.FabricationPackage.filter({ project_id: activeProjectId }) : [],
    enabled: !!activeProjectId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Fabrication.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrication'] });
      toast.success('Fabrication item created');
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Fabrication.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrication'] });
      toast.success('Updated');
      setSelectedItem(null);
    }
  });

  const filteredItems = useMemo(() => {
    return fabricationItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.piece_mark?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.area_gridline?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [fabricationItems, searchTerm, statusFilter]);

  const kpis = useMemo(() => {
    const total = fabricationItems.length;
    const released = fabricationItems.filter(i => ['released', 'in_fab', 'fit_up', 'weld'].includes(i.status)).length;
    const complete = fabricationItems.filter(i => i.status === 'ready_to_ship' || i.status === 'shipped').length;
    const onHold = fabricationItems.filter(i => i.on_hold).length;
    const totalWeight = fabricationItems.reduce((sum, i) => sum + (i.weight_tons || 0), 0);
    
    return { total, released, complete, onHold, totalWeight };
  }, [fabricationItems]);

  const handleQuickStatusUpdate = (itemId, newStatus) => {
    updateMutation.mutate({ id: itemId, data: { status: newStatus } });
  };

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <PageHeader title="Fabrication" subtitle="Fabrication Control Center" />
        <Card className="mt-6">
          <CardContent className="p-12 text-center">
            <Package size={48} className="mx-auto mb-4 text-zinc-600" />
            <p className="text-zinc-400">Select a project to view fabrication</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Fabrication" 
        subtitle="Fabrication Control Center"
        actions={
          <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-black">
            <Plus size={16} className="mr-2" />
            Add Piece
          </Button>
        }
      />

      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="dashboard">
            <BarChart3 size={14} className="mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="tracker">
            <Wrench size={14} className="mr-2" />
            Piece Tracker
          </TabsTrigger>
          <TabsTrigger value="packages">
            <Package size={14} className="mr-2" />
            Packages ({packages.length})
          </TabsTrigger>
          <TabsTrigger value="holds">
            <AlertTriangle size={14} className="mr-2" />
            Holds ({kpis.onHold})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{kpis.total}</div>
                <div className="text-xs text-zinc-500">Total Pieces</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-amber-500">{kpis.released}</div>
                <div className="text-xs text-zinc-500">Released</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-500">{kpis.complete}</div>
                <div className="text-xs text-zinc-500">Complete</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-500">{kpis.onHold}</div>
                <div className="text-xs text-zinc-500">On Hold</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{kpis.totalWeight.toFixed(1)}</div>
                <div className="text-xs text-zinc-500">Total Tons</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm">Work Ready Now</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredItems
                  .filter(i => i.prerequisites_met && !i.on_hold && i.status === 'released')
                  .slice(0, 10)
                  .map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded">
                      <div>
                        <div className="font-medium">{item.piece_mark}</div>
                        <div className="text-xs text-zinc-500">{item.area_gridline}</div>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                {filteredItems.filter(i => i.prerequisites_met && !i.on_hold && i.status === 'released').length === 0 && (
                  <p className="text-center py-8 text-zinc-500 text-sm">No items ready for fabrication</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracker" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search piece marks, areas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-800"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="released">Released</SelectItem>
                <SelectItem value="in_fab">In Fab</SelectItem>
                <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left p-3 text-xs font-medium text-zinc-400">Piece Mark</th>
                    <th className="text-left p-3 text-xs font-medium text-zinc-400">Area</th>
                    <th className="text-left p-3 text-xs font-medium text-zinc-400">Status</th>
                    <th className="text-left p-3 text-xs font-medium text-zinc-400">Material</th>
                    <th className="text-left p-3 text-xs font-medium text-zinc-400">Weight</th>
                    <th className="text-left p-3 text-xs font-medium text-zinc-400">Ship Date</th>
                    <th className="text-left p-3 text-xs font-medium text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr key={item.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                      <td className="p-3 font-medium">{item.piece_mark}</td>
                      <td className="p-3 text-sm text-zinc-400">{item.area_gridline}</td>
                      <td className="p-3">
                        <StatusBadge status={item.status} />
                        {item.on_hold && <Badge className="ml-2 bg-red-500">HOLD</Badge>}
                      </td>
                      <td className="p-3 text-sm">
                        <StatusBadge status={item.material_status} />
                      </td>
                      <td className="p-3 text-sm">{item.weight_tons?.toFixed(2) || '—'} T</td>
                      <td className="p-3 text-sm text-zinc-400">
                        {item.ship_date_target ? new Date(item.ship_date_target).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedItem(item)}
                        >
                          <Settings size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-zinc-500">
                  <Wrench size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No fabrication items found</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="packages">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="space-y-4">
                {packages.map(pkg => (
                  <div key={pkg.id} className="p-4 bg-zinc-800 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{pkg.package_name}</div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {pkg.total_pieces} pieces • {pkg.total_weight_tons?.toFixed(1)} tons
                        </div>
                      </div>
                      <StatusBadge status={pkg.status} />
                    </div>
                  </div>
                ))}
                {packages.length === 0 && (
                  <p className="text-center py-8 text-zinc-500">No packages created</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holds">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="space-y-4">
                {filteredItems.filter(i => i.on_hold).map(item => (
                  <div key={item.id} className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">{item.piece_mark}</div>
                        <div className="text-xs text-zinc-500">{item.area_gridline}</div>
                      </div>
                      <Badge className="bg-red-500">{item.hold_reason}</Badge>
                    </div>
                    {item.hold_notes && (
                      <p className="text-sm text-zinc-400 mt-2">{item.hold_notes}</p>
                    )}
                  </div>
                ))}
                {filteredItems.filter(i => i.on_hold).length === 0 && (
                  <p className="text-center py-8 text-zinc-500">No items on hold</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showForm && (
        <FabricationForm
          projectId={activeProjectId}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {selectedItem && (
        <FabricationDetail
          item={selectedItem}
          onUpdate={(data) => updateMutation.mutate({ id: selectedItem.id, data })}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

function FabricationForm({ projectId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    piece_mark: '',
    area_gridline: '',
    item_type: 'beam',
    status: 'not_started',
    material_status: 'not_ordered'
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-zinc-900 border-zinc-800 w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Add Fabrication Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          <div className="flex justify-end gap-2 pt-4">
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

function FabricationDetail({ item, onUpdate, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-zinc-900 border-zinc-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>{item.piece_mark}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400">Status</label>
              <Select
                value={item.status}
                onValueChange={(val) => onUpdate({ status: val })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="in_fab">In Fab</SelectItem>
                  <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400">Material Status</label>
              <Select
                value={item.material_status}
                onValueChange={(val) => onUpdate({ material_status: val })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_ordered">Not Ordered</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="staged">Staged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}