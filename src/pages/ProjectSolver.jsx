import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import SessionSidebar from '@/components/project-solver/SessionSidebar';
import ProjectSolverChat from '@/components/project-solver/ProjectSolverChat';
import ContextPanel from '@/components/project-solver/ContextPanel';
import { Bot, PanelRight, PanelRightClose } from 'lucide-react';

export default function ProjectSolverPage() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [projects, setProjects]           = useState([]);
  const [sessions, setSessions]           = useState([]);
  const [activePid, setActivePid]         = useState(activeProjectId || '');
  const [activeSession, setActiveSession] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(true);

  // Context panel state — driven by messages from the chat
  const [activeIssue, setActiveIssue]       = useState(null);
  const [activeRiskScore, setActiveRiskScore] = useState(0);
  const [activeProposals, setActiveProposals] = useState([]);
  const [activeCODraft, setActiveCODraft]   = useState(null);

  // Load projects once
  useEffect(() => {
    base44.entities.Project.list('-updated_date', 50).then(setProjects).catch(() => {});
  }, []);

  // Load sessions when project changes
  useEffect(() => {
    if (!activePid) { setSessions([]); return; }
    setLoadingSessions(true);
    setActiveSession(null);
    base44.entities.ProjectSolverSession
      .filter({ project_id: activePid, status: 'active' }, '-created_date', 30)
      .then(setSessions).catch(() => {}).finally(() => setLoadingSessions(false));
  }, [activePid]);

  function handleProjectChange(pid) {
    setActivePid(pid);
    setActiveIssue(null);
    setActiveRiskScore(0);
    setActiveProposals([]);
    setActiveCODraft(null);
  }

  function handleNewSession() {
    setActiveSession(null);
    setActiveIssue(null);
    setActiveRiskScore(0);
    setActiveProposals([]);
    setActiveCODraft(null);
  }

  function handleSelectSession(s) {
    setActiveSession(s);
    // Restore context from session's last generated outputs
    const outputs = s.generated_outputs || [];
    const lastIssue = outputs.slice().reverse().find(o => o.output_type === 'issue');
    const lastRisk  = outputs.slice().reverse().find(o => o.output_type === 'risk');
    const solutions = outputs.filter(o => o.output_type === 'solution').slice(-3).map(o => o.payload);
    const lastCO    = outputs.slice().reverse().find(o => o.output_type === 'co_draft');

    setActiveIssue(lastIssue?.payload || null);
    setActiveRiskScore(lastRisk?.payload?.risk_score || 0);
    setActiveProposals(solutions);
    setActiveCODraft(lastCO?.payload || null);
  }

  async function handleDeleteSession(id) {
    await base44.entities.ProjectSolverSession.update(id, { status: 'archived' });
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSession?.id === id) handleNewSession();
  }

  // Called by chat when a new structured output arrives
  const handleStructuredOutput = useCallback((output, sessionId) => {
    if (!output) return;
    if (output.type === 'issue') {
      setActiveIssue(output);
      setShowContextPanel(true);
    }
    if (output.type === 'risk') {
      setActiveRiskScore(output.risk_score || 0);
      setShowContextPanel(true);
    }
    if (output.type === 'solution') {
      setActiveProposals(prev => {
        const next = [output, ...prev.filter(p => p.title !== output.title)].slice(0, 3);
        return next;
      });
      setShowContextPanel(true);
    }
    if (output.type === 'co_draft') {
      setActiveCODraft(output);
      setShowContextPanel(true);
    }
  }, []);

  // Called by session created/updated in chat
  const handleSessionCreated = useCallback((session) => {
    setSessions(prev => {
      const exists = prev.find(s => s.id === session.id);
      if (exists) return prev.map(s => s.id === session.id ? { ...s, ...session } : s);
      return [session, ...prev];
    });
    setActiveSession(session);
  }, []);

  function handleQuickAction(actionId, payload) {
    // These would navigate or open modals in a full implementation
    // For now: promote CO opens the live CO form
    if (actionId === 'promote_co' && payload) {
      base44.entities.ChangeOrder.create({
        project_id: activePid,
        co_number: Date.now(),
        title: payload.title,
        description: payload.description,
        cost_impact: payload.cost_impact || 0,
        schedule_impact_days: payload.schedule_impact_days || 0,
        status: 'draft',
      }).catch(() => {});
    }
  }

  const noProject = !activePid;

  return (
    <div
      className="flex overflow-hidden"
      style={{ height: 'calc(100vh - 64px)', background: '#000000' }}
      role="main"
      aria-label="ProjectSolver AI Assistant"
    >
      {/* ── Left: Session Sidebar (240px) ── */}
      <div className="w-[240px] flex-shrink-0 border-r" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <SessionSidebar
          projects={projects}
          sessions={sessions}
          activePid={activePid}
          activeSession={activeSession}
          loadingSessions={loadingSessions}
          onProjectChange={handleProjectChange}
          onNewSession={handleNewSession}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      {/* ── Center: Chat ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FF5A1F,#FF7A2F)' }}>
              <Bot size={12} className="text-white" />
            </div>
            <div>
              <p className="text-[0.78rem] font-bold text-[rgba(255,255,255,0.92)] leading-none">ProjectSolver</p>
              <p className="text-[0.57rem] text-[rgba(255,255,255,0.30)] mt-0.5">
                {activeSession ? activeSession.title || 'Active session' : 'New session'}
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {activePid && (
              <span className="text-[0.6rem] text-[rgba(255,255,255,0.25)] hidden sm:block">
                {projects.find(p => p.id === activePid)?.name}
              </span>
            )}
            <button
              onClick={() => setShowContextPanel(p => !p)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[0.65rem] transition-all"
              style={{
                background: showContextPanel ? 'rgba(255,90,31,0.12)' : 'rgba(255,255,255,0.04)',
                color: showContextPanel ? '#FF5A1F' : 'rgba(255,255,255,0.40)',
                border: `1px solid ${showContextPanel ? 'rgba(255,90,31,0.20)' : 'rgba(255,255,255,0.07)'}`,
              }}
              aria-label={showContextPanel ? 'Hide context panel' : 'Show context panel'}
              aria-pressed={showContextPanel}
            >
              {showContextPanel ? <PanelRightClose size={13} /> : <PanelRight size={13} />}
              <span className="hidden md:inline">Context</span>
            </button>
          </div>
        </div>

        {/* Chat content */}
        {noProject ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,90,31,0.08)', border: '1px solid rgba(255,90,31,0.15)' }}>
              <Bot size={26} style={{ color: '#FF5A1F' }} />
            </div>
            <div>
              <p className="text-[0.9rem] font-bold text-[rgba(255,255,255,0.80)] mb-2">Select a project to begin</p>
              <p className="text-[0.75rem] text-[rgba(255,255,255,0.30)] max-w-xs">
                ProjectSolver links issues, RFI drafts, risks, and solutions directly to your project record.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-sm w-full text-left">
              {['Upload a drawing for connection review', 'Analyze erection sequence risks', 'Draft an RFI from a field photo', 'Identify CO entitlement from an RFI'].map(t => (
                <div key={t} className="px-3 py-2.5 rounded-xl text-[0.68rem] text-[rgba(255,255,255,0.40)]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {t}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ProjectSolverChat
            key={`${activePid}-${activeSession?.id || 'new'}`}
            projectId={activePid}
            initialSession={activeSession}
            onStructuredOutput={handleStructuredOutput}
            onSessionCreated={handleSessionCreated}
          />
        )}
      </div>

      {/* ── Right: Context Panel (280px) ── */}
      {showContextPanel && (
        <div className="w-[280px] flex-shrink-0 border-l flex flex-col overflow-hidden"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0A0C10' }}
          aria-label="Issue context panel"
        >
          <div className="px-3 py-2.5 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-[0.58rem] font-bold tracking-[0.12em] uppercase text-[rgba(255,255,255,0.25)]">Context · Active Issue</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ContextPanel
              issue={activeIssue}
              riskScore={activeRiskScore}
              proposals={activeProposals}
              coDraft={activeCODraft}
              projectId={activePid}
              onQuickAction={handleQuickAction}
            />
          </div>
        </div>
      )}
    </div>
  );
}