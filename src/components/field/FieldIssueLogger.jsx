import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Camera, X, Check, Lightbulb } from 'lucide-react';
import { format } from 'date-fns';

const ISSUE_TYPES = [
  { value: 'fit_up', label: 'Fit-Up Issue' },
  { value: 'bolt_mismatch', label: 'Bolt Mismatch' },
  { value: 'weld_prep', label: 'Weld Prep' },
  { value: 'connection_unclear', label: 'Connection Unclear' },
  { value: 'member_size', label: 'Member Size' },
  { value: 'coating_damage', label: 'Coating Damage' },
  { value: 'shipping_damage', label: 'Shipping Damage' },
  { value: 'field_modification', label: 'Field Modification' },
  { value: 'tolerance_stack', label: 'Tolerance Stack' },
  { value: 'other', label: 'Other' }
];

const ROOT_CAUSES = [
  { value: 'detail_error', label: 'Detail Error' },
  { value: 'fabrication_error', label: 'Fabrication Error' },
  { value: 'shipping_damage', label: 'Shipping Damage' },
  { value: 'field_error', label: 'Field Error' },
  { value: 'tolerance_stack', label: 'Tolerance Stack' },
  { value: 'design_ambiguity', label: 'Design Ambiguity' }
];

export default function FieldIssueLogger({ projectId, onSuccess }) {
  const [formData, setFormData] = useState({
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    issue_time: format(new Date(), 'HH:mm'),
    issue_type: 'fit_up',
    severity: 'moderate',
    root_cause: 'unknown',
    work_stopped: false,
    affected_piece_marks: [],
    affected_connection_types: [],
    erection_zone: '',
    description: '',
    field_workaround: '',
    erection_crew: ''
  });

  const [pieceMarkInput, setPieceMarkInput] = useState('');
  const [connectionInput, setConnectionInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const user = base44.auth.me();

  const createIssueMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.FieldIssue.create({
        ...data,
        project_id: projectId,
        reported_by: user?.email || 'unknown'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-issues'] });
      if (onSuccess) onSuccess();
      // Reset form
      setFormData({
        issue_date: format(new Date(), 'yyyy-MM-dd'),
        issue_time: format(new Date(), 'HH:mm'),
        issue_type: 'fit_up',
        severity: 'moderate',
        root_cause: 'unknown',
        work_stopped: false,
        affected_piece_marks: [],
        affected_connection_types: [],
        erection_zone: '',
        description: '',
        field_workaround: '',
        erection_crew: ''
      });
    }
  });

  const handleAddPieceMark = () => {
    if (pieceMarkInput.trim() && !formData.affected_piece_marks.includes(pieceMarkInput.toUpperCase())) {
      setFormData(prev => ({
        ...prev,
        affected_piece_marks: [...prev.affected_piece_marks, pieceMarkInput.toUpperCase()]
      }));
      setPieceMarkInput('');
    }
  };

  const handleRemovePieceMark = (mark) => {
    setFormData(prev => ({
      ...prev,
      affected_piece_marks: prev.affected_piece_marks.filter(m => m !== mark)
    }));
  };

  const handleAddConnection = () => {
    if (connectionInput.trim() && !formData.affected_connection_types.includes(connectionInput)) {
      setFormData(prev => ({
        ...prev,
        affected_connection_types: [...prev.affected_connection_types, connectionInput]
      }));
      setConnectionInput('');
    }
  };

  const handleRemoveConnection = (conn) => {
    setFormData(prev => ({
      ...prev,
      affected_connection_types: prev.affected_connection_types.filter(c => c !== conn)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      alert('Please describe the issue');
      return;
    }
    setIsSubmitting(true);
    createIssueMutation.mutate(formData);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-400" />
            Log Field Issue
          </CardTitle>
          <p className="text-xs text-zinc-400 mt-2">
            Capture fit-up, fabrication, and detail issues on-site in real-time
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase block mb-1">Date</label>
              <Input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="bg-zinc-700 border-zinc-600 text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase block mb-1">Time</label>
              <Input
                type="time"
                value={formData.issue_time}
                onChange={(e) => setFormData({ ...formData, issue_time: e.target.value })}
                className="bg-zinc-700 border-zinc-600 text-white"
              />
            </div>
          </div>

          {/* Crew & Zone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase block mb-1">Crew</label>
              <Input
                placeholder="e.g., Crew A"
                value={formData.erection_crew}
                onChange={(e) => setFormData({ ...formData, erection_crew: e.target.value })}
                className="bg-zinc-700 border-zinc-600 text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase block mb-1">Zone/Gridline</label>
              <Input
                placeholder="e.g., Grid A-B/1-3, Level 2"
                value={formData.erection_zone}
                onChange={(e) => setFormData({ ...formData, erection_zone: e.target.value })}
                className="bg-zinc-700 border-zinc-600 text-white"
              />
            </div>
          </div>

          {/* Issue Type & Severity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase block mb-1">Issue Type</label>
              <Select value={formData.issue_type} onValueChange={(val) => setFormData({ ...formData, issue_type: val })}>
                <SelectTrigger className="bg-zinc-700 border-zinc-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase block mb-1">Severity</label>
              <Select value={formData.severity} onValueChange={(val) => setFormData({ ...formData, severity: val })}>
                <SelectTrigger className="bg-zinc-700 border-zinc-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Work Stopped */}
          <div className="flex items-center gap-2 p-2 bg-zinc-700/50 rounded">
            <Checkbox
              checked={formData.work_stopped}
              onCheckedChange={(checked) => setFormData({ ...formData, work_stopped: checked })}
            />
            <label className="text-xs font-bold text-zinc-300">Work Stopped (Halted erection progress)</label>
          </div>

          {/* Delay hours (if work stopped) */}
          {formData.work_stopped && (
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase block mb-1">Est. Delay (hours)</label>
              <Input
                type="number"
                min="0"
                value={formData.estimated_delay_hours}
                onChange={(e) => setFormData({ ...formData, estimated_delay_hours: parseInt(e.target.value) || 0 })}
                className="bg-zinc-700 border-zinc-600 text-white"
              />
            </div>
          )}

          {/* Piece Marks */}
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase block mb-2">Affected Piece Marks</label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="e.g., C3"
                value={pieceMarkInput}
                onChange={(e) => setPieceMarkInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPieceMark()}
                className="bg-zinc-700 border-zinc-600 text-white flex-1"
              />
              <Button onClick={handleAddPieceMark} size="sm" className="bg-amber-600 hover:bg-amber-700">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {formData.affected_piece_marks.map(mark => (
                <Badge key={mark} className="bg-amber-600 cursor-pointer flex items-center gap-1" onClick={() => handleRemovePieceMark(mark)}>
                  {mark} <X size={12} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Connection Types */}
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase block mb-2">Connection Types</label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="e.g., bolted_moment"
                value={connectionInput}
                onChange={(e) => setConnectionInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddConnection()}
                className="bg-zinc-700 border-zinc-600 text-white flex-1"
              />
              <Button onClick={handleAddConnection} size="sm" className="bg-amber-600 hover:bg-amber-700">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {formData.affected_connection_types.map(conn => (
                <Badge key={conn} className="bg-blue-600 cursor-pointer flex items-center gap-1" onClick={() => handleRemoveConnection(conn)}>
                  {conn} <X size={12} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase block mb-1">Description</label>
            <Textarea
              placeholder="What happened? What was the impact?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-zinc-700 border-zinc-600 text-white h-24"
            />
          </div>

          {/* Root Cause & Workaround */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase block mb-1">Suspected Cause</label>
              <Select value={formData.root_cause} onValueChange={(val) => setFormData({ ...formData, root_cause: val })}>
                <SelectTrigger className="bg-zinc-700 border-zinc-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOT_CAUSES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase block mb-1">Field Workaround (if applied)</label>
            <Textarea
              placeholder="How did crew work around this?"
              value={formData.field_workaround}
              onChange={(e) => setFormData({ ...formData, field_workaround: e.target.value })}
              className="bg-zinc-700 border-zinc-600 text-white h-16"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.description.trim()}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
          >
            <Check size={16} className="mr-2" />
            {isSubmitting ? 'Submitting...' : 'Submit Issue'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}