import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/notifications';
import { format, parseISO } from 'date-fns';
import {
  FileText,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  History,
  Edit3,
  Save,
  X
} from 'lucide-react';

export default function DrawingSetDetailDialog({ drawingSetId, open, onOpenChange, users, rfis }) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  const { data: drawingSet, isLoading } = useQuery({
    queryKey: ['drawing-set', drawingSetId],
    queryFn: async () => {
      const sets = await base44.entities.DrawingSet.filter({ id: drawingSetId });
      return sets[0];
    },
    enabled: !!drawingSetId && open,
    onSuccess: (data) => {
      if (data) setFormData(data);
    }
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ['drawing-revisions', drawingSetId],
    queryFn: () => base44.entities.DrawingRevision.filter({ drawing_set_id: drawingSetId }),
    enabled: !!drawingSetId && open
  });

  const linkedRFIs = rfis?.filter(r => r.linked_drawing_set_id === drawingSetId) || [];

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.DrawingSet.update(drawingSetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing-sets'] });
      queryClient.invalidateQueries({ queryKey: ['drawing-set', drawingSetId] });
      toast.success('Drawing set updated');
      setEditMode(false);
    },
    onError: () => toast.error('Update failed')
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData(drawingSet);
    setEditMode(false);
  };

  if (!drawingSet || isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800">
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">{drawingSet.set_name}</DialogTitle>
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <Button size="sm" variant="outline" onClick={handleCancel} className="h-8">
                    <X size={14} className="mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} className="h-8 bg-amber-500 hover:bg-amber-600 text-black">
                    <Save size={14} className="mr-1" />
                    Save
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setEditMode(true)} className="h-8 bg-zinc-800 hover:bg-zinc-700">
                  <Edit3 size={14} className="mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="bg-zinc-800 border-zinc-700">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="revisions">
              Revisions ({revisions.length})
            </TabsTrigger>
            <TabsTrigger value="rfis">
              RFIs ({linkedRFIs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Basic Info */}
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wider">Set Number</label>
                    {editMode ? (
                      <Input
                        value={formData.set_number || ''}
                        onChange={(e) => setFormData({ ...formData, set_number: e.target.value })}
                        className="mt-1 bg-zinc-900 border-zinc-700"
                      />
                    ) : (
                      <div className="text-white font-mono mt-1">{drawingSet.set_number}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wider">Set Name</label>
                    {editMode ? (
                      <Input
                        value={formData.set_name || ''}
                        onChange={(e) => setFormData({ ...formData, set_name: e.target.value })}
                        className="mt-1 bg-zinc-900 border-zinc-700"
                      />
                    ) : (
                      <div className="text-white mt-1">{drawingSet.set_name}</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wider">Current Revision</label>
                    {editMode ? (
                      <Input
                        value={formData.current_revision || ''}
                        onChange={(e) => setFormData({ ...formData, current_revision: e.target.value })}
                        className="mt-1 bg-zinc-900 border-zinc-700"
                      />
                    ) : (
                      <div className="text-white font-mono mt-1">{drawingSet.current_revision || '—'}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wider">Sheet Count</label>
                    {editMode ? (
                      <Input
                        type="number"
                        value={formData.sheet_count || 0}
                        onChange={(e) => setFormData({ ...formData, sheet_count: parseInt(e.target.value) || 0 })}
                        className="mt-1 bg-zinc-900 border-zinc-700"
                      />
                    ) : (
                      <div className="text-white font-mono mt-1">{drawingSet.sheet_count || 0}</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wider">Discipline</label>
                    {editMode ? (
                      <Select
                        value={formData.discipline || ''}
                        onValueChange={(val) => setFormData({ ...formData, discipline: val })}
                      >
                        <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          <SelectItem value="structural">Structural</SelectItem>
                          <SelectItem value="misc_metals">Misc Metals</SelectItem>
                          <SelectItem value="stairs">Stairs</SelectItem>
                          <SelectItem value="handrails">Handrails</SelectItem>
                          <SelectItem value="connections">Connections</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-white capitalize mt-1">{drawingSet.discipline?.replace('_', ' ') || '—'}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wider">Status</label>
                    {editMode ? (
                      <Select
                        value={formData.status || ''}
                        onValueChange={(val) => setFormData({ ...formData, status: val })}
                      >
                        <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          <SelectItem value="IFA">IFA</SelectItem>
                          <SelectItem value="BFA">BFA</SelectItem>
                          <SelectItem value="BFS">BFS</SelectItem>
                          <SelectItem value="FFF">FFF</SelectItem>
                          <SelectItem value="As-Built">As-Built</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1">
                        <Badge className={
                          drawingSet.status === 'FFF' ? 'bg-green-500' :
                          drawingSet.status === 'BFA' ? 'bg-red-500' :
                          drawingSet.status === 'IFA' ? 'bg-amber-500' :
                          'bg-purple-500'
                        }>
                          {drawingSet.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wider">Description</label>
                  {editMode ? (
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1 bg-zinc-900 border-zinc-700"
                      rows={3}
                    />
                  ) : (
                    <div className="text-zinc-300 text-sm mt-1">{drawingSet.description || '—'}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dates & Timeline */}
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide">Dates & Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wider">Due Date</label>
                    {editMode ? (
                      <Input
                        type="date"
                        value={formData.due_date || ''}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="mt-1 bg-zinc-900 border-zinc-700"
                      />
                    ) : (
                      <div className="text-white mt-1">
                        {drawingSet.due_date ? format(parseISO(drawingSet.due_date), 'MMM d, yyyy') : '—'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wider">Reviewer</label>
                    {editMode ? (
                      <Select
                        value={formData.reviewer || 'unassigned'}
                        onValueChange={(val) => setFormData({ ...formData, reviewer: val === 'unassigned' ? null : val })}
                      >
                        <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users?.map((u) => (
                            <SelectItem key={u.email} value={u.email}>
                              {u.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-white mt-1">
                        {users?.find(u => u.email === drawingSet.reviewer)?.full_name || 'Unassigned'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar size={10} />
                      IFA Date
                    </label>
                    <div className="text-zinc-300 text-sm mt-1 font-mono">
                      {drawingSet.ifa_date ? format(parseISO(drawingSet.ifa_date), 'MMM d, yyyy') : '—'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar size={10} />
                      BFA Date
                    </label>
                    <div className="text-zinc-300 text-sm mt-1 font-mono">
                      {drawingSet.bfa_date ? format(parseISO(drawingSet.bfa_date), 'MMM d, yyyy') : '—'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar size={10} />
                      FFF Date
                    </label>
                    <div className="text-zinc-300 text-sm mt-1 font-mono">
                      {drawingSet.fff_date ? format(parseISO(drawingSet.fff_date), 'MMM d, yyyy') : '—'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <Textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="bg-zinc-900 border-zinc-700"
                    rows={4}
                    placeholder="Add notes about this drawing set..."
                  />
                ) : (
                  <div className="text-zinc-300 text-sm whitespace-pre-wrap">
                    {drawingSet.notes || 'No notes'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revisions" className="space-y-2 mt-4">
            {revisions.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <History size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">No revision history</p>
              </div>
            ) : (
              revisions.map((rev) => (
                <Card key={rev.id} className="bg-zinc-800/50 border-zinc-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white font-mono">{rev.revision_number}</span>
                          <Badge className={
                            rev.status === 'FFF' ? 'bg-green-500' :
                            rev.status === 'BFA' ? 'bg-red-500' :
                            rev.status === 'IFA' ? 'bg-amber-500' :
                            'bg-purple-500'
                          }>
                            {rev.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-300">{rev.description || 'No description'}</p>
                      </div>
                      <div className="text-right text-xs text-zinc-500">
                        {rev.revision_date ? format(parseISO(rev.revision_date), 'MMM d, yyyy') : '—'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="rfis" className="space-y-2 mt-4">
            {linkedRFIs.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500 opacity-50" />
                <p className="text-sm">No RFIs linked to this drawing set</p>
              </div>
            ) : (
              linkedRFIs.map((rfi) => (
                <Card key={rfi.id} className="bg-zinc-800/50 border-zinc-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white font-mono">RFI #{rfi.rfi_number}</span>
                          <Badge variant={
                            rfi.status === 'answered' || rfi.status === 'closed' ? 'default' : 'destructive'
                          }>
                            {rfi.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-300">{rfi.subject}</p>
                      </div>
                      <div className="text-right text-xs text-zinc-500">
                        {rfi.submitted_date ? format(parseISO(rfi.submitted_date), 'MMM d, yyyy') : '—'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}