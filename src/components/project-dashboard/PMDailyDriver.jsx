import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AlertTriangle, Clock, FileQuestion, MessageSquareWarning, CheckCircle2, Zap, TrendingUp, Package } from 'lucide-react';
import { format, parseISO, isPast, isWithinInterval, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

const PHASE_COLOR = {
  planning: 'text-zinc-400',
  detailing: 'text-blue-400',
  fabrication: 'text-amber-400',
  erection: 'text-orange-400',
  closeout: 'text-green-400',
};

const STATUS_COLOR = {
  in_progress: 'bg-green-900/40 border-green-700 text-green-300',
  on_hold: 'bg-amber-900/40 border-amber-700 text-amber-300',
  bidding: 'bg-blue-900/40 border-blue-700 text-blue-300',
  awarded: 'bg-purple-900/40 border-purple-700 text-purple-300',
};

export default function PMDailyDriver({ onSelectProject }) {
  const today = new Date();

  const { data: projects = [] } = useQuery({
    queryKey: ['pm-driver-projects'],
    queryFn: () => base44.entities.Project.filter({ status: 'in_progress' }),
    staleTime: 5 * 60 * 1000,
  });

  const projectIds = useMemo(() => projects.map(p => p.id), [projects]);

  const { data: openRFIs = [] } = useQuery({
    queryKey: ['pm-driver-rfis'],
    queryFn: () => base44.entities.RFI.filter({ status: 'submitted' }),
    enabled: projects.length > 0,
    staleTime: 3 * 60 * 1000,
  });

  const { data: recentNotes = [] } = useQuery({
    queryKey: ['pm-driver-notes'],
    queryFn: () => base44.entities.ProductionNote.list('-created_date', 20),
    staleTime: 2 * 60 * 1000,
  });

  const { data: openActions = [] } = useQuery({
    queryKey: ['pm-driver-actions'],
    queryFn: () => base44.entities.ProductionNote.filter({ note_type: 'action', status: 'open' }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['pm-driver-deliveries'],
    queryFn: () => base44.entities.Delivery.filter({ status: 'scheduled' }),
    staleTime: 5 * 60 * 1000,
  });

  // Derived data
  const overdueActions = useMemo(() =>
    openActions.filter(a => a.due_date && isPast(parseISO(a.due_date))),
    [openActions]
  );

  const blockers = useMemo(() =>
    openActions.filter(a => a.category === 'blocker'),
    [openActions]
  );

  const upcomingDeliveries = useMemo(() =>
    deliveries.filter(d => {
      if (!d.scheduled_date) return false;
      const date = parseISO(d.scheduled_date);
      return isWithinInterval(date, { start: today, end: addDays(today, 7) });
    }).slice(0, 5),
    [deliveries]
  );

  const recentActivity = useMemo(() =>
    recentNotes
      .filter(n => n.note_type === 'note')
      .slice(0, 6)
      .map(n => ({
        ...n,
        project: projects.find(p => p.id === n.project_id),
      })),
    [recentNotes, projects]
  );

  const criticalRFIs = useMemo(() =>
    openRFIs
      .filter(r => r.priority === 'critical' || r.fabrication_hold || r.fab_blocker)
      .slice(0, 5),
    [openRFIs]
  );

  const projectMap = useMemo(() => {
    const m = {};
    projects.forEach(p => { m[p.id] = p; });
    return m;
  }, [projects]);

  return (
    <div className="space-y-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          icon={<AlertTriangle size={16} className="text-red-400" />}
          label="Overdue Actions"
          value={overdueActions.length}
          urgent={overdueActions.length > 0}
          color="red"
        />
        <KPICard
          icon={<Zap size={16} className="text-orange-400" />}
          label="Blockers"
          value={blockers.length}
          urgent={blockers.length > 0}
          color="orange"
        />
        <KPICard
          icon={<MessageSquareWarning size={16} className="text-amber-400" />}
          label="Open RFIs"
          value={openRFIs.length}
          color="amber"
        />
        <KPICard
          icon={<Package size={16} className="text-blue-400" />}
          label="Deliveries This Week"
          value={upcomingDeliveries.length}
          color="blue"
        />
      </div>

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Project Status Strip */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <TrendingUp size={14} className="text-amber-400" />
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {projects.length === 0 && <Empty text="No active projects" />}
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => onSelectProject?.(p.id)}
                className="w-full text-left p-2 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium truncate">{p.name}</div>
                  <Badge variant="outline" className={cn('text-[10px] ml-2 shrink-0', PHASE_COLOR[p.phase])}>
                    {p.phase || 'N/A'}
                  </Badge>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{p.project_number}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Open Actions & Blockers */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Clock size={14} className="text-red-400" />
              Open Actions & Blockers
              {overdueActions.length > 0 && (
                <Badge className="bg-red-700 text-[10px] ml-auto">{overdueActions.length} overdue</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {openActions.length === 0 && <Empty text="No open actions" />}
            {[...overdueActions, ...openActions.filter(a => !overdueActions.includes(a))].slice(0, 8).map(a => {
              const isOverdue = overdueActions.includes(a);
              const proj = projectMap[a.project_id];
              return (
                <div key={a.id} className={cn(
                  'p-2 rounded text-xs border',
                  isOverdue ? 'bg-red-900/20 border-red-800' : 'bg-zinc-800 border-zinc-700'
                )}>
                  <div className="font-medium truncate">{a.title || a.body}</div>
                  <div className="flex items-center gap-2 mt-1 text-zinc-500">
                    <span className="truncate">{proj?.name || '—'}</span>
                    {a.due_date && (
                      <span className={cn('shrink-0', isOverdue && 'text-red-400 font-medium')}>
                        Due {format(parseISO(a.due_date), 'MMM d')}
                      </span>
                    )}
                    {a.category === 'blocker' && (
                      <Badge className="bg-orange-800 text-[10px] shrink-0">Blocker</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Activity + Critical RFIs */}
        <div className="space-y-4">
          {/* Critical RFIs */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <FileQuestion size={14} className="text-amber-400" />
                Critical RFIs / Fab Holds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-32 overflow-y-auto">
              {criticalRFIs.length === 0 && <Empty text="No critical RFIs" />}
              {criticalRFIs.map(r => {
                const proj = projectMap[r.project_id];
                return (
                  <div key={r.id} className="p-2 rounded bg-amber-900/20 border border-amber-800 text-xs">
                    <div className="font-medium truncate">{r.subject}</div>
                    <div className="text-zinc-400 mt-0.5 flex items-center gap-2">
                      <span className="truncate">{proj?.name || '—'}</span>
                      {r.fabrication_hold && <Badge className="bg-red-700 text-[10px]">Fab Hold</Badge>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent Notes */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-400" />
                Recent Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-36 overflow-y-auto">
              {recentActivity.length === 0 && <Empty text="No recent notes" />}
              {recentActivity.map(n => (
                <div key={n.id} className="p-2 rounded bg-zinc-800 text-xs">
                  <div className="truncate text-zinc-300">{n.body || n.title}</div>
                  <div className="text-zinc-500 mt-0.5 flex items-center gap-1">
                    <span className="truncate">{n.project?.name || '—'}</span>
                    <span className="shrink-0">· {n.created_date ? format(parseISO(n.created_date), 'MMM d') : ''}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming Deliveries */}
      {upcomingDeliveries.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Package size={14} className="text-blue-400" />
              Deliveries — Next 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {upcomingDeliveries.map(d => {
                const proj = projectMap[d.project_id];
                return (
                  <div key={d.id} className="p-2 rounded bg-zinc-800 border border-zinc-700 text-xs">
                    <div className="font-medium truncate">{d.title || d.load_number || 'Delivery'}</div>
                    <div className="text-zinc-400 mt-1 flex items-center justify-between">
                      <span className="truncate">{proj?.name || '—'}</span>
                      <span className="shrink-0 text-blue-400 font-medium">
                        {d.scheduled_date ? format(parseISO(d.scheduled_date), 'EEE MMM d') : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPICard({ icon, label, value, urgent, color }) {
  const borderColor = urgent
    ? 'border-red-700'
    : color === 'amber' ? 'border-amber-800' : color === 'blue' ? 'border-blue-800' : 'border-zinc-800';

  return (
    <Card className={cn('bg-zinc-900 border', borderColor)}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <div>
          <div className={cn('text-2xl font-bold', urgent && 'text-red-400')}>{value}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Empty({ text }) {
  return <p className="text-xs text-zinc-600 italic text-center py-2">{text}</p>;
}