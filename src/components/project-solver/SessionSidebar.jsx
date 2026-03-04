/**
 * SessionSidebar — left panel: project picker, filters, session list
 */
import React, { useState } from 'react';
import { Bot, Plus, Clock, Trash2, Search, Filter, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

const SEVERITY_COLORS = { critical: '#FF4D4D', high: '#FFB15A', medium: '#4DA3FF', low: '#4DD6A4' };

export default function SessionSidebar({
  projects, sessions, activePid, activeSession,
  loadingSessions, onProjectChange, onNewSession, onSelectSession, onDeleteSession,
}) {
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const filtered = sessions.filter(s => {
    const matchSearch = !search || (s.title || '').toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const selectedProject = projects.find(p => p.id === activePid);

  return (
    <div className="flex flex-col h-full" style={{ background: '#0D1117' }}>
      {/* Brand header */}
      <div className="px-3 pt-3 pb-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#FF5A1F,#FF7A2F)' }}>
            <Bot size={13} className="text-white" />
          </div>
          <div>
            <p className="text-[0.72rem] font-black tracking-[0.04em] text-white">ProjectSolver</p>
            <p className="text-[0.55rem] text-[rgba(255,255,255,0.30)] tracking-wide uppercase">AI Field Assistant</p>
          </div>
        </div>

        {/* Project select */}
        <div className="relative">
          <select
            value={activePid || ''}
            onChange={e => onProjectChange(e.target.value)}
            className="w-full appearance-none bg-[#14181E] border border-[rgba(255,255,255,0.08)] rounded-lg pl-2.5 pr-7 py-1.5 text-[0.72rem] text-[rgba(255,255,255,0.80)] focus:outline-none focus:border-[rgba(255,90,31,0.40)] transition-all"
            aria-label="Select project"
          >
            <option value="">— Select project —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_number ? `${p.project_number} · ` : ''}{p.name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.30)' }} />
        </div>

        {selectedProject && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: { in_progress: '#4DD6A4', on_hold: '#FFB15A', awarded: '#4DA3FF' }[selectedProject.status] || '#6b7280' }} />
            <span className="text-[0.6rem] text-[rgba(255,255,255,0.35)] capitalize truncate">{selectedProject.status?.replace('_', ' ')} · {selectedProject.phase || 'planning'}</span>
          </div>
        )}
      </div>

      {/* New session + search */}
      <div className="px-3 py-2.5 space-y-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button onClick={onNewSession} disabled={!activePid}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[0.72rem] font-bold text-white transition-all disabled:opacity-30 disabled:pointer-events-none hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(90deg,rgba(255,90,31,0.90),rgba(255,122,47,0.70))', boxShadow: '0 0 12px rgba(255,90,31,0.18)' }}
          aria-label="New session"
        >
          <Plus size={13} /> New Session
        </button>

        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.25)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search sessions…"
            className="w-full bg-[#14181E] border border-[rgba(255,255,255,0.07)] rounded-lg pl-7 pr-3 py-1.5 text-[0.72rem] text-[rgba(255,255,255,0.75)] placeholder:text-[rgba(255,255,255,0.20)] focus:outline-none focus:border-[rgba(255,90,31,0.35)] transition-all"
            aria-label="Search sessions"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="flex items-center gap-1 px-1 mb-2">
          <Clock size={9} style={{ color: 'rgba(255,255,255,0.20)' }} />
          <span className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[rgba(255,255,255,0.20)]">Sessions</span>
          {filtered.length > 0 && <span className="ml-auto text-[0.55rem] text-[rgba(255,255,255,0.18)]">{filtered.length}</span>}
        </div>

        {loadingSessions && (
          <div className="flex items-center gap-2 px-2 py-3">
            <div className="w-3 h-3 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin" />
            <span className="text-[0.68rem] text-[rgba(255,255,255,0.25)]">Loading…</span>
          </div>
        )}

        {!loadingSessions && filtered.length === 0 && (
          <p className="text-[0.68rem] text-[rgba(255,255,255,0.20)] px-2 py-3">
            {activePid ? 'No sessions yet. Start a new one.' : 'Select a project above.'}
          </p>
        )}

        <div className="flex flex-col gap-0.5">
          {filtered.map(s => {
            const isActive = activeSession?.id === s.id;
            const msgCount = s.messages?.length || 0;
            const hasIssue = s.generated_outputs?.some(o => o.output_type === 'issue');
            const hasRisk = s.generated_outputs?.some(o => o.output_type === 'risk');

            return (
              <div key={s.id} role="button" tabIndex={0}
                onClick={() => onSelectSession(s)}
                onKeyDown={e => e.key === 'Enter' && onSelectSession(s)}
                className="group flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all"
                style={{
                  background: isActive ? 'rgba(255,90,31,0.10)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(255,90,31,0.20)' : 'transparent'}`,
                }}
                aria-selected={isActive}
                aria-label={`Session: ${s.title || 'Untitled'}`}
              >
                <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: isActive ? 'rgba(255,90,31,0.20)' : 'rgba(255,255,255,0.05)' }}
                >
                  <Bot size={10} style={{ color: isActive ? '#FF5A1F' : 'rgba(255,255,255,0.30)' }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[0.72rem] font-medium leading-snug truncate" style={{ color: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.65)' }}>
                    {s.title || 'Untitled Session'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[0.57rem] text-[rgba(255,255,255,0.22)]">{msgCount} msg{msgCount !== 1 ? 's' : ''}</span>
                    {s.created_date && <span className="text-[0.57rem] text-[rgba(255,255,255,0.18)]">· {format(new Date(s.created_date), 'MMM d')}</span>}
                    {hasIssue && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF4D4D' }} title="Has issues" />}
                    {hasRisk && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FFB15A' }} title="Has risks" />}
                  </div>
                </div>

                <button
                  onClick={e => { e.stopPropagation(); onDeleteSession(s.id); }}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded transition-all hover:text-[#FF4D4D] text-[rgba(255,255,255,0.20)]"
                  aria-label={`Delete session: ${s.title || 'Untitled'}`}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats footer */}
      <div className="px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[0.57rem] text-[rgba(255,255,255,0.20)]">{sessions.length} session{sessions.length !== 1 ? 's' : ''} this project</span>
          <span className="text-[0.57rem] text-[rgba(255,90,31,0.50)]">v2.0</span>
        </div>
      </div>
    </div>
  );
}