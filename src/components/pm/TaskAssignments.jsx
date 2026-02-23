import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function TaskAssignments({ projectId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({ project_id: projectId });
      return tasks.sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
    },
    enabled: !!projectId
  });

  const assignees = React.useMemo(() => {
    if (!tasks) return [];
    const uniqueAssignees = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];
    return uniqueAssignees;
  }, [tasks]);

  const filteredTasks = React.useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(task => {
      const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAssignee = filterAssignee === 'all' || task.assigned_to === filterAssignee;
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      return matchesSearch && matchesAssignee && matchesStatus;
    });
  }, [tasks, searchQuery, filterAssignee, filterStatus]);

  const groupedByAssignee = React.useMemo(() => {
    const grouped = {};
    filteredTasks.forEach(task => {
      const assignee = task.assigned_to || 'Unassigned';
      if (!grouped[assignee]) grouped[assignee] = [];
      grouped[assignee].push(task);
    });
    return grouped;
  }, [filteredTasks]);

  const statusColors = {
    not_started: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
    in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    on_hold: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    completed: 'text-green-400 bg-green-500/10 border-green-500/30',
    cancelled: 'text-red-400 bg-red-500/10 border-red-500/30'
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Task Assignments</CardTitle>
            <Link to={createPageUrl('ResourceManagement')}>
              <Button variant="outline" size="sm">
                <User className="w-4 h-4 mr-2" />
                Manage Resources
              </Button>
            </Link>
          </div>
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700"
              />
            </div>
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-full md:w-48 bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Filter by assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {assignees.map(assignee => (
                  <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48 bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.keys(groupedByAssignee).length === 0 ? (
            <div className="text-center py-12 text-[#9CA3AF]">
              <p>No tasks found</p>
            </div>
          ) : (
            Object.entries(groupedByAssignee).map(([assignee, assigneeTasks]) => (
              <div key={assignee} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[rgba(255,255,255,0.05)]">
                  <User className="w-4 h-4 text-[#FF9D42]" />
                  <h3 className="font-semibold text-white">{assignee}</h3>
                  <Badge variant="outline" className="ml-auto">
                    {assigneeTasks.length} tasks
                  </Badge>
                </div>
                <div className="space-y-2">
                  {assigneeTasks.map(task => (
                    <Link
                      key={task.id}
                      to={createPageUrl('Schedule') + `?project=${projectId}&task=${task.id}`}
                      className="block p-3 rounded-lg border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,157,66,0.2)] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white">{task.title}</span>
                            <Badge variant="outline" className={statusColors[task.status]}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          {task.end_date && (
                            <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                              <Calendar className="w-3 h-3" />
                              <span>Due: {format(new Date(task.end_date), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}