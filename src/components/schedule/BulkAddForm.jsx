import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from 'lucide-react';

export default function BulkAddForm({ projects, onSubmit, onCancel, isLoading }) {
  const [selectedProject, setSelectedProject] = useState('');
  const [tasks, setTasks] = useState([
  { name: '', phase: 'fabrication', start_date: '', end_date: '', duration_days: 1 }]
  );

  const addTask = () => {
    setTasks([
    ...tasks,
    { name: '', phase: 'fabrication', start_date: '', end_date: '', duration_days: 1 }]
    );
  };

  const removeTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index, field, value) => {
    const updated = [...tasks];
    updated[index][field] = value;

    // Auto-calculate end_date if start_date and duration_days are set
    if ((field === 'start_date' || field === 'duration_days') && updated[index].start_date && updated[index].duration_days) {
      const startDate = new Date(updated[index].start_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + parseInt(updated[index].duration_days || 0));
      updated[index].end_date = endDate.toISOString().split('T')[0];
    }

    setTasks(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedProject) {
      alert('Please select a project');
      return;
    }

    const validTasks = tasks.filter((t) => t.name && t.start_date && t.end_date);

    if (validTasks.length === 0) {
      alert('Please add at least one valid task (name, start date, end date required)');
      return;
    }

    const tasksData = validTasks.map((t) => ({
      project_id: selectedProject,
      name: t.name,
      phase: t.phase,
      start_date: t.start_date,
      end_date: t.end_date,
      duration_days: parseInt(t.duration_days) || 1,
      status: 'not_started',
      progress_percent: 0,
      is_milestone: false
    }));

    onSubmit(tasksData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Project *</Label>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) =>
            <SelectItem key={p.id} value={p.id}>
                {p.project_number} - {p.name}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Tasks</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTask} className="bg-background text-slate-950 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:bg-accent hover:text-accent-foreground h-8 border-zinc-700">


            <Plus size={14} className="mr-1" />
            Add Row
          </Button>
        </div>

        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800 sticky top-0">
                <tr>
                  <th className="text-left p-2 text-zinc-400 font-medium">Task Name *</th>
                  <th className="text-left p-2 text-zinc-400 font-medium">Phase</th>
                  <th className="text-left p-2 text-zinc-400 font-medium">Start Date *</th>
                  <th className="text-left p-2 text-zinc-400 font-medium">Duration (days)</th>
                  <th className="text-left p-2 text-zinc-400 font-medium">End Date *</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, idx) =>
                <tr key={idx} className="border-t border-zinc-800">
                    <td className="p-2">
                      <Input
                      value={task.name}
                      onChange={(e) => updateTask(idx, 'name', e.target.value)}
                      placeholder="Task name"
                      className="bg-zinc-900 border-zinc-700 h-8 text-sm" />

                    </td>
                    <td className="p-2">
                      <Select
                      value={task.phase}
                      onValueChange={(v) => updateTask(idx, 'phase', v)}>

                        <SelectTrigger className="bg-zinc-900 border-zinc-700 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="detailing">Detailing</SelectItem>
                          <SelectItem value="fabrication">Fabrication</SelectItem>
                          <SelectItem value="delivery">Delivery</SelectItem>
                          <SelectItem value="erection">Erection</SelectItem>
                          <SelectItem value="closeout">Closeout</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Input
                      type="date"
                      value={task.start_date}
                      onChange={(e) => updateTask(idx, 'start_date', e.target.value)}
                      className="bg-zinc-900 border-zinc-700 h-8 text-sm" />

                    </td>
                    <td className="p-2">
                      <Input
                      type="number"
                      min="1"
                      value={task.duration_days}
                      onChange={(e) => updateTask(idx, 'duration_days', e.target.value)}
                      className="bg-zinc-900 border-zinc-700 h-8 text-sm w-20" />

                    </td>
                    <td className="p-2">
                      <Input
                      type="date"
                      value={task.end_date}
                      onChange={(e) => updateTask(idx, 'end_date', e.target.value)}
                      className="bg-zinc-900 border-zinc-700 h-8 text-sm" />

                    </td>
                    <td className="p-2">
                      <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTask(idx)}
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      disabled={tasks.length === 1}>

                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel} className="bg-background text-slate-950 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:bg-accent hover:text-accent-foreground h-9 border-zinc-700">


          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-500 hover:bg-amber-600 text-black">

          {isLoading ? 'Creating...' : `Create ${tasks.filter((t) => t.name).length} Task(s)`}
        </Button>
      </div>
    </form>);

}