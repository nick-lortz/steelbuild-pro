import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Loader2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Play, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function ActionItem({ action, onExecute, executing }) {
  const [expanded, setExpanded] = useState(false);

  const riskColor = {
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
  }[action.risk_level || 'low'];

  return (
    <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/50 hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-white">{action.title}</span>
            <Badge className={cn('text-[10px] px-1.5 py-0 border', riskColor)}>
              {action.risk_level || 'low'} risk
            </Badge>
            {action.auto_execute && (
              <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-400 border-blue-500/30">
                auto-eligible
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-400">{action.description}</p>

          {expanded && action.impact && (
            <div className="mt-2 p-2 bg-zinc-900 rounded text-xs border border-zinc-800">
              <span className="text-zinc-500 block mb-1 uppercase tracking-widest text-[10px]">Expected Impact</span>
              <span className="text-zinc-300">{action.impact}</span>
            </div>
          )}

          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-2 text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-0.5 transition-colors"
          >
            {expanded ? <><ChevronUp size={10} /> Less</> : <><ChevronDown size={10} /> Details</>}
          </button>
        </div>

        <Button
          size="sm"
          onClick={() => onExecute(action)}
          disabled={executing}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs flex-shrink-0"
        >
          {executing
            ? <Loader2 size={12} className="animate-spin" />
            : <Play size={12} className="mr-1" />}
          Execute
        </Button>
      </div>
    </div>
  );
}

export default function AutoResolvePanel({ activeProjectId }) {
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [actions, setActions] = useState(null);
  const [executingId, setExecutingId] = useState(null);
  const [executed, setExecuted] = useState([]);

  const scan = async () => {
    setScanning(true);
    try {
      const { data } = await base44.functions.invoke('pmaAutoResolve', {
        project_id: activeProjectId,
        dry_run: true
      });
      setActions(data?.available_actions || data?.actions || []);
      if ((data?.available_actions || data?.actions || []).length === 0) {
        toast.success('No auto-resolvable items found — project looks clean');
      }
    } catch {
      toast.error('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const execute = async (action) => {
    setExecutingId(action.id || action.title);
    try {
      await base44.functions.invoke('pmaAutoResolve', {
        project_id: activeProjectId,
        action_id: action.id,
        action_type: action.action_type,
        entity_id: action.entity_id,
        dry_run: false
      });
      setExecuted(prev => [...prev, action.id || action.title]);
      setActions(prev => prev.filter(a => (a.id || a.title) !== (action.id || action.title)));
      queryClient.invalidateQueries({ queryKey: ['pma-alerts-feed', activeProjectId] });
      queryClient.invalidateQueries({ queryKey: ['pma-risk-data', activeProjectId] });
      toast.success(`Executed: ${action.title}`);
    } catch {
      toast.error('Execution failed');
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-white">Auto-Resolve Engine</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Low-risk actions PMA can execute autonomously</p>
        </div>
        <Button
          size="sm"
          onClick={scan}
          disabled={scanning}
          className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold"
        >
          {scanning
            ? <Loader2 size={12} className="mr-1.5 animate-spin" />
            : <Zap size={12} className="mr-1.5" />}
          Scan for Actions
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!actions && !scanning && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <Zap className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 text-sm mb-2">Ready to scan</p>
            <p className="text-zinc-600 text-xs mb-6 max-w-sm">
              PMA will identify low-risk actions it can execute autonomously — RFI follow-ups, notifications, task updates, and more.
            </p>
            <Button onClick={scan} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
              Scan for Auto-Resolvable Items
            </Button>
          </div>
        )}

        {scanning && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-zinc-400 text-sm">Scanning project data for resolvable items...</p>
          </div>
        )}

        {actions && !scanning && (
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Available</div>
                <div className="text-2xl font-bold text-amber-400 font-mono">{actions.length}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Executed</div>
                <div className="text-2xl font-bold text-green-400 font-mono">{executed.length}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Auto-eligible</div>
                <div className="text-2xl font-bold text-blue-400 font-mono">
                  {actions.filter(a => a.auto_execute).length}
                </div>
              </div>
            </div>

            {actions.length === 0 ? (
              <Card className="bg-green-500/5 border-green-500/20">
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500/50 mx-auto mb-3" />
                  <p className="text-zinc-300 text-sm font-medium">No auto-resolvable actions found</p>
                  <p className="text-zinc-500 text-xs mt-1">Project is in good shape</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={scan}
                    className="mt-4 border-zinc-700 text-xs"
                  >
                    <RefreshCw size={12} className="mr-1.5" />
                    Rescan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs text-zinc-500 uppercase tracking-widest">Available Actions</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={scan}
                    className="border-zinc-700 text-xs h-7"
                  >
                    <RefreshCw size={10} className="mr-1" />
                    Rescan
                  </Button>
                </div>
                <div className="space-y-2">
                  {actions.map((action, i) => (
                    <ActionItem
                      key={action.id || i}
                      action={action}
                      onExecute={execute}
                      executing={executingId === (action.id || action.title)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}