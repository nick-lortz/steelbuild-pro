import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertCircle, CheckCircle2, DollarSign, Users } from 'lucide-react';
import { format } from 'date-fns';

const statusColumns = [
  { id: 'not_started', label: 'Not Started', color: 'border-zinc-700' },
  { id: 'in_progress', label: 'In Progress', color: 'border-amber-500' },
  { id: 'completed', label: 'Completed', color: 'border-green-500' },
  { id: 'on_hold', label: 'On Hold', color: 'border-orange-500' },
  { id: 'blocked', label: 'Blocked', color: 'border-red-500' },
];

export default function KanbanView({ tasks, projects, onTaskUpdate, onTaskClick }) {
  const [localTasks, setLocalTasks] = useState(tasks);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    const task = localTasks.find(t => t.id === draggableId);
    if (!task) return;

    const newStatus = destination.droppableId;
    const updatedTask = { ...task, status: newStatus };
    
    // Optimistic update
    setLocalTasks(prev => 
      prev.map(t => t.id === draggableId ? updatedTask : t)
    );

    onTaskUpdate(task.id, { status: newStatus });
  };

  const getTasksByStatus = (status) => {
    return localTasks.filter(t => t.status === status);
  };

  const TaskCard = ({ task, index }) => {
    const project = projects.find(p => p.id === task.project_id);
    const hasSubtasks = localTasks.some(t => t.parent_task_id === task.id);
    const subtaskCount = localTasks.filter(t => t.parent_task_id === task.id).length;
    const completedSubtasks = localTasks.filter(t => t.parent_task_id === task.id && t.status === 'completed').length;
    
    const isOverdue = task.end_date && new Date(task.end_date) < new Date() && task.status !== 'completed';
    const hoursVariance = (task.actual_hours || 0) - (task.estimated_hours || 0);
    const costVariance = (task.actual_cost || 0) - (task.estimated_cost || 0);

    return (
      <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onTaskClick(task)}
          >
            <Card 
              className={`mb-3 cursor-pointer transition-all hover:shadow-lg ${
                snapshot.isDragging ? 'shadow-xl ring-2 ring-amber-500' : ''
              } ${
                task.status === 'completed' ? 'border-green-500/30 bg-zinc-900/50 opacity-75' : 
                isOverdue ? 'border-red-500/30 bg-zinc-900' : 
                'border-zinc-800 bg-zinc-900'
              }`}
            >
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {task.status === 'completed' && (
                        <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                      )}
                      <h4 className={`font-medium text-sm line-clamp-2 ${task.status === 'completed' ? 'line-through text-zinc-500' : 'text-white'}`}>
                        {task.name}
                      </h4>
                    </div>
                    {task.is_milestone && (
                      <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30 flex-shrink-0">
                        Milestone
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">{project?.name}</p>
                </div>

                {/* Progress */}
                {(task.progress_percent > 0 || task.status === 'completed') && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Progress</span>
                      <span className={`font-medium ${task.status === 'completed' ? 'text-green-500' : 'text-amber-500'}`}>
                        {task.status === 'completed' ? '✓ Complete' : `${task.progress_percent}%`}
                      </span>
                    </div>
                    <Progress 
                      value={task.status === 'completed' ? 100 : task.progress_percent} 
                      className={`h-1.5 ${task.status === 'completed' ? '[&>div]:bg-green-500' : ''}`}
                    />
                  </div>
                )}

                {/* Subtasks */}
                {hasSubtasks && (
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 size={12} className="text-zinc-500" />
                    <span className="text-zinc-400">
                      {completedSubtasks}/{subtaskCount} subtasks
                    </span>
                  </div>
                )}

                {/* Dates */}
                <div className="flex items-center gap-2 text-xs">
                  <Clock size={12} className={isOverdue ? 'text-red-400' : 'text-zinc-500'} />
                  <span className={isOverdue ? 'text-red-400' : 'text-zinc-400'}>
                    {format(new Date(task.end_date), 'MMM d')}
                    {isOverdue && ' (Overdue)'}
                  </span>
                </div>

                {/* Time Tracking */}
                {(task.estimated_hours > 0 || task.actual_hours > 0) && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-zinc-500" />
                      <span className="text-zinc-400">
                        {task.actual_hours || 0}h / {task.estimated_hours || 0}h
                      </span>
                    </div>
                    {hoursVariance !== 0 && (
                      <span className={hoursVariance > 0 ? 'text-red-400' : 'text-green-400'}>
                        {hoursVariance > 0 ? '+' : ''}{hoursVariance}h
                      </span>
                    )}
                  </div>
                )}

                {/* Cost Tracking */}
                {(task.estimated_cost > 0 || task.actual_cost > 0) && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <DollarSign size={12} className="text-zinc-500" />
                      <span className="text-zinc-400">
                        ${(task.actual_cost || 0).toLocaleString()} / ${(task.estimated_cost || 0).toLocaleString()}
                      </span>
                    </div>
                    {costVariance !== 0 && (
                      <span className={costVariance > 0 ? 'text-red-400' : 'text-green-400'}>
                        {costVariance > 0 ? '+' : ''}${Math.abs(costVariance).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}

                {/* Resources */}
                {(task.assigned_resources?.length > 0 || task.assigned_equipment?.length > 0) && (
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Users size={12} />
                    <span>
                      {(task.assigned_resources?.length || 0) + (task.assigned_equipment?.length || 0)} assigned
                    </span>
                  </div>
                )}

                {/* Phase Badge */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize text-white">
                    {task.phase}
                  </Badge>
                  {(task.linked_rfi_ids?.length > 0 || task.linked_co_ids?.length > 0) && (
                    <AlertCircle size={12} className="text-amber-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusColumns.map(column => {
          const columnTasks = getTasksByStatus(column.id);
          
          return (
            <div key={column.id} className="flex-shrink-0 w-80">
              <div className={`border-t-2 ${column.color} bg-zinc-900/50 rounded-lg p-4`}>
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">{column.label}</h3>
                  <Badge variant="outline" className="bg-zinc-800">
                    {columnTasks.length}
                  </Badge>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] space-y-2 ${
                        snapshot.isDraggingOver ? 'bg-zinc-800/50 rounded-lg' : ''
                      }`}
                    >
                      {columnTasks.map((task, index) => (
                        <TaskCard key={task.id} task={task} index={index} />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}