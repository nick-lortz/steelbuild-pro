import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BulkEditForm({ taskIds, tasks, onSubmit, onCancel }) {
  const [updates, setUpdates] = useState({
    status: '',
    phase: '',
    progress_percent: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Only submit non-empty values
    const filteredUpdates = {};
    if (updates.status) filteredUpdates.status = updates.status;
    if (updates.phase) filteredUpdates.phase = updates.phase;
    if (updates.progress_percent !== '') filteredUpdates.progress_percent = parseInt(updates.progress_percent);
    
    if (Object.keys(filteredUpdates).length === 0) {
      alert('Please select at least one field to update');
      return;
    }
    
    onSubmit(filteredUpdates);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 bg-zinc-800 rounded-lg">
        <p className="text-sm text-zinc-400">
          Updating {taskIds.length} task(s). Only fields you change will be updated.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={updates.status} onValueChange={(v) => setUpdates({ ...updates, status: v })}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Keep current status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Phase</Label>
        <Select value={updates.phase} onValueChange={(v) => setUpdates({ ...updates, phase: v })}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Keep current phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="detailing">Detailing</SelectItem>
            <SelectItem value="fabrication">Fabrication</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
            <SelectItem value="erection">Erection</SelectItem>
            <SelectItem value="closeout">Closeout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Progress Percent (0-100)</Label>
        <Input
          type="number"
          min="0"
          max="100"
          value={updates.progress_percent}
          onChange={(e) => setUpdates({ ...updates, progress_percent: e.target.value })}
          placeholder="Keep current progress"
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-zinc-700"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          Update {taskIds.length} Task(s)
        </Button>
      </div>
    </form>
  );
}