import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, CheckCircle2, Activity, TrendingUp, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingPMA() {
  const navigate = useNavigate();
  const { activeProjectId } = useActiveProject();
  const [isHovered, setIsHovered] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [activeMonitoring, setActiveMonitoring] = useState(true);

  // Real-time risk monitoring
  const { data: riskAlerts = [] } = useQuery({
    queryKey: ['pma-risks', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const alerts = await base44.entities.ExecutionRiskAlert.filter({
        project_id: activeProjectId,
        resolved: false
      });
      return alerts.sort((a, b) => {
        const severity = { critical: 4, high: 3, medium: 2, low: 1 };
        return (severity[b.severity] || 0) - (severity[a.severity] || 0);
      });
    },
    enabled: !!activeProjectId && activeMonitoring,
    refetchInterval: 30000, // 30 seconds
    staleTime: 20000
  });

  // Active gate status
  const { data: gateStatus } = useQuery({
    queryKey: ['pma-gates', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return { blocked: 0, conditional: 0 };
      const gates = await base44.entities.ExecutionGate.filter({
        project_id: activeProjectId
      });
      return {
        blocked: gates.filter(g => g.gate_status === 'blocked').length,
        conditional: gates.filter(g => g.gate_status === 'conditional').length
      };
    },
    enabled: !!activeProjectId && activeMonitoring,
    refetchInterval: 30000
  });

  // Active issues
  const { data: activeIssues } = useQuery({
    queryKey: ['pma-issues', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return { rfis: 0, blockers: 0, overdue: 0 };
      const [rfis, alerts, tasks] = await Promise.all([
        base44.entities.RFI.filter({ project_id: activeProjectId, status: { $in: ['submitted', 'under_review'] } }),
        base44.entities.Alert.filter({ project_id: activeProjectId, status: 'active' }),
        base44.entities.Task.filter({ project_id: activeProjectId, status: { $in: ['in_progress', 'blocked'] } })
      ]);
      const overdueRFIs = rfis.filter(r => {
        if (!r.due_date) return false;
        return new Date(r.due_date) < new Date();
      });
      return {
        rfis: rfis.length,
        blockers: alerts.filter(a => a.severity === 'critical').length,
        overdue: overdueRFIs.length
      };
    },
    enabled: !!activeProjectId && activeMonitoring,
    refetchInterval: 60000
  });

  const handleClick = () => {
    if (showPanel) {
      navigate(createPageUrl('ProjectAssistant'));
    }
    setShowPanel(!showPanel);
  };

  if (!activeProjectId) return null;

  const criticalRisks = riskAlerts.filter(r => r.severity === 'critical').length;
  const highRisks = riskAlerts.filter(r => r.severity === 'high').length;
  const totalIssues = (activeIssues?.blockers || 0) + (activeIssues?.overdue || 0);
  const hasBlockers = (gateStatus?.blocked || 0) > 0;

  const statusColor = criticalRisks > 0 || hasBlockers ? 'red' : 
                      highRisks > 0 || totalIssues > 2 ? 'amber' : 'green';

  return (
    <>
      <motion.button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'w-16 h-16 rounded-full',
          'shadow-lg hover:shadow-xl',
          'flex items-center justify-center',
          'transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
          'group relative',
          statusColor === 'red' && 'bg-gradient-to-br from-red-500 to-red-600 animate-pulse',
          statusColor === 'amber' && 'bg-gradient-to-br from-amber-500 to-orange-600',
          statusColor === 'green' && 'bg-gradient-to-br from-green-500 to-emerald-600'
        )}
        style={{
          boxShadow: isHovered 
            ? `0 0 40px rgba(245, 158, 11, 0.6), 0 20px 40px rgba(0, 0, 0, 0.3)` 
            : `0 0 20px rgba(245, 158, 11, 0.4), 0 10px 25px rgba(0, 0, 0, 0.2)`
        }}
        aria-label="Project Manager Assistant">
        <div className="relative">
          <Sparkles className="w-7 h-7 text-black group-hover:animate-pulse" />
          {(criticalRisks > 0 || totalIssues > 0) && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-black">
              {criticalRisks + totalIssues}
            </motion.div>
          )}
        </div>
        {isHovered && !showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-black/95 text-white text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none backdrop-blur-sm">
            <div className="font-bold mb-1">PMA • Autonomous Mode</div>
            <div className="text-[10px] text-zinc-400">
              {activeMonitoring ? '🟢 Monitoring Active' : '🔴 Standby'}
            </div>
          </motion.div>
        )}
      </motion.button>

      {/* Quick Status Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 z-40 w-80 bg-black/95 backdrop-blur-md border border-amber-500/30 rounded-xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  activeMonitoring ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'
                )} />
                <span className="text-sm font-bold text-white">PMA Command Center</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-zinc-900 border-zinc-700">
                {statusColor === 'red' ? 'CRITICAL' : statusColor === 'amber' ? 'CAUTION' : 'NOMINAL'}
              </Badge>
            </div>

            <div className="space-y-3">
              {/* Risk Summary */}
              <div className="flex items-start gap-3 p-2 bg-zinc-900/50 rounded-lg">
                <AlertTriangle className={cn(
                  'w-4 h-4 mt-0.5',
                  criticalRisks > 0 ? 'text-red-500' : highRisks > 0 ? 'text-amber-500' : 'text-green-500'
                )} />
                <div className="flex-1">
                  <div className="text-xs font-medium text-white mb-1">Active Risks</div>
                  <div className="flex gap-2 text-[10px]">
                    {criticalRisks > 0 && (
                      <span className="text-red-400">{criticalRisks} Critical</span>
                    )}
                    {highRisks > 0 && (
                      <span className="text-amber-400">{highRisks} High</span>
                    )}
                    {criticalRisks === 0 && highRisks === 0 && (
                      <span className="text-green-400">No Critical Risks</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Gate Status */}
              {(gateStatus?.blocked || 0) > 0 && (
                <div className="flex items-start gap-3 p-2 bg-red-900/20 rounded-lg border border-red-500/30">
                  <Zap className="w-4 h-4 mt-0.5 text-red-500" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-white mb-1">Execution Blocked</div>
                    <div className="text-[10px] text-red-400">
                      {gateStatus.blocked} gate(s) require clearance
                    </div>
                  </div>
                </div>
              )}

              {/* Active Issues */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-zinc-900/50 rounded text-center">
                  <div className="text-lg font-bold text-amber-500">{activeIssues?.rfis || 0}</div>
                  <div className="text-[10px] text-zinc-500">RFIs Open</div>
                </div>
                <div className="p-2 bg-zinc-900/50 rounded text-center">
                  <div className="text-lg font-bold text-red-500">{activeIssues?.overdue || 0}</div>
                  <div className="text-[10px] text-zinc-500">Overdue</div>
                </div>
                <div className="p-2 bg-zinc-900/50 rounded text-center">
                  <div className="text-lg font-bold text-orange-500">{activeIssues?.blockers || 0}</div>
                  <div className="text-[10px] text-zinc-500">Blockers</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={() => navigate(createPageUrl('ProjectAssistant'))}
                  className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-lg transition-colors">
                  Full Dashboard
                </button>
                <button
                  onClick={() => setActiveMonitoring(!activeMonitoring)}
                  className={cn(
                    'px-3 py-2 text-xs font-bold rounded-lg transition-colors',
                    activeMonitoring ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  )}>
                  {activeMonitoring ? 'Active' : 'Standby'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}