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
import { format, parseISO, isValid } from 'date-fns';
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
  X,
  Upload,
  TrendingUp,
  Download
} from 'lucide-react';
import DrawingUploadEnhanced from './DrawingUploadEnhanced';
import DrawingHeatMap from './DrawingHeatMap';
import DrawingRevisionWarnings from './DrawingRevisionWarnings';
import AIAnalysisPanel from './AIAnalysisPanel';
import DrawingComparisonPanel from './DrawingComparisonPanel';
import SmartLinkagePanel from './SmartLinkagePanel';
import DrawingDetailExtraction from './DrawingDetailExtraction';
import MembersConnectionsTable from './MembersConnectionsTable';
import SteelQAGate from './SteelQAGate';

const safeFormatISO = (value, pattern = 'MMM d, yyyy') => {
  if (!value) return '—';

  // Already a Date
  if (value instanceof Date) return isValid(value) ? format(value, pattern) : '—';

  const s = String(value).trim();

  // Numeric timestamps (seconds or ms), including numeric strings
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    const ms = n < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    return isValid(d) ? format(d, pattern) : '—';
  }

  // Handle "YYYY-MM-DD HH:mm:ss" by making it ISO-ish
  const isoish = s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') : s;

  const d = parseISO(isoish);
  return isValid(d) ? format(d, pattern) : '—';
};

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

  const { data: sheets = [] } = useQuery({
    queryKey: ['drawing-sheets', drawingSetId],
    queryFn: () => base44.entities.DrawingSheet.filter({ drawing_set_id: drawingSetId }),
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
    const updateData = {
      project_id: formData.project_id,
      set_number: formData.set_number,
      title: formData.set_name || formData.title, // map set_name to title
      discipline: formData.discipline,
      status: formData.status,
      submitted_date: formData.ifa_date || formData.submitted_date || null,
      approved_date: formData.approved_date || null,
      notes: formData.notes || '',
      sheet_count: formData.sheet_count || 0,
      current_revision: formData.current_revision || null
    };
    updateMutation.mutate(updateData);
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
            <DialogTitle className="text-xl font-bold">{drawingSet.title || drawingSet.set_name}</DialogTitle>
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

        <DrawingRevisionWarnings drawingSet={drawingSet} sheets={sheets} />

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="bg-zinc-800 border-zinc-700">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="qa">QA Gate</TabsTrigger>
            <TabsTrigger value="ai">AI Analysis</TabsTrigger>
            <TabsTrigger value="steel_details">Steel Details</TabsTrigger>
            <TabsTrigger value="sheets">
              Sheets ({sheets.length})
            </TabsTrigger>
            <TabsTrigger value="heatmap">
              Heat Map
            </TabsTrigger>
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
                    <label className="text-xs text-zinc-400 uppercase tracking-wider">Title</label>
                    {editMode ? (
                      <Input
                        value={formData.set_name || formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, set_name: e.target.value, title: e.target.value })}
                        className="mt-1 bg-zinc-900 border-zinc-700"
                      />
                    ) : (
                      <div className="text-white mt-1">{drawingSet.title || drawingSet.set_name}</div>
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
                        {safeFormatISO(drawingSet.due_date)}
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
                      {safeFormatISO(drawingSet.ifa_date)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar size={10} />
                      BFA Date
                    </label>
                    <div className="text-zinc-300 text-sm mt-1 font-mono">
                      {safeFormatISO(drawingSet.bfa_date)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar size={10} />
                      FFF Date
                    </label>
                    <div className="text-zinc-300 text-sm mt-1 font-mono">
                      {safeFormatISO(drawingSet.fff_date)}
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

          <TabsContent value="qa" className="mt-4">
            <SteelQAGate 
              drawingSetId={drawingSetId}
              onQAComplete={() => {
                queryClient.invalidateQueries({ queryKey: ['drawing-set', drawingSetId] });
              }}
            />
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            <div className="space-y-4">
              <AIAnalysisPanel 
                drawingSet={drawingSet}
                onAnalysisComplete={() => {
                  queryClient.invalidateQueries({ queryKey: ['drawing-set', drawingSetId] });
                }}
              />
              <DrawingComparisonPanel 
                currentDrawingSet={drawingSet}
                projectId={drawingSet.project_id}
              />
              <SmartLinkagePanel 
                drawingSet={drawingSet}
                onLinksUpdated={() => {
                  queryClient.invalidateQueries({ queryKey: ['drawing-set', drawingSetId] });
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="steel_details" className="space-y-4 mt-4">
            {sheets.length > 0 ? (
              sheets.map(sheet => (
                <div key={sheet.id} className="space-y-3">
                  <DrawingDetailExtraction 
                    sheet={sheet}
                    onExtracted={(extracted) => {
                      queryClient.invalidateQueries({ queryKey: ['drawing-sheets'] });
                    }}
                  />
                  <MembersConnectionsTable extracted={
                    sheet.ai_metadata ? JSON.parse(sheet.ai_metadata) : null
                  } />
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-zinc-500">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">Upload sheets to extract steel details</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sheets" className="space-y-4 mt-4">
            <DrawingUploadEnhanced 
              drawingSetId={drawingSetId}
              onUploadComplete={() => {
                queryClient.invalidateQueries({ queryKey: ['drawing-sheets'] });
                queryClient.invalidateQueries({ queryKey: ['drawing-sets'] });
              }}
            />

            {sheets.length > 0 && (
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-sm">Uploaded Sheets ({sheets.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sheets.map(sheet => {
                    let metadata = null;
                    let referencedDrawings = [];
                    try {
                      metadata = sheet.ai_metadata ? JSON.parse(sheet.ai_metadata) : null;
                      referencedDrawings = metadata?.referenced_drawings || [];
                    } catch (e) {
                      // Ignore
                    }

                    return (
                      <div key={sheet.id} className="p-3 bg-zinc-900 rounded border border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 flex-1">
                            <FileText size={16} className="text-amber-400" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm font-bold text-white">{sheet.sheet_number}</span>
                                {metadata?.revision && (
                                  <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                                    {metadata.revision}
                                  </Badge>
                                )}
                                {referencedDrawings.length > 0 && (
                                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                                    {referencedDrawings.length} refs
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-zinc-400 truncate">{sheet.sheet_name}</div>
                              {metadata?.issue_date && (
                                <div className="text-xs text-zinc-500 mt-1">
                                  Issued: {safeFormatISO(metadata.issue_date)}
                                </div>
                              )}
                            </div>
                          </div>
                          <a
                            href={sheet.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-white"
                          >
                            <Download size={16} />
                          </a>
                        </div>
                        {referencedDrawings.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-zinc-800">
                            <div className="text-xs text-zinc-500 mb-1">Referenced Drawings:</div>
                            <div className="flex gap-1 flex-wrap">
                              {referencedDrawings.map((ref, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs border-purple-500/30 text-purple-400">
                                  {ref}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="heatmap" className="mt-4">
            <DrawingHeatMap sheets={sheets} />
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
                        {safeFormatISO(rev.revision_date)}
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
                        {safeFormatISO(rfi.submitted_date)}
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