import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Plus, Calendar, CheckCircle, Clock, Users } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from 'date-fns';

const initialFormState = {
  project_id: '',
  title: '',
  meeting_date: '',
  duration_minutes: '',
  location: '',
  attendees: [],
  notes: '',
  action_items: [],
};

export default function Meetings() {
  const [showForm, setShowForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [newActionItem, setNewActionItem] = useState({ item: '', assignee: '', due_date: '', status: 'pending' });

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list('-meeting_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Meeting.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setShowForm(false);
      setFormData(initialFormState);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Meeting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setSelectedMeeting(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      duration_minutes: parseInt(formData.duration_minutes) || 0,
    };

    if (selectedMeeting) {
      updateMutation.mutate({ id: selectedMeeting.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (meeting) => {
    setFormData({
      project_id: meeting.project_id || '',
      title: meeting.title || '',
      meeting_date: meeting.meeting_date || '',
      duration_minutes: meeting.duration_minutes?.toString() || '',
      location: meeting.location || '',
      attendees: meeting.attendees || [],
      notes: meeting.notes || '',
      action_items: meeting.action_items || [],
    });
    setSelectedMeeting(meeting);
  };

  const addActionItem = () => {
    if (!newActionItem.item) return;
    setFormData(prev => ({
      ...prev,
      action_items: [...prev.action_items, { ...newActionItem }]
    }));
    setNewActionItem({ item: '', assignee: '', due_date: '', status: 'pending' });
  };

  const toggleActionStatus = (index) => {
    const updated = [...formData.action_items];
    updated[index].status = updated[index].status === 'completed' ? 'pending' : 'completed';
    setFormData(prev => ({ ...prev, action_items: updated }));
  };

  const columns = [
    {
      header: 'Meeting',
      accessor: 'title',
      render: (row) => {
        const project = projects.find(p => p.id === row.project_id);
        return (
          <div>
            <p className="font-medium">{row.title}</p>
            <p className="text-xs text-zinc-500">{project?.name}</p>
          </div>
        );
      },
    },
    {
      header: 'Date & Time',
      accessor: 'meeting_date',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-zinc-500" />
          <span>{format(new Date(row.meeting_date), 'MMM d, yyyy h:mm a')}</span>
        </div>
      ),
    },
    {
      header: 'Duration',
      accessor: 'duration_minutes',
      render: (row) => row.duration_minutes ? `${row.duration_minutes}m` : '-',
    },
    {
      header: 'Attendees',
      accessor: 'attendees',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Users size={14} className="text-zinc-500" />
          <span>{row.attendees?.length || 0}</span>
        </div>
      ),
    },
    {
      header: 'Action Items',
      render: (row) => {
        const total = row.action_items?.length || 0;
        const completed = row.action_items?.filter(a => a.status === 'completed').length || 0;
        return (
          <div className="flex items-center gap-2">
            {total > 0 ? (
              <>
                <Badge variant="outline" className={completed === total ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}>
                  {completed}/{total}
                </Badge>
              </>
            ) : (
              <span className="text-zinc-500 text-sm">None</span>
            )}
          </div>
        );
      },
    },
  ];

  const allActionItems = meetings.flatMap(m => 
    (m.action_items || []).map(ai => ({ ...ai, meetingTitle: m.title, meetingId: m.id }))
  );
  const pendingActions = allActionItems.filter(a => a.status !== 'completed');

  return (
    <div>
      <PageHeader
        title="Meetings"
        subtitle="Track meetings and action items"
        actions={
          <Button 
            onClick={() => {
              setFormData(initialFormState);
              setShowForm(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            <Plus size={18} className="mr-2" />
            New Meeting
          </Button>
        }
      />

      {/* Action Items Summary */}
      {pendingActions.length > 0 && (
        <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <h3 className="text-sm font-medium text-amber-400 mb-3">Pending Action Items ({pendingActions.length})</h3>
          <div className="space-y-2">
            {pendingActions.slice(0, 5).map((action, idx) => (
              <div key={idx} className="flex items-start justify-between text-sm">
                <div className="flex-1">
                  <p className="text-white">{action.item}</p>
                  <p className="text-xs text-zinc-500">{action.meetingTitle} • {action.assignee}</p>
                </div>
                {action.due_date && (
                  <span className="text-xs text-amber-400">
                    Due: {format(new Date(action.due_date), 'MMM d')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={meetings}
        onRowClick={handleEdit}
        emptyMessage="No meetings found. Schedule your first meeting to get started."
      />

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Meeting</DialogTitle>
          </DialogHeader>
          <MeetingForm
            formData={formData}
            setFormData={setFormData}
            projects={projects}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
            newActionItem={newActionItem}
            setNewActionItem={setNewActionItem}
            addActionItem={addActionItem}
            toggleActionStatus={toggleActionStatus}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Sheet */}
      <Sheet open={!!selectedMeeting} onOpenChange={(open) => !open && setSelectedMeeting(null)}>
        <SheetContent className="w-full sm:max-w-2xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Meeting Details</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <MeetingForm
              formData={formData}
              setFormData={setFormData}
              projects={projects}
              onSubmit={handleSubmit}
              isLoading={updateMutation.isPending}
              isEdit
              newActionItem={newActionItem}
              setNewActionItem={setNewActionItem}
              addActionItem={addActionItem}
              toggleActionStatus={toggleActionStatus}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MeetingForm({ formData, setFormData, projects, onSubmit, isLoading, isEdit, newActionItem, setNewActionItem, addActionItem, toggleActionStatus }) {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Project *</Label>
        <Select value={formData.project_id} onValueChange={(v) => handleChange('project_id', v)}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Meeting Title *</Label>
        <Input
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Weekly progress review"
          required
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date & Time *</Label>
          <Input
            type="datetime-local"
            value={formData.meeting_date}
            onChange={(e) => handleChange('meeting_date', e.target.value)}
            required
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
        <div className="space-y-2">
          <Label>Duration (minutes)</Label>
          <Input
            type="number"
            value={formData.duration_minutes}
            onChange={(e) => handleChange('duration_minutes', e.target.value)}
            placeholder="60"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <Input
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
          placeholder="Conference room, Zoom link, etc."
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={4}
          placeholder="Meeting notes, discussion points..."
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      {/* Action Items */}
      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">Action Items</h4>
        <div className="space-y-3">
          {formData.action_items.map((action, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded">
              <Checkbox
                checked={action.status === 'completed'}
                onCheckedChange={() => toggleActionStatus(idx)}
              />
              <div className="flex-1">
                <p className={`text-sm ${action.status === 'completed' ? 'line-through text-zinc-500' : 'text-white'}`}>
                  {action.item}
                </p>
                <p className="text-xs text-zinc-500">{action.assignee} • {action.due_date && format(new Date(action.due_date), 'MMM d')}</p>
              </div>
            </div>
          ))}
          
          {/* Add New Action Item */}
          <div className="p-3 bg-zinc-800/30 rounded-lg space-y-2">
            <Input
              placeholder="New action item"
              value={newActionItem.item}
              onChange={(e) => setNewActionItem({ ...newActionItem, item: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Assignee"
                value={newActionItem.assignee}
                onChange={(e) => setNewActionItem({ ...newActionItem, assignee: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
              <Input
                type="date"
                value={newActionItem.due_date}
                onChange={(e) => setNewActionItem({ ...newActionItem, due_date: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={addActionItem}
              variant="outline"
              className="w-full border-zinc-700"
            >
              <Plus size={14} className="mr-2" />
              Add Action Item
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Create Meeting'}
        </Button>
      </div>
    </form>
  );
}