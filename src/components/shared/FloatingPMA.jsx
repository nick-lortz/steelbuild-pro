import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { useQuery } from '@tanstack/react-query';
import { Brain, AlertTriangle, ChevronRight, Activity, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingPMA() {
  const { activeProjectId } = useActiveProject();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: statusData } = useQuery({
    queryKey: ['pma-float-status', activeProjectId],
    queryFn: async () => {
      const [alerts, gates, rfis] = await Promise.all([
        base44.entities.Alert.filter({ project_id: activeProjectId, status: 'active' }),
        base44.entities.ExecutionGate.filter({ project_id: activeProjectId }),
        base44.entities.RFI.filter({ project_id: activeProjectId })
      ]);

      const criticalCount = alerts.filter(a => a.severity === 'critical').length;
      const highCount = alerts.filter(a => a.severity === 'high').length;
      const blockedGates = gates.filter(g => g.gate_status === 'blocked').length;
      const agingRFIs = rfis.filter(r => {
        if (['closed', 'answered'].includes(r.status)) return false;
        const days = Math.floor((new Date() - new Date(r.created_date)) / 86400000);
        return days >= 14;
      }).length;

      return { criticalCount, highCount, blockedGates, agingRFIs, totalAlerts: alerts.length };
    },
    enabled: !!activeProjectId,
    refetchInterval: 5 * 60 * 1000, // 5 min – was 60s, hammering the DB on every page
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  if (!activeProjectId || dismissed) return null;

  const health = !statusData ? 'nominal'
    : statusData.criticalCount > 0 ? 'critical'
    : statusData.highCount > 2 || statusData.blockedGates > 0 ? 'caution'
    : 'nominal';

  const notifCount = (statusData?.criticalCount || 0) + (statusData?.highCount || 0);

  const colorMap = {
    critical: { bg: 'from-red-600 to-red-800', glow: 'rgba(239,68,68,0.5)', pulse: 'bg-red-400', text: 'text-red-400' },
    caution:  { bg: 'from-amber-500 to-orange-600', glow: 'rgba(251,191,36,0.5)', pulse: 'bg-amber-400', text: 'text-amber-400' },
    nominal:  { bg: 'from-green-500 to-emerald-600', glow: 'rgba(34,197,94,0.4)', pulse: 'bg-green-400', text: 'text-green-400' }
  };
  const c = colorMap[health];

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3 lg:bottom-8">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-72 bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className={`bg-gradient-to-r ${c.bg} p-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white uppercase tracking-widest">PMA Status</span>
              </div>
              <button onClick={() => setExpanded(false)} className="text-white/70 hover:text-white">
                <X size={14} />
              </button>
            </div>

            {statusData && (
              <div className="p-3 space-y-2">
                {[
                  { label: 'Critical Alerts', value: statusData.criticalCount, color: 'text-red-400' },
                  { label: 'High Alerts', value: statusData.highCount, color: 'text-amber-400' },
                  { label: 'Blocked Gates', value: statusData.blockedGates, color: 'text-orange-400' },
                  { label: 'Aging RFIs (14d+)', value: statusData.agingRFIs, color: 'text-yellow-400' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">{item.label}</span>
                    <span className={cn('font-mono font-bold', item.value > 0 ? item.color : 'text-green-400')}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-zinc-800 p-2">
              <button
                onClick={() => navigate(createPageUrl('ProjectAssistant'))}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Activity size={12} />
                  Open Command Center
                </span>
                <ChevronRight size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={() => setExpanded(v => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'relative w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg',
          c.bg
        )}
        style={{ boxShadow: `0 0 24px ${c.glow}` }}
        title="PMA Command Center"
      >
        <Brain className="w-7 h-7 text-white" />

        {/* Pulse ring */}
        {health !== 'nominal' && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ background: c.glow }} />
        )}

        {/* Notification badge */}
        {notifCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-zinc-900">
            {notifCount > 9 ? '9+' : notifCount}
          </span>
        )}
      </motion.button>
    </div>
  );
}