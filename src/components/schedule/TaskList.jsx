import { useState, useMemo } from 'react';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from 'date-fns';
import { AlertTriangle, FileText, Trash2, Edit } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TaskList({ tasks, projects, resources, drawingSets, onTaskEdit, onTaskUpdate, onBulkDelete, onBulkEdit }) {
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toggleTask = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const toggleAll = () => {
    const validTasks = tasks.filter(t => t && t.id);
    if (selectedTasks.size === validTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(validTasks.map(t => t.id)));
    }
  };

  const confirmBulkDelete = () => {
    onBulkDelete(Array.from(selectedTasks));
    setSelectedTasks(new Set());
    setShowDeleteConfirm(false);
  };

  const handleBulkEdit = () => {
    onBulkEdit(Array.from(selectedTasks));
  };
  // Memoize drawing map for performance
  const drawingMap = useMemo(() => {
    const map = new Map();
    (drawingSets || []).forEach(d => map.set(d.id, d));
    return map;
  }, [drawingSets]);

  const columns = useMemo(() => [
    {
      header: (
        <Checkbox
          checked={selectedTasks.size === tasks.length && tasks.length > 0}
          onCheckedChange={toggleAll}
        />
      ),
      accessor: 'select',
      render: (row) => (
        <Checkbox
          checked={selectedTasks.has(row.id)}
          onCheckedChange={() => toggleTask(row.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      header: 'Task',
      accessor: 'name',
      render: (row) => {
        // Check if task is blocked by drawings - optimized lookup
        const requiresFFFPhases = ['fabrication', 'delivery', 'erection'];
        const hasDrawingDeps = row.linked_drawing_set_ids && row.linked_drawing_set_ids.length > 0;
        const isBlocked = hasDrawingDeps && requiresFFFPhases.includes(row.phase) && 
          row.linked_drawing_set_ids.some(id => {
            const drawing = drawingMap.get(id);
            return drawing && drawing.status !== 'FFF';
          });

        return (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-white">{row.is_milestone ? '◆ ' : ''}{row.name}</p>
              {isBlocked && (
                <AlertTriangle size={14} className="text-red-400" title="Blocked by drawings" />
              )}
              {hasDrawingDeps && (
                <FileText size={14} className="text-blue-400" title="Has drawing dependencies" />
              )}
            </div>
            <p className="text-xs text-zinc-400">{row.wbs_code || '-'}</p>
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
          <span className="text-sm text-white">{project.project_number}</span>
        ) : <span className="text-zinc-400">-</span>;
      },
    },
    {
      header: 'Phase',
      accessor: 'phase',
      render: (row) => (
        <Badge variant="outline" className="capitalize text-white">
          {row.phase?.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      header: 'Start Date',
      accessor: 'start_date',
      render: (row) => <span className="text-white">{row.start_date ? format(new Date(row.start_date), 'MMM d, yyyy') : '-'}</span>,
    },
    {
      header: 'End Date',
      accessor: 'end_date',
      render: (row) => <span className="text-white">{row.end_date ? format(new Date(row.end_date), 'MMM d, yyyy') : '-'}</span>,
    },
    {
      header: 'Duration',
      accessor: 'duration_days',
      render: (row) => <span className="text-white">{row.duration_days ? `${row.duration_days}d` : '-'}</span>,
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
          <span className="text-xs text-zinc-300">{row.progress_percent || 0}%</span>
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
            const drawing = drawingMap.get(id);
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
          <span className={float === 0 ? 'text-red-400 font-medium' : 'text-white'}>
            {float}d
          </span>
        );
      },
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedTasks(new Set([row.id]));
            setShowDeleteConfirm(true);
          }}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <Trash2 size={16} />
        </Button>
      ),
    },
  ], [selectedTasks, tasks.length, toggleAll, drawingMap, projects, resources]);

  return (
    <div className="space-y-4">
      {selectedTasks.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <span className="text-white">{selectedTasks.size} task(s) selected</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkEdit}
              className="border-zinc-700"
            >
              <Edit size={16} className="mr-2" />
              Bulk Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="border-red-700 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
          </div>
        </div>
      )}
      <DataTable
        columns={columns}
        data={tasks}
        onRowClick={onTaskEdit}
        emptyMessage="No tasks found. Add tasks to get started."
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Tasks?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete {selectedTasks.size} selected task(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}