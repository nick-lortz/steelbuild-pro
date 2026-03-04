import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import ProjectSolverChat from '@/components/project-solver/ProjectSolverChat';
import { Bot, FolderOpen, Clock, ChevronRight, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectSolverPage() {
  const { activeProjectId } = useActiveProject();
  const [projects, setProjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activePid, setActivePid] = useState(activeProjectId);
  const [activeSession, setActiveSession] = useState(null); // null = new chat
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    base44.entities.Project.list('-updated_date', 50).then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activePid) return;
    setLoadingSessions(true);
    base44.entities.ProjectSolverSession.filter({ project_id: activePid, status: 'active' }, '-created_date', 20)
      .then(setSessions).catch(() => {}).finally(() => setLoadingSessions(false));
  }, [activePid]);

  async function deleteSession(id, e) {
    e.stopPropagation();
    await base44.entities.ProjectSolverSession.update(id, { status: 'archived' });
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSession?.id === id) setActiveSession(null);
  }

  const selectedProject = projects.find(p => p.id === activePid);

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden" style={{ background: '#0B0D10' }}>
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0D1117' }}>
        {/* Project picker */}
        <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <label className="text-[0.58rem] font-bold tracking-[0.12em] uppercase text-[rgba(255,255,255,0.30)] mb-1.5 block">Project</label>
          <select
            value={activePid || ''}
            onChange={e => { setActivePid(e.target.value); setActiveSession(null); }}
            className="w-full bg-[#14181E] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1.5 text-[0.75rem] text-[rgba(255,255,255,0.80)] focus:outline-none focus:border-[rgba(255,90,31,0.40)]"
          >
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_number} — {p.name}</option>)}
          </select>
        </div>

        {/* New session button */}
        <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={() => setActiveSession(null)} disabled={!activePid}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[0.72rem] font-semibold text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
            style={{ background: 'linear-gradient(90deg,rgba(255,90,31,0.80),rgba(255,122,47,0.60))' }}
          >
            <Plus size={13} /> New Session
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-[0.58rem] font-bold tracking-[0.12em] uppercase text-[rgba(255,255,255,0.25)] px-1 mb-2">Recent Sessions</p>
          {loadingSessions && <p className="text-[0.7rem] text-[rgba(255,255,255,0.25)] px-1">Loading…</p>}
          {sessions.length === 0 && !loadingSessions && (
            <p className="text-[0.7rem] text-[rgba(255,255,255,0.20)] px-1">No sessions yet</p>
          )}
          {sessions.map(s => (
            <div key={s.id} onClick={() => setActiveSession(s)}
              className="group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all mb-0.5"
              style={{
                background: activeSession?.id === s.id ? 'rgba(255,90,31,0.10)' : 'transparent',
                border: `1px solid ${activeSession?.id === s.id ? 'rgba(255,90,31,0.18)' : 'transparent'}`,
              }}
            >
              <Clock size={11} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-[0.72rem] text-[rgba(255,255,255,0.72)] truncate">{s.title || 'Session'}</p>
                <p className="text-[0.6rem] text-[rgba(255,255,255,0.25)]">{s.messages?.length || 0} msgs · {format(new Date(s.created_date), 'MMM d')}</p>
              </div>
              <button onClick={e => deleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 text-[rgba(255,255,255,0.20)] hover:text-[#FF4D4D] transition-all"
              ><Trash2 size={11} /></button>
            </div>
          ))}
        </div>

        {/* Footer branding */}
        <div className="p-3 border-t flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FF5A1F,#FF7A2F)' }}>
            <Bot size={11} className="text-white" />
          </div>
          <span className="text-[0.65rem] font-bold text-[rgba(255,255,255,0.35)] tracking-wide">PROJECTSOLVER AI</span>
        </div>
      </div>

      {/* Chat pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activePid ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,90,31,0.10)', border: '1px solid rgba(255,90,31,0.18)' }}>
              <FolderOpen size={24} style={{ color: '#FF5A1F' }} />
            </div>
            <div>
              <p className="text-[0.875rem] font-bold text-[rgba(255,255,255,0.80)] mb-1">Select a project to start</p>
              <p className="text-[0.75rem] text-[rgba(255,255,255,0.35)] max-w-xs">ProjectSolver links all analysis, RFI drafts, and risks to the selected project.</p>
            </div>
          </div>
        ) : (
          <ProjectSolverChat
            key={`${activePid}-${activeSession?.id || 'new'}`}
            projectId={activePid}
            initialSession={activeSession}
          />
        )}
      </div>
    </div>
  );
}