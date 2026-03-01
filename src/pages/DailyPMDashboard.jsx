import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { useAuth } from '@/components/shared/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Clock, Truck, HardHat, Users, AlertCircle, CheckCircle2,
  XCircle, Zap, Loader2, Copy, FileText, Package,
  GitBranch, ShieldCheck, LogIn, LogOut, UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isValid } from 'date-fns';

const daysDiff = (dateStr) => {
  if (!dateStr) return 0;
  try { const d = new Date(dateStr); return isValid(d) ? differenceInDays(new Date(), d) : 0; }
  catch { return 0; }
};

const daysUntil = (dateStr) => {
  if (!dateStr) return 999;
  try { const d = new Date(dateStr); return isValid(d) ? differenceInDays(d, new Date()) : 999; }
  catch { return 999; }
};

function PMWidget({ title, icon: Icon, count, items, loading, color = '#FF9D42', emptyMessage }) {
  return (
    <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 flex flex-col min-h-[220px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color }} />
          <span className="text-sm font-semibold text-[#E5E7EB]">{title}</span>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
          {loading ? '—' : count}
        </span>
      </div>
      <div className="flex-1 space-y-1 max-h-52 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-xs text-[#6B7280]">
            <Loader2 size={12} className="animate-spin" /> Loading...
          </div>
        ) : !items?.length ? (
          <div className="flex items-center gap-2 text-xs text-[#6B7280] py-4">
            <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
            {emptyMessage || 'All clear'}
          </div>
        ) : (
          items.map((item, i) => (
            <div key={i} className="py-1.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#E5E7EB] font-medium truncate">{item.title}</div>
                  {item.sub && <div className="text-[11px] text-[#6B7280] mt-0.5">{item.sub}</div>}
                </div>
                {item.tag && (
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0", item.tagClass)}>
                    {item.tag}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AIActionCard({ title, description, icon: Icon, color, onRun, result, loading }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(result || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-[#E5E7EB]">{title}</div>
          <div className="text-[11px] text-[#6B7280] mt-0.5">{description}</div>
        </div>
      </div>
      <Button size="sm" variant="outline" className="w-full text-xs mb-3" onClick={onRun} disabled={loading}>
        {loading
          ? <><Loader2 size={12} className="animate-spin mr-1.5" />Analyzing...</>
          : <><Zap size={12} className="mr-1.5" />Run Analysis</>}
      </Button>
      {result && (
        <div className="relative">
          <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-lg p-3 text-xs text-[#9CA3AF] whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
            {result}
          </div>
          <button onClick={copy} className="absolute top-2 right-2 text-[#6B7280] hover:text-[#FF9D42] transition-colors">
            <Copy size={11} />
          </button>
          {copied && <span className="absolute top-2 right-6 text-[10px] text-green-400">Copied</span>}
        </div>
      )}
    </div>
  );
}

export default function DailyPMDashboard() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const { user } = useAuth();
  const [aiResults, setAiResults] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const today = new Date();

  const { data: rfis = [], isLoading: rfisLoading } = useQuery({
    queryKey: ['rfis-daily', activeProjectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: changeOrders = [], isLoading: cosLoading } = useQuery({
    queryKey: ['cos-daily', activeProjectId],
    queryFn: () => base44.entities.ChangeOrder.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks-daily', activeProjectId],
    queryFn: () => base44.entities.Task.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: deliveries = [], isLoading: deliveriesLoading } = useQuery({
    queryKey: ['deliveries-daily', activeProjectId],
    queryFn: () => base44.entities.Delivery.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: project } = useQuery({
    queryKey: ['project-daily', activeProjectId],
    queryFn: async () => {
      const results = await base44.entities.Project.filter({ id: activeProjectId });
      return results?.[0] || null;
    },
    enabled: !!activeProjectId,
    staleTime: 10 * 60 * 1000,
  });

  // Widget 1: Aging Approvals
  const agingApprovals = [
    ...rfis
      .filter(r => ['submitted', 'under_review'].includes(r.status) && daysDiff(r.submitted_date) > 7)
      .sort((a, b) => daysDiff(b.submitted_date) - daysDiff(a.submitted_date))
      .map(r => {
        const d = daysDiff(r.submitted_date);
        return {
          title: `RFI #${r.rfi_number}: ${r.subject}`,
          sub: `${d}d open · ${r.ball_in_court?.toUpperCase() || 'UNKNOWN'} ball`,
          tag: `${d}d`,
          tagClass: d > 14 ? 'bg-red-950 text-red-300' : 'bg-amber-950 text-amber-300',
        };
      }),
    ...changeOrders
      .filter(co => ['submitted', 'under_review'].includes(co.status) && daysDiff(co.submitted_date) > 14)
      .map(co => ({
        title: `CO #${co.co_number}: ${co.title}`,
        sub: `$${(co.cost_impact || 0).toLocaleString()} pending`,
        tag: 'CO',
        tagClass: 'bg-orange-950 text-orange-300',
      })),
  ];

  // Widget 2: Fab Blockers
  const fabBlockers = [
    ...rfis
      .filter(r => (r.fab_blocker || r.fabrication_hold || r.is_release_blocker) && !['closed', 'answered'].includes(r.status))
      .map(r => ({
        title: `RFI #${r.rfi_number}: ${r.subject}`,
        sub: r.impact_notes || 'Holding fabrication',
        tag: 'FAB HOLD',
        tagClass: 'bg-red-950 text-red-300',
      })),
    ...tasks
      .filter(t => t.status === 'blocked' && ['fabrication', 'FABRICATION'].includes(t.phase || t.task_type))
      .map(t => ({
        title: t.name || t.title,
        sub: t.cannot_start_reason || 'Task blocked',
        tag: 'BLOCKED',
        tagClass: 'bg-red-950 text-red-300',
      })),
  ];

  // Widget 3: Delivery Risk (next 10 days)
  const deliveryRisk = deliveries
    .filter(d => {
      const dateStr = d.scheduled_date || d.planned_date || d.delivery_date;
      if (!dateStr) return false;
      const days = daysUntil(dateStr);
      return days >= 0 && days <= 10 && !['delivered', 'completed', 'received'].includes(d.status);
    })
    .sort((a, b) => daysUntil(a.scheduled_date || a.planned_date || a.delivery_date) - daysUntil(b.scheduled_date || b.planned_date || b.delivery_date))
    .map(d => {
      const dateStr = d.scheduled_date || d.planned_date || d.delivery_date;
      const days = daysUntil(dateStr);
      return {
        title: d.description || d.load_number || d.title || `Load ${d.id?.slice(-6)}`,
        sub: days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days · ${d.status || 'pending'}`,
        tag: days <= 1 ? 'TODAY' : days <= 3 ? 'CRITICAL' : 'AT RISK',
        tagClass: days <= 1 ? 'bg-red-950 text-red-300' : days <= 3 ? 'bg-orange-950 text-orange-300' : 'bg-amber-950 text-amber-300',
      };
    });

  // Widget 4: Erection-Path RFIs
  const erectionRFIs = rfis
    .filter(r => (r.is_install_blocker || r.affects_sequence || r.schedule_hold_recommended) && !['closed', 'answered'].includes(r.status))
    .map(r => ({
      title: `RFI #${r.rfi_number}: ${r.subject}`,
      sub: r.install_area || r.location_area || r.impact_notes || 'Erection impact',
      tag: r.is_install_blocker ? 'BLOCKER' : 'SEQUENCE',
      tagClass: r.is_install_blocker ? 'bg-red-950 text-red-300' : 'bg-purple-950 text-purple-300',
    }));

  // Widget 5: GC / EOR Roadblocks
  const gcRoadblocks = [
    ...rfis
      .filter(r => ['gc', 'architect', 'engineer', 'external'].includes(r.ball_in_court) && !['closed', 'answered'].includes(r.status))
      .map(r => ({
        title: `RFI #${r.rfi_number}: ${r.subject}`,
        sub: `BIC: ${r.ball_in_court?.toUpperCase()} · ${daysDiff(r.submitted_date)}d waiting`,
        tag: r.ball_in_court?.toUpperCase(),
        tagClass: 'bg-blue-950 text-blue-300',
      })),
    ...changeOrders
      .filter(co => co.status === 'submitted')
      .map(co => ({
        title: `CO #${co.co_number}: ${co.title}`,
        sub: `$${(co.cost_impact || 0).toLocaleString()} · Awaiting GC`,
        tag: 'GC',
        tagClass: 'bg-blue-950 text-blue-300',
      })),
  ];

  const totalFlags = agingApprovals.length + fabBlockers.length + deliveryRisk.length + erectionRFIs.length + gcRoadblocks.length;

  const buildContext = () => `
Project: ${project?.name || activeProjectId}
Phase: ${project?.phase || 'unknown'}
Open RFIs: ${rfis.filter(r => !['closed', 'answered'].includes(r.status)).length}
Pending COs: ${changeOrders.filter(co => ['submitted', 'under_review'].includes(co.status)).length}
Blocked Tasks: ${tasks.filter(t => t.status === 'blocked').length}
In-Progress Tasks: ${tasks.filter(t => t.status === 'in_progress').length}
Fab Blockers: ${fabBlockers.length}
Erection RFIs: ${erectionRFIs.length}
At-Risk Deliveries (10d): ${deliveryRisk.length}
GC Roadblocks: ${gcRoadblocks.length}
  `.trim();

  const runAIAction = async (key, prompt) => {
    setAiLoading(prev => ({ ...prev, [key]: true }));
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${prompt}\n\nProject Context:\n${buildContext()}`,
      });
      setAiResults(prev => ({ ...prev, [key]: result }));
    } finally {
      setAiLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 5 * 60 * 1000,
  });

  if (!activeProjectId) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-[#E5E7EB] tracking-tight">Daily PM Dashboard</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">{format(today, 'EEEE, MMMM d, yyyy')} — Select a project to load your dashboard</p>
        </div>
        <div className="max-w-sm">
          <Select onValueChange={v => setActiveProjectId(v)}>
            <SelectTrigger className="bg-[#0A0A0A] border-[rgba(255,255,255,0.1)] h-10">
              <SelectValue placeholder="Select Project..." />
            </SelectTrigger>
            <SelectContent className="bg-[#0A0A0A] border-[rgba(255,255,255,0.1)]">
              {allProjects.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-sm">{p.project_number} · {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#E5E7EB] tracking-tight">Daily PM Dashboard</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {format(today, 'EEEE, MMMM d, yyyy')} · {project?.name || 'Project'} Intel Snapshot
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalFlags > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950/40 border border-red-800/30 rounded-lg">
              <AlertCircle size={13} className="text-red-400" />
              <span className="text-xs font-semibold text-red-400">{totalFlags} Active Flag{totalFlags !== 1 ? 's' : ''}</span>
            </div>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-lg">
                <UserCircle size={13} className="text-[#FF9D42]" />
                <span className="text-xs text-[#9CA3AF] max-w-[120px] truncate">{user.full_name || user.email}</span>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-red-800/40 text-red-400 hover:bg-red-950/30 hover:text-red-300" onClick={() => base44.auth.logout()}>
                <LogOut size={12} /> Logout
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-[rgba(255,157,66,0.3)] text-[#FF9D42] hover:bg-[rgba(255,157,66,0.1)]" onClick={() => base44.auth.redirectToLogin()}>
              <LogIn size={12} /> Login
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="intel" className="space-y-4">
        <TabsList className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)]">
          <TabsTrigger value="intel" className="text-xs data-[state=active]:bg-[#FF9D42]/10 data-[state=active]:text-[#FF9D42]">
            Intelligence
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs data-[state=active]:bg-[#FF9D42]/10 data-[state=active]:text-[#FF9D42]">
            AI Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intel" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <PMWidget
              title="Aging Approvals"
              icon={Clock}
              count={agingApprovals.length}
              items={agingApprovals}
              loading={rfisLoading || cosLoading}
              color="#F59E0B"
              emptyMessage="No aging approvals"
            />
            <PMWidget
              title="Fabrication Blockers"
              icon={XCircle}
              count={fabBlockers.length}
              items={fabBlockers}
              loading={rfisLoading || tasksLoading}
              color="#EF4444"
              emptyMessage="No fab blockers — clear to release"
            />
            <PMWidget
              title="Delivery Risk (10d)"
              icon={Truck}
              count={deliveryRisk.length}
              items={deliveryRisk}
              loading={deliveriesLoading}
              color="#F97316"
              emptyMessage="No at-risk deliveries"
            />
            <PMWidget
              title="Erection-Path RFIs"
              icon={HardHat}
              count={erectionRFIs.length}
              items={erectionRFIs}
              loading={rfisLoading}
              color="#A855F7"
              emptyMessage="No erection blockers"
            />
            <PMWidget
              title="GC / EOR Roadblocks"
              icon={Users}
              count={gcRoadblocks.length}
              items={gcRoadblocks}
              loading={rfisLoading || cosLoading}
              color="#3B82F6"
              emptyMessage="No GC roadblocks"
            />
          </div>
        </TabsContent>

        <TabsContent value="actions" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AIActionCard
              title="Draft RFI Response"
              description="Generate a field-ready response for the most critical open RFI"
              icon={FileText}
              color="#FF9D42"
              loading={!!aiLoading.rfi}
              result={aiResults.rfi}
              onRun={() => runAIAction('rfi', 'Draft a professional, concise RFI response recommendation for the most critical open RFI affecting erection or fabrication. Use steel industry terminology. Format as ready-to-send.')}
            />
            <AIActionCard
              title="Detect Drawing Mismatches"
              description="Identify likely drawing conflicts and coordination gaps"
              icon={GitBranch}
              color="#A855F7"
              loading={!!aiLoading.mismatch}
              result={aiResults.mismatch}
              onRun={() => runAIAction('mismatch', 'Based on the project context, identify the most likely drawing coordination issues or mismatches that could cause field problems or RFIs. List top 3-5 specific risks with recommended actions.')}
            />
            <AIActionCard
              title="Schedule Impact Analysis"
              description="Analyze how current blockers affect critical path"
              icon={Clock}
              color="#3B82F6"
              loading={!!aiLoading.schedule}
              result={aiResults.schedule}
              onRun={() => runAIAction('schedule', 'Analyze the schedule impact of current blockers and open items. Quantify day-for-day risk to erection completion. Identify the single most critical item to resolve and recommended next steps. Be specific.')}
            />
            <AIActionCard
              title="Procurement Risk"
              description="Assess material exposure from current open RFIs and holds"
              icon={Package}
              color="#F59E0B"
              loading={!!aiLoading.procurement}
              result={aiResults.procurement}
              onRun={() => runAIAction('procurement', 'Analyze procurement and material delivery risk based on current project status. Focus on steel material exposure from open RFIs and fabrication holds. Identify top risks and mitigation steps.')}
            />
            <AIActionCard
              title="Fab Release Recommendation"
              description="Go / No-Go decision support for fabrication release"
              icon={ShieldCheck}
              color="#22C55E"
              loading={!!aiLoading.release}
              result={aiResults.release}
              onRun={() => runAIAction('release', 'Provide a clear Go / No-Go recommendation for fabrication release. List what is resolved, what is outstanding, and the specific conditions that must be met before release authorization. Use steel fabrication terminology.')}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}