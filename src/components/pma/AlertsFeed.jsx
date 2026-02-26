import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, CheckCircle, ChevronDown, ChevronUp, X, RefreshCw, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const SEVERITY_CONFIG = {
  critical: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
  high:     { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  medium:   { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  low:      { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

const TYPE_LABELS = {
  rfi_overdue: 'RFI Overdue',
  rfi_install_blocker: 'Install Blocker',
  schedule_float: 'Critical Path',
  schedule_slippage: 'Schedule Slip',
  fab_chain_gap: 'Fab→Delivery Gap',
  submittal_aging: 'Submittal',
  delivery_sequence: 'Delivery',
  wp_stuck: 'WP Stuck',
  gate_blocked: 'Gate Blocked',
  budget_variance: 'Budget',
  co_pending: 'CO Pending',
};

function AlertCard({ alert, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
  const Icon = config.icon;
  const ago = alert.detected_at
    ? formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })
    : '';

  return (
    <div className={cn('border rounded-lg p-3 transition-all', config.bg)}>
      <div className="flex items-start gap-2.5">
        <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-semibold text-white leading-tight">{alert.title}</span>
            <Badge className={cn('text-[10px] px-1.5 py-0 border', config.badge)}>
              {TYPE_LABELS[alert.alert_type] || alert.alert_type}
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">{alert.message}</p>

          {expanded && alert.recommended_action && (
            <div className="mt-2 p-2 bg-zinc-900/50 rounded text-xs">
              <span className="text-zinc-500 block mb-1 uppercase tracking-widest text-[10px]">Recommended Action</span>
              <span className="text-zinc-300">{alert.recommended_action}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-zinc-600">{ago}</span>
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5 transition-colors"
            >
              {expanded ? <><ChevronUp size={10} /> Less</> : <><ChevronDown size={10} /> Details</>}
            </button>
          </div>
        </div>
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function AlertsFeed({ activeProjectId, onRunMonitor }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [running, setRunning] = useState(false);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['pma-alerts-feed', activeProjectId],
    queryFn: () => base44.entities.Alert.filter({ project_id: activeProjectId, status: 'active' }),
    enabled: !!activeProjectId,
    refetchInterval: 30000
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => base44.entities.Alert.update(id, { status: 'dismissed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pma-alerts-feed', activeProjectId] })
  });

  const handleRunMonitor = async () => {
    setRunning(true);
    try {
      await onRunMonitor();
      queryClient.invalidateQueries({ queryKey: ['pma-alerts-feed', activeProjectId] });
      toast.success('Monitor scan complete');
    } finally {
      setRunning(false);
    }
  };

  const severities = ['critical', 'high', 'medium', 'low'];
  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);
  const sorted = [...filtered].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  const counts = severities.reduce((acc, s) => {
    acc[s] = alerts.filter(a => a.severity === s).length;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-white">Live Alert Feed</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{alerts.length} active alert{alerts.length !== 1 ? 's' : ''}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRunMonitor}
          disabled={running}
          className="border-zinc-700 text-xs"
        >
          {running ? <RefreshCw size={12} className="mr-1.5 animate-spin" /> : <Zap size={12} className="mr-1.5" />}
          Scan Now
        </Button>
      </div>

      {/* Severity filters */}
      <div className="flex gap-1.5 p-3 border-b border-zinc-800 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={cn('text-[10px] px-2 py-1 rounded-full font-medium transition-colors',
            filter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          All ({alerts.length})
        </button>
        {severities.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn('text-[10px] px-2 py-1 rounded-full font-medium transition-colors',
              filter === s ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300',
              counts[s] === 0 && 'opacity-40'
            )}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-zinc-600 text-xs">Loading alerts...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-10 h-10 text-green-500/30 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No active alerts</p>
            <p className="text-xs text-zinc-700 mt-1">Project health nominal</p>
          </div>
        ) : (
          sorted.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={(id) => dismissMutation.mutate(id)}
            />
          ))
        )}
      </div>
    </div>
  );
}