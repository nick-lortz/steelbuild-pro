import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MapPin, FileText, AlertCircle, CheckCircle2, Clock, 
  TrendingUp, BarChart3, Calendar, Link as LinkIcon 
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function RFIDrawingLinkageDashboard({ projectId, drawingSetId }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', projectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: annotations = [] } = useQuery({
    queryKey: ['annotations', projectId],
    queryFn: () => base44.entities.DrawingAnnotation.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: sheets = [] } = useQuery({
    queryKey: ['drawing-sheets', drawingSetId],
    queryFn: () => base44.entities.DrawingSheet.filter({ drawing_set_id: drawingSetId }),
    enabled: !!drawingSetId
  });

  const { data: allSheets = [] } = useQuery({
    queryKey: ['project-sheets', projectId],
    queryFn: () => base44.entities.DrawingSheet.filter({ project_id: projectId }),
    enabled: !!projectId && !drawingSetId
  });

  const sheetsToAnalyze = drawingSetId ? sheets : allSheets;

  // Link RFIs to drawings via annotations
  const linkedData = useMemo(() => {
    const links = [];
    
    rfis.forEach(rfi => {
      // Find annotations linked to this RFI
      const rfiAnnotations = annotations.filter(a => a.linked_rfi_id === rfi.id);
      
      rfiAnnotations.forEach(annotation => {
        const sheet = sheetsToAnalyze.find(s => s.id === annotation.drawing_sheet_id);
        if (sheet) {
          const daysOpen = rfi.submitted_date 
            ? differenceInDays(new Date(), new Date(rfi.submitted_date))
            : 0;
          
          const isOverdue = rfi.due_date && differenceInDays(new Date(), new Date(rfi.due_date)) > 0;
          
          links.push({
            rfi,
            sheet,
            annotation,
            daysOpen,
            isOverdue,
            location: annotation.geometry ? JSON.parse(annotation.geometry) : null
          });
        }
      });
    });

    return links;
  }, [rfis, annotations, sheetsToAnalyze]);

  const filteredLinks = useMemo(() => {
    return linkedData.filter(link => {
      const matchesStatus = statusFilter === 'all' || link.rfi.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || link.rfi.priority === priorityFilter;
      return matchesStatus && matchesPriority;
    });
  }, [linkedData, statusFilter, priorityFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = linkedData.length;
    const answered = linkedData.filter(l => l.rfi.status === 'answered').length;
    const overdue = linkedData.filter(l => l.isOverdue && l.rfi.status !== 'answered').length;
    const avgDaysOpen = linkedData.length > 0
      ? linkedData.reduce((sum, l) => sum + l.daysOpen, 0) / linkedData.length
      : 0;
    const criticalOpen = linkedData.filter(l => 
      l.rfi.priority === 'critical' && l.rfi.status !== 'answered'
    ).length;

    return { total, answered, overdue, avgDaysOpen, criticalOpen };
  }, [linkedData]);

  // Sheet heatmap data
  const sheetHeatmap = useMemo(() => {
    const map = {};
    linkedData.forEach(link => {
      const sheetId = link.sheet.id;
      if (!map[sheetId]) {
        map[sheetId] = {
          sheet: link.sheet,
          count: 0,
          open: 0,
          critical: 0
        };
      }
      map[sheetId].count++;
      if (link.rfi.status !== 'answered' && link.rfi.status !== 'closed') {
        map[sheetId].open++;
      }
      if (link.rfi.priority === 'critical') {
        map[sheetId].critical++;
      }
    });

    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [linkedData]);

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{metrics.total}</p>
                <p className="text-xs text-zinc-400">Total Linked RFIs</p>
              </div>
              <LinkIcon className="text-zinc-500" size={28} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-950/20 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-400">{metrics.answered}</p>
                <p className="text-xs text-green-300">Answered</p>
              </div>
              <CheckCircle2 className="text-green-400" size={28} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-950/20 border-red-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-400">{metrics.overdue}</p>
                <p className="text-xs text-red-300">Overdue</p>
              </div>
              <AlertCircle className="text-red-400" size={28} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-950/20 border-amber-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-400">{metrics.criticalOpen}</p>
                <p className="text-xs text-amber-300">Critical Open</p>
              </div>
              <AlertCircle className="text-amber-400" size={28} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-950/20 border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-400">{metrics.avgDaysOpen.toFixed(0)}</p>
                <p className="text-xs text-blue-300">Avg Days Open</p>
              </div>
              <TrendingUp className="text-blue-400" size={28} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sheet Heatmap */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChart3 size={20} />
            Drawing Sheet Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sheetHeatmap.map(({ sheet, count, open, critical }) => (
              <div
                key={sheet.id}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-zinc-500" />
                    <span className="font-mono text-sm text-white">{sheet.sheet_number}</span>
                    <span className="text-sm text-zinc-400">{sheet.sheet_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">
                    {count} RFIs
                  </Badge>
                  {open > 0 && (
                    <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                      {open} Open
                    </Badge>
                  )}
                  {critical > 0 && (
                    <Badge className="bg-red-500/20 text-red-400 text-xs">
                      {critical} Critical
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Linked RFIs List */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MapPin size={20} />
            RFI Locations on Drawings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLinks.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <MapPin size={40} className="mx-auto mb-3 opacity-50" />
              <p>No linked RFIs found</p>
              <p className="text-xs mt-1">Use the markup tool to link RFIs to drawing locations</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLinks.map((link, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-4 rounded-lg border",
                    link.isOverdue ? "bg-red-950/10 border-red-500/30" :
                    link.rfi.priority === 'critical' ? "bg-amber-950/10 border-amber-500/30" :
                    "bg-zinc-800/30 border-zinc-700"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Link 
                        to={createPageUrl('RFIHub')}
                        className="text-white font-medium hover:text-amber-400 transition-colors"
                      >
                        RFI-{link.rfi.rfi_number}: {link.rfi.subject}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <FileText size={12} className="text-zinc-500" />
                        <span className="text-xs text-zinc-400 font-mono">
                          {link.sheet.sheet_number}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn(
                        link.rfi.status === 'answered' ? 'bg-green-500/20 text-green-400' :
                        link.rfi.status === 'submitted' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-zinc-700/20 text-zinc-400'
                      )}>
                        {link.rfi.status}
                      </Badge>
                      <Badge className={cn(
                        link.rfi.priority === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        link.rfi.priority === 'high' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        'bg-zinc-700/20 text-zinc-400 border-zinc-700/30'
                      )}>
                        {link.rfi.priority}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-zinc-400">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{link.daysOpen} days open</span>
                    </div>
                    {link.rfi.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span className={link.isOverdue ? 'text-red-400' : ''}>
                          Due: {format(new Date(link.rfi.due_date), 'MMM d')}
                        </span>
                      </div>
                    )}
                    {link.location && (
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        <span>({link.location.x?.toFixed(0)}, {link.location.y?.toFixed(0)})</span>
                      </div>
                    )}
                  </div>

                  {link.annotation.content && (
                    <div className="mt-3 pt-3 border-t border-zinc-700">
                      <p className="text-xs text-zinc-300">{link.annotation.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}