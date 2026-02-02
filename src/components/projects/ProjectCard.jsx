import React from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Trash2, Settings2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import QuickStatusUpdate from './QuickStatusUpdate';
import ProjectPhaseUpdater from './ProjectPhaseUpdater';

export default function ProjectCard({ project, progress, onClick, onDelete, onEdit, noBorder }) {
  const daysUntilCompletion = project.target_completion 
    ? differenceInDays(new Date(project.target_completion), new Date())
    : null;

  const formatValue = (val) => {
    if (!val) return '—';
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val.toLocaleString()}`;
  };

  return (
    <div 
      className={`group px-6 py-4 hover:bg-zinc-950 cursor-pointer transition-colors ${!noBorder ? 'border-b border-zinc-800' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-6">
        {/* Project Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs text-white font-medium truncate">{project.name}</span>
            <span className="text-[10px] text-zinc-600 font-mono flex-shrink-0">{project.project_number}</span>
          </div>
          {project.client && (
            <span className="text-[10px] text-zinc-600 truncate block">{project.client}</span>
          )}
        </div>

        {/* Phase */}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <ProjectPhaseUpdater project={project} compact />
        </div>

        {/* Status */}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <QuickStatusUpdate project={project} compact />
        </div>

        {/* Value */}
        <div className="text-right flex-shrink-0 w-24">
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">VALUE</div>
          <div className="text-sm font-bold text-white font-mono">
            {formatValue(project.contract_value)}
          </div>
        </div>

        {/* Target */}
        {project.target_completion && (
          <div className="text-right flex-shrink-0 w-24">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">TARGET</div>
            <div className="text-sm font-bold text-white">
              {format(new Date(project.target_completion), 'MMM d')}
            </div>
            {daysUntilCompletion !== null && (
              <div className={`text-[10px] font-mono ${
                daysUntilCompletion < 0 ? 'text-red-500' :
                daysUntilCompletion < 30 ? 'text-amber-500' : 'text-zinc-600'
              }`}>
                {daysUntilCompletion > 0 ? `${daysUntilCompletion}d` : 'LATE'}
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        <div className="flex-shrink-0 w-32">
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">PROGRESS</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-zinc-900">
              <div 
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${progress || 0}%` }}
              />
            </div>
            <span className="text-xs font-mono text-white w-8 text-right">{progress || 0}%</span>
          </div>
        </div>

        {/* PM */}
        {project.project_manager && (
          <div className="text-right flex-shrink-0 w-32">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">PM</div>
            <div className="text-xs text-white truncate">{project.project_manager}</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 text-zinc-600 hover:text-white"
            >
              <Settings2 size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 text-zinc-600 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          )}
          <span className="text-zinc-700 group-hover:text-zinc-500 ml-1">→</span>
        </div>
      </div>
    </div>
  );
}