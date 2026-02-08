import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Lightbulb, TrendingDown, Send, Loader } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const ISSUE_TYPES = [
  'bolt_hole_misalignment',
  'weld_fitup_gap',
  'member_twist',
  'bearing_surface_not_flush',
  'missing_coping',
  'connection_oversized',
  'bolt_length_short',
  'erection_sequence_issue'
];

const CONNECTION_TYPES = [
  'bolted_splice',
  'welded_splice',
  'column_base',
  'beam_column',
  'braced_connection',
  'moment_connection',
  'joist_seat'
];

export default function FieldFeedbackForm({ projectId }) {
  const [formData, setFormData] = useState({
    issue_type: '',
    connection_type: '',
    piece_marks: '',
    description: '',
    suggested_fix: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const { data: connectionTypes = [] } = useQuery({
    queryKey: ['connectionHistory', projectId],
    queryFn: async () => {
      const deliveries = await base44.entities.Delivery.filter({ project_id: projectId });
      const types = new Set();
      deliveries.forEach(d => {
        d.line_items?.forEach(item => {
          if (item.description) types.add(item.description.split(' ')[0]);
        });
      });
      return Array.from(types);
    }
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      setSubmitting(true);
      const result = await base44.functions.invoke('logFieldFeedback', {
        project_id: projectId,
        issue_type: formData.issue_type,
        connection_type: formData.connection_type,
        piece_marks: formData.piece_marks.split(',').map(p => p.trim()),
        description: formData.description,
        suggested_fix: formData.suggested_fix
      });
      return result.data;
    },
    onSuccess: (data) => {
      setSubmitting(false);
      if (data.ai_suggestion) {
        setAiSuggestion(data.ai_suggestion);
      }
      if (data.is_recurring) {
        toast.warning(`Recurring issue detected (${data.rework_frequency} occurrences)`);
      } else {
        toast.success('Feedback logged');
      }
      // Reset form
      setFormData({
        issue_type: '',
        connection_type: '',
        piece_marks: '',
        description: '',
        suggested_fix: ''
      });
    },
    onError: () => {
      setSubmitting(false);
      toast.error('Failed to log feedback');
    }
  });

  const isComplete = formData.issue_type && formData.connection_type && formData.description;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500" />
          Field Issue Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Issue Type</label>
            <Select value={formData.issue_type} onValueChange={(val) => setFormData({ ...formData, issue_type: val })}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select issue" />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Connection Type</label>
            <Select value={formData.connection_type} onValueChange={(val) => setFormData({ ...formData, connection_type: val })}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select connection" />
              </SelectTrigger>
              <SelectContent>
                {CONNECTION_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Piece Marks (comma-separated)</label>
          <Input
            placeholder="e.g., C1, C2, B3"
            value={formData.piece_marks}
            onChange={(e) => setFormData({ ...formData, piece_marks: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Issue Description</label>
          <Textarea
            placeholder="Describe the field problem in detail"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 h-24"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Suggested Fix (optional)</label>
          <Textarea
            placeholder="How should detailing prevent this?"
            value={formData.suggested_fix}
            onChange={(e) => setFormData({ ...formData, suggested_fix: e.target.value })}
            className="mt-1 h-16"
          />
        </div>

        <Button
          onClick={() => submitMutation.mutate()}
          disabled={!isComplete || submitting}
          className="w-full bg-amber-600 hover:bg-amber-700"
        >
          {submitting ? (
            <>
              <Loader size={14} className="mr-1 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send size={14} className="mr-1" />
              Log Feedback
            </>
          )}
        </Button>

        {aiSuggestion && (
          <Dialog open={!!aiSuggestion} onOpenChange={(open) => !open && setAiSuggestion(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lightbulb size={18} className="text-yellow-500" />
                  AI Detail Suggestion
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Recommendation</h4>
                  <p className="text-sm text-muted-foreground">{aiSuggestion.suggestion}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2">Drawing Change</h4>
                  <p className="text-sm text-muted-foreground">{aiSuggestion.drawing_change}</p>
                </div>
                <div className="p-3 bg-green-950/20 border border-green-800 rounded">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={16} className="text-green-400" />
                    <div>
                      <div className="text-xs text-green-400 uppercase tracking-wider">Est. Rework Hours Saved</div>
                      <div className="text-lg font-bold text-green-400">{aiSuggestion.estimated_rework_hours_saved}h</div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}