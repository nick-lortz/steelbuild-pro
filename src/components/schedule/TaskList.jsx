import React from 'react';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { AlertTriangle, FileText } from 'lucide-react';

export default function TaskList({ tasks, projects, resources, drawingSets, onTaskEdit, onTaskUpdate }) {
  const columns = [
    {
      header: 'Task',
      accessor: 'name',
      render: (row) => {
        // Check if task is blocked by drawings
        const requiresFFFPhases = ['fabrication', 'delivery', 'erection'];
        const hasDrawingDeps = row.linked_drawing_set_ids && row.linked_drawing_set_ids.length > 0;
        const isBlocked = hasDrawingDeps && requiresFFFPhases.includes(row.phase) && 
          row.linked_drawing_set_ids.some(id => {
            const drawing = (drawingSets || []).find(d => d.id === id);
            return drawing && drawing.status !== 'FFF';
          });

        return (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{row.is_milestone ? '◆ ' : ''}{row.name}</p>
              {isBlocked && (
                <AlertTriangle size={14} className="text-red-400" title="Blocked by drawings" />
              )}
              {hasDrawingDeps && (
                <FileText size={14} className="text-blue-400" title="Has drawing dependencies" />
              )}
            </div>
            <p className="text-xs text-zinc-500">{row.wbs_code || '-'}</p>
          </div>
        );
      },
    },
    {
      header: 'Project',
      accessor: 'project_id',
      render: (row) => {
        const project = projects.find(p => p.id === row.project_id);
        return project ? (
          <span className="text-sm">{project.project_number}</span>
        ) : '-';
      },
    },
    {
      header: 'Phase',
      accessor: 'phase',
      render: (row) => (
        <Badge variant="outline" className="capitalize">
          {row.phase?.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      header: 'Start Date',
      accessor: 'start_date',
      render: (row) => row.start_date ? format(new Date(row.start_date), 'MMM d, yyyy') : '-',
    },
    {
      header: 'End Date',
      accessor: 'end_date',
      render: (row) => row.end_date ? format(new Date(row.end_date), 'MMM d, yyyy') : '-',
    },
    {
      header: 'Duration',
      accessor: 'duration_days',
      render: (row) => row.duration_days ? `${row.duration_days}d` : '-',
    },
    {
      header: 'Progress',
      accessor: 'progress_percent',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${row.progress_percent || 0}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500">{row.progress_percent || 0}%</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const requiresFFFPhases = ['fabrication', 'delivery', 'erection'];
        const hasDrawingDeps = row.linked_drawing_set_ids && row.linked_drawing_set_ids.length > 0;
        const isBlocked = hasDrawingDeps && requiresFFFPhases.includes(row.phase) && 
          row.linked_drawing_set_ids.some(id => {
            const drawing = (drawingSets || []).find(d => d.id === id);
            return drawing && drawing.status !== 'FFF';
          });

        return isBlocked ? <StatusBadge status="blocked" /> : <StatusBadge status={row.status} />;
      },
    },
    {
      header: 'Float',
      accessor: 'float_days',
      render: (row) => {
        const float = row.float_days || 0;
        return (
          <span className={float === 0 ? 'text-red-400 font-medium' : ''}>
            {float}d
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={tasks}
      onRowClick={onTaskEdit}
      emptyMessage="No tasks found. Add tasks to get started."
    />
  );
}