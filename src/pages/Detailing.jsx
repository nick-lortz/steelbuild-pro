import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Filter,
  Plus,
  TrendingUp
} from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { cn } from '@/lib/utils';

export default function Detailing() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    discipline: 'all',
    assigned_to: 'all',
    priority: 'all'
  });

  // Fetch detailing items
  const { data: detailingItems = [], isLoading } = useQuery({
    queryKey: ['detailing', activeProjectId, filters],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const query = { project_id: activeProjectId };
      if (filters.discipline !== 'all') query.discipline = filters.discipline;
      if (filters.assigned_to !== 'all') query.assigned_to = filters.assigned_to;
      if (filters.priority !== 'all') query.priority = filters.priority;
      return await base44.entities.Detailing.filter(query, '-created_date');
    },
    enabled: !!activeProjectId
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, item }) => {
      // Check for design-intent gate
      const requiresApproval = item.design_intent_change || 
                               item.cost_impact > 0 || 
                               item.schedule_impact_days > 0;

      if (requiresApproval && (status === 'approved' || status === 'released')) {
        const user = await base44.auth.me();
        if (user.role !== 'admin' && user.role !== 'project_manager') {
          throw new Error('PM approval required for this item due to design intent change or cost/schedule impact');
        }
        
        return await base44.entities.Detailing.update(id, {
          status,
          pm_approved_by: user.email,
          pm_approved_at: new Date().toISOString(),
          engineer_review_required: false
        });
      }

      return await base44.entities.Detailing.update(id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['detailing']);
      toast.success('Status updated');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Calculate KPIs with null-safety
  const kpis = React.useMemo(() => {
    const total = detailingItems?.length || 0;
    const released = detailingItems?.filter(i => i.status === 'released').length || 0;
    const inReview = detailingItems?.filter(i => i.status === 'review') || [];
    const criticalPastDue = detailingItems?.filter(i => 
      i.priority === 'critical' && 
      i.due_date && 
      new Date(i.due_date) < new Date()
    ).length || 0;

    const reviewTimes = inReview
      .map(i => {
        const created = new Date(i.created_date);
        const now = new Date();
        return (now - created) / (1000 * 60 * 60 * 24);
      })
      .filter(time => !isNaN(time) && isFinite(time));
    
    const avgReviewDays = reviewTimes.length > 0 
      ? Math.round(reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length)
      : 0;

    return {
      percentReleased: total > 0 ? Math.min(100, Math.max(0, Math.round((released / total) * 100))) : 0,
      avgReviewDays: Math.max(0, avgReviewDays),
      criticalPastDue: Math.max(0, criticalPastDue)
    };
  }, [detailingItems]);

  // Group by status
  const columns = {
    not_started: detailingItems.filter(i => i.status === 'not_started'),
    in_progress: detailingItems.filter(i => i.status === 'in_progress'),
    review: detailingItems.filter(i => i.status === 'review'),
    approved: detailingItems.filter(i => i.status === 'approved'),
    released: detailingItems.filter(i => i.status === 'released')
  };

  const statusConfig = {
    not_started: { label: 'Not Started', color: 'bg-zinc-700 text-zinc-300' },
    in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    review: { label: 'Review', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    approved: { label: 'Approved', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    released: { label: 'Released', color: 'bg-green-500/20 text-green-400 border-green-500/30' }
  };

  const priorityColor = {
    low: 'border-zinc-600',
    medium: 'border-blue-500',
    high: 'border-amber-500',
    critical: 'border-red-500'
  };

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <p className="text-zinc-400">Select a project to view detailing items</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* KPI Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">Released for Fab</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{kpis.percentReleased}%</p>
              </div>
              <CheckCircle2 className="text-green-400" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">Avg Days in Review</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{kpis.avgReviewDays}</p>
              </div>
              <Clock className="text-amber-400" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">Critical Past Due</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{kpis.criticalPastDue}</p>
              </div>
              <AlertTriangle className="text-red-400" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-zinc-400" />
              <span className="text-sm text-zinc-400">Filters:</span>
            </div>
            
            <Select value={filters.discipline} onValueChange={(v) => setFilters(f => ({ ...f, discipline: v }))}>
              <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Disciplines</SelectItem>
                <SelectItem value="structural">Structural</SelectItem>
                <SelectItem value="misc_metals">Misc Metals</SelectItem>
                <SelectItem value="stairs">Stairs</SelectItem>
                <SelectItem value="rails">Rails</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priority} onValueChange={(v) => setFilters(f => ({ ...f, priority: v }))}>
              <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {Object.entries(columns).map(([status, items]) => (
          <div key={status} className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className={statusConfig[status].color}>
                {statusConfig[status].label} ({items.length})
              </Badge>
            </div>

            <div className="space-y-2">
              {items.map((item) => {
                const requiresApproval = item.design_intent_change || 
                                        item.cost_impact > 0 || 
                                        item.schedule_impact_days > 0;
                const isPastDue = item.due_date && new Date(item.due_date) < new Date();

                return (
                  <Card 
                    key={item.id} 
                    className={cn(
                      "bg-zinc-800 border-l-4 cursor-pointer hover:bg-zinc-750 transition-colors",
                      priorityColor[item.priority]
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-white line-clamp-2">{item.title}</p>
                          {requiresApproval && (
                            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span className="capitalize">{item.discipline}</span>
                          {item.sheet_number && (
                            <>
                              <span>•</span>
                              <span>{item.sheet_number}</span>
                            </>
                          )}
                        </div>

                        {item.due_date && (
                          <p className={cn(
                            "text-xs",
                            isPastDue ? "text-red-400 font-medium" : "text-zinc-500"
                          )}>
                            Due: {new Date(item.due_date).toLocaleDateString()}
                          </p>
                        )}

                        {item.assigned_to && (
                          <p className="text-xs text-zinc-500">
                            {item.assigned_to.split('@')[0]}
                          </p>
                        )}

                        {/* Status Actions */}
                        <div className="flex gap-1 pt-2 border-t border-zinc-700">
                          {status !== 'released' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7"
                              disabled={updateStatusMutation.isPending}
                              onClick={() => {
                                const nextStatus = {
                                  not_started: 'in_progress',
                                  in_progress: 'review',
                                  review: 'approved',
                                  approved: 'released'
                                }[status];
                                updateStatusMutation.mutate({ id: item.id, status: nextStatus, item });
                              }}
                            >
                              →
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}