import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/notifications';
import { Loader2, CheckSquare } from 'lucide-react';

export default function BulkFieldIssueActions({ issues, onClose }) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);
  const [action, setAction] = useState('');
  const [assignee, setAssignee] = useState('');
  const [severity, setSeverity] = useState('');

  const bulkUpdateMutation = useMutation({
    mutationFn: async () => {
      const updates = {};
      if (assignee) updates.assigned_to = assignee;
      if (severity) updates.severity = severity;

      const promises = selectedIds.map(id =>
        base44.entities.FieldIssue.update(id, updates)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-issues'] });
      toast.success(`${selectedIds.length} issues updated`);
      setSelectedIds([]);
      if (onClose) onClose();
    },
    onError: () => {
      toast.error('Bulk update failed');
    }
  });

  const toggleAll = () => {
    if (selectedIds.length === issues.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(issues.map(i => i.id));
    }
  };

  const toggleIssue = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const canExecute = selectedIds.length > 0 && (assignee || severity);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare size={18} />
            Bulk Actions
          </CardTitle>
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            {selectedIds.length} selected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-2 bg-zinc-800/50 border border-zinc-700 rounded">
          <Checkbox
            checked={selectedIds.length === issues.length}
            onCheckedChange={toggleAll}
          />
          <span className="text-xs text-zinc-400">Select All ({issues.length})</span>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {issues.map(issue => (
            <div
              key={issue.id}
              className="flex items-center gap-2 p-2 hover:bg-zinc-800/50 rounded cursor-pointer"
              onClick={() => toggleIssue(issue.id)}
            >
              <Checkbox
                checked={selectedIds.includes(issue.id)}
                onCheckedChange={() => toggleIssue(issue.id)}
              />
              <div className="flex-1 text-xs text-zinc-300 truncate">
                {issue.description?.substring(0, 60)}...
              </div>
              <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                {issue.issue_type}
              </Badge>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-3 border-t border-zinc-800">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Assign To</label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pm@company.com">Project Manager</SelectItem>
                <SelectItem value="super@company.com">Superintendent</SelectItem>
                <SelectItem value="detail@company.com">Detailing Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Update Severity</label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-zinc-700"
          >
            Cancel
          </Button>
          <Button
            onClick={() => bulkUpdateMutation.mutate()}
            disabled={!canExecute || bulkUpdateMutation.isPending}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
          >
            {bulkUpdateMutation.isPending && <Loader2 size={16} className="mr-2 animate-spin" />}
            Apply to {selectedIds.length}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}