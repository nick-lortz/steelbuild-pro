import React, { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, AlertTriangle, ArrowUpDown, Pencil, Save, X, Trash2 } from 'lucide-react';
import { format, differenceInDays, isPast, parseISO } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';
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

export default function TaskListView({ tasks, projects, resources, onTaskUpdate, onTaskClick, onTaskDelete }) {
  const [collapsedProjects, setCollapsedProjects] = useState(new Set());
  const [collapsedPhases, setCollapsedPhases] = useState(new Set());
  const [sortBy, setSortBy] = useState('end_date');
  const [sortDir, setSortDir] = useState('asc');
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteTask, setDeleteTask] = useState(null);

  const toggleProject = (projectId) => {
    const newSet = new Set(collapsedProjects);
    newSet.has(projectId) ? newSet.delete(projectId) : newSet.add(projectId);
    setCollapsedProjects(newSet);
  };

  const togglePhase = (key) => {
    const newSet = new Set(collapsedPhases);
    newSet.has(key) ? newSet.delete(key) : newSet.add(key);
    setCollapsedPhases(newSet);
  };

  const getVariance = (task) => {
    if (!task.baseline_end || !task.end_date) return null;
    try {
      const baseline = parseISO(task.baseline_end);
      const current = parseISO(task.end_date);
      return differenceInDays(current, baseline);
    } catch {
      return null;
    }
  };

  const isOverdue = (task) => {
    if (task.status === 'completed' || !task.end_date) return false;
    try {
      return isPast(parseISO(task.end_date));
    } catch {
      return false;
    }
  };

  const isAtRisk = (task) => {
    return isOverdue(task) || task.status === 'blocked' || (task.predecessor_ids?.length > 0 && getVariance(task) > 3);
  };

  const getResourceName = (resourceId) => {
    const resource = resources?.find(r => r.id === resourceId);
    return resource?.name || '-';
  };

  // Group tasks
  const groupedTasks = useMemo(() => {
    const groups = {};
    
    tasks.forEach(task => {
      const projectId = task.project_id || 'unassigned';
      const phase = task.phase || 'unassigned';
      
      if (!groups[projectId]) groups[projectId] = {};
      if (!groups[projectId][phase]) groups[projectId][phase] = [];
      groups[projectId][phase].push(task);
    });

    // Sort tasks within each phase
    Object.values(groups).forEach(projectGroup => {
      Object.values(projectGroup).forEach(phaseTasks => {
        phaseTasks.sort((a, b) => {
          let aVal, bVal;
          
          switch(sortBy) {
            case 'end_date':
              aVal = a.end_date || '9999-12-31';
              bVal = b.end_date || '9999-12-31';
              break;
            case 'variance':
              aVal = getVariance(a) || 0;
              bVal = getVariance(b) || 0;
              break;
            case 'status':
              aVal = a.status || 'zzz';
              bVal = b.status || 'zzz';
              break;
            default:
              aVal = a[sortBy] || '';
              bVal = b[sortBy] || '';
          }
          
          const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return sortDir === 'asc' ? result : -result;
        });
      });
    });

    return groups;
  }, [tasks, sortBy, sortDir]);

  const phases = ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'];
  const phaseLabels = {
    detailing: 'Detailing',
    fabrication: 'Fabrication',
    delivery: 'Delivery',
    erection: 'Erection',
    closeout: 'Closeout'
  };

  const startEdit = (taskId, field, currentValue) => {
    setEditingCell({ taskId, field });
    setEditValue(currentValue || '');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = (task) => {
    if (!editingCell) return;
    
    const updates = { [editingCell.field]: editValue };
    onTaskUpdate(task.id, updates);
    setEditingCell(null);
    setEditValue('');
  };

  const renderCell = (task, field, value) => {
    const isEditing = editingCell?.taskId === task.id && editingCell?.field === field;

    if (isEditing) {
      if (field === 'status') {
        return (
          <div className="flex items-center gap-1">
            <Select value={editValue} onValueChange={setEditValue}>
              <SelectTrigger className="h-7 text-xs border-amber-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveEdit(task)}>
              <Save size={12} className="text-green-400" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
              <X size={12} className="text-red-400" />
            </Button>
          </div>
        );
      }

      if (field === 'assigned_resources') {
        return (
          <div className="flex items-center gap-1">
            <Select value={editValue} onValueChange={setEditValue}>
              <SelectTrigger className="h-7 text-xs border-amber-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resources?.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveEdit(task)}>
              <Save size={12} className="text-green-400" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
              <X size={12} className="text-red-400" />
            </Button>
          </div>
        );
      }

      // Date fields
      return (
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-7 text-xs border-amber-500 w-32"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveEdit(task)}>
            <Save size={12} className="text-green-400" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
            <X size={12} className="text-red-400" />
          </Button>
        </div>
      );
    }

    // Normal view
    return (
      <button
        onClick={() => startEdit(task.id, field, value)}
        className="hover:bg-zinc-800/50 px-1 py-0.5 rounded transition-colors flex items-center gap-1 group"
      >
        <span>{value}</span>
        <Pencil size={10} className="opacity-0 group-hover:opacity-50" />
      </button>
    );
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-900 border-b-2 border-zinc-700 z-10">
              <tr>
                <th className="text-left p-3 text-zinc-300 font-semibold w-80 sticky left-0 bg-zinc-900">
                  TASK
                </th>
                <th className="text-left p-3 text-zinc-300 font-semibold w-28">
                  PHASE
                </th>
                <th className="text-left p-3 text-zinc-300 font-semibold w-32">
                  STATUS
                </th>
                <th className="text-left p-3 text-zinc-300 font-semibold cursor-pointer hover:text-amber-400" onClick={() => toggleSort('start_date')}>
                  <div className="flex items-center gap-1">
                    START
                    {sortBy === 'start_date' && <ArrowUpDown size={12} />}
                  </div>
                </th>
                <th className="text-left p-3 text-zinc-300 font-semibold cursor-pointer hover:text-amber-400" onClick={() => toggleSort('end_date')}>
                  <div className="flex items-center gap-1">
                    FINISH
                    {sortBy === 'end_date' && <ArrowUpDown size={12} />}
                  </div>
                </th>
                <th className="text-left p-3 text-zinc-300 font-semibold">
                  BASELINE
                </th>
                <th className="text-left p-3 text-zinc-300 font-semibold cursor-pointer hover:text-amber-400" onClick={() => toggleSort('variance')}>
                  <div className="flex items-center gap-1">
                    VAR (d)
                    {sortBy === 'variance' && <ArrowUpDown size={12} />}
                  </div>
                </th>
                <th className="text-left p-3 text-zinc-300 font-semibold w-40">
                  RESPONSIBLE
                </th>
                <th className="text-right p-3 text-zinc-300 font-semibold w-16">
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedTasks).map(([projectId, phaseGroups]) => {
                const project = projects.find(p => p.id === projectId) || { name: 'Unassigned', project_number: 'N/A' };
                const isProjectCollapsed = collapsedProjects.has(projectId);
                const projectTasks = Object.values(phaseGroups).flat();
                const completedCount = projectTasks.filter(t => t.status === 'completed').length;
                const atRiskCount = projectTasks.filter(isAtRisk).length;

                return (
                  <React.Fragment key={projectId}>
                    {/* Project Header */}
                    <tr className="bg-zinc-800/70 border-b border-zinc-700">
                      <td colSpan={8} className="p-0">
                        <button
                          onClick={() => toggleProject(projectId)}
                          className="w-full text-left p-3 flex items-center gap-2 hover:bg-zinc-800 transition-colors"
                        >
                          {isProjectCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                          <span className="font-bold text-amber-400">
                            {project.project_number} - {project.name}
                          </span>
                          <span className="text-xs text-zinc-400 ml-2">
                            ({completedCount}/{projectTasks.length} complete)
                          </span>
                          {atRiskCount > 0 && (
                            <span className="ml-auto flex items-center gap-1 text-red-400 text-xs font-semibold">
                              <AlertTriangle size={12} />
                              {atRiskCount} at risk
                            </span>
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Phase Groups */}
                    {!isProjectCollapsed && phases.map(phase => {
                      const phaseTasks = phaseGroups[phase] || [];
                      if (phaseTasks.length === 0) return null;

                      const phaseKey = `${projectId}-${phase}`;
                      const isPhaseCollapsed = collapsedPhases.has(phaseKey);
                      const phaseCompleted = phaseTasks.filter(t => t.status === 'completed').length;
                      const phaseAtRisk = phaseTasks.filter(isAtRisk).length;

                      return (
                        <React.Fragment key={phaseKey}>
                          {/* Phase Header */}
                          <tr className="bg-zinc-800/40 border-b border-zinc-800">
                            <td colSpan={8} className="p-0">
                              <button
                                onClick={() => togglePhase(phaseKey)}
                                className="w-full text-left p-2 pl-8 flex items-center gap-2 hover:bg-zinc-800/60 transition-colors"
                              >
                                {isPhaseCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                <span className="font-semibold text-zinc-300 text-sm">
                                  {phaseLabels[phase]}
                                </span>
                                <span className="text-xs text-zinc-500">
                                  ({phaseCompleted}/{phaseTasks.length})
                                </span>
                                {phaseAtRisk > 0 && (
                                  <span className="flex items-center gap-1 text-red-400 text-xs">
                                    <AlertTriangle size={10} />
                                    {phaseAtRisk}
                                  </span>
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Tasks */}
                          {!isPhaseCollapsed && phaseTasks.map(task => {
                            const variance = getVariance(task);
                            const overdue = isOverdue(task);
                            const atRisk = isAtRisk(task);
                            const completed = task.status === 'completed';
                            const assignedResource = task.assigned_resources?.[0];

                            return (
                              <tr
                                key={task.id}
                                className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${
                                  completed ? 'opacity-60' : ''
                                } ${overdue ? 'bg-red-900/10' : ''}`}
                              >
                                <td className="p-3 sticky left-0 bg-zinc-900">
                                  <button
                                    onClick={() => onTaskClick(task)}
                                    className="text-left hover:text-amber-400 transition-colors flex items-center gap-2"
                                  >
                                    {atRisk && <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                                    {task.is_milestone && <span className="text-amber-400">◆</span>}
                                    <span className={completed ? 'line-through text-zinc-500' : 'text-white'}>
                                      {task.name}
                                    </span>
                                    {task.is_critical && (
                                      <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/40">
                                        CRITICAL
                                      </span>
                                    )}
                                  </button>
                                </td>
                                <td className="p-3 text-zinc-400 text-xs capitalize">
                                  {phase}
                                </td>
                                <td className="p-3">
                                  {renderCell(task, 'status', <StatusBadge status={task.status} />)}
                                </td>
                                <td className="p-3 text-zinc-300 text-xs">
                                  {renderCell(task, 'start_date', task.start_date ? format(parseISO(task.start_date), 'MM/dd/yy') : '-')}
                                </td>
                                <td className={`p-3 text-xs ${overdue ? 'text-red-400 font-semibold' : 'text-zinc-300'}`}>
                                  {renderCell(task, 'end_date', task.end_date ? format(parseISO(task.end_date), 'MM/dd/yy') : '-')}
                                </td>
                                <td className="p-3 text-zinc-500 text-xs">
                                  {task.baseline_end ? format(parseISO(task.baseline_end), 'MM/dd/yy') : '-'}
                                </td>
                                <td className={`p-3 text-xs font-semibold ${
                                  !variance ? 'text-zinc-500' :
                                  variance === 0 ? 'text-green-400' :
                                  variance > 0 ? 'text-red-400' : 'text-green-400'
                                }`}>
                                  {variance !== null ? (variance > 0 ? `+${variance}` : variance) : '-'}
                                </td>
                                <td className="p-3 text-zinc-300 text-xs">
                                  {renderCell(task, 'assigned_resources', assignedResource ? getResourceName(assignedResource) : '-')}
                                </td>
                                <td className="p-3 text-right">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTask(task);
                                    }}
                                    className="h-7 w-7 text-zinc-500 hover:text-red-400"
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <AlertDialog open={!!deleteTask} onOpenChange={() => setDeleteTask(null)}>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Task?</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                Delete "{deleteTask?.name}"? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteTask && onTaskDelete) {
                    onTaskDelete(deleteTask.id);
                  }
                  setDeleteTask(null);
                }}
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}