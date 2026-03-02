import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Paperclip } from 'lucide-react';

export default function NoteComposer({ projectId, weekId, noteType = 'note', onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    week_id: weekId,
    note_type: noteType,
    title: '',
    body: '',
    category: 'general',
    priority: 'normal',
    owner_email: '',
    due_date: '',
    status: 'open',
    tags: []
  });

  const handleSubmit = () => {
    if (!formData.body) return;
    onSubmit(formData);
  };

  return (
    <Card className="bg-zinc-900 border-zinc-700">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge>{noteType === 'action' ? 'Action Item' : noteType === 'decision' ? 'Decision' : 'Note'}</Badge>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X size={14} />
          </Button>
        </div>

        {noteType !== 'note' && (
          <Input
            placeholder="Title/summary"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="bg-zinc-800 border-zinc-700"
          />
        )}

        <Textarea
          placeholder={noteType === 'action' ? 'What needs to be done?' : 'Add note...'}
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          className="bg-zinc-800 border-zinc-700 h-24"
        />

        <div className="grid grid-cols-3 gap-2">
          <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="shop">Shop</SelectItem>
              <SelectItem value="field">Field</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="safety">Safety</SelectItem>
              <SelectItem value="qc">QC</SelectItem>
            </SelectContent>
          </Select>

          <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          {noteType === 'action' && (
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-xs"
            />
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button 
            size="sm" 
            onClick={handleSubmit}
            disabled={!formData.body}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}