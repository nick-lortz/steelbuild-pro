import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Camera, X, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

const ISSUE_TYPES = [
  'fit_up',
  'bolt_mismatch',
  'weld_prep',
  'connection_unclear',
  'member_size',
  'coating_damage',
  'shipping_damage',
  'field_modification',
  'tolerance_stack',
  'other'
];

const CONNECTION_TYPES = [
  'bolted_moment',
  'welded_field_splice',
  'shear_tab',
  'end_plate',
  'hss_connection',
  'stairs',
  'handrail',
  'misc_metals',
  'embed',
  'anchor',
  'other'
];

const ROOT_CAUSES = [
  'detail_error',
  'fabrication_error',
  'shipping_damage',
  'field_error',
  'tolerance_stack',
  'design_ambiguity',
  'unknown'
];

const SEVERITY_LEVELS = ['minor', 'moderate', 'critical'];

export default function FieldIssueForm({ projectId, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    project_id: projectId,
    issue_date: new Date().toISOString().split('T')[0],
    issue_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    issue_type: 'fit_up',
    severity: 'moderate',
    work_stopped: false,
    estimated_delay_hours: 0,
    affected_piece_marks: [],
    affected_connection_types: [],
    erection_zone: '',
    erection_crew: '',
    description: '',
    root_cause: 'unknown',
    field_workaround: '',
    photos: []
  });
  
  const [pieceMarkInput, setPieceMarkInput] = useState('');
  const [connectionTypeInput, setConnectionTypeInput] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FieldIssue.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-issues'] });
      toast.success('Field issue logged');
      
      // Reset form
      setFormData({
        project_id: projectId,
        issue_date: new Date().toISOString().split('T')[0],
        issue_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        issue_type: 'fit_up',
        severity: 'moderate',
        work_stopped: false,
        estimated_delay_hours: 0,
        affected_piece_marks: [],
        affected_connection_types: [],
        erection_zone: '',
        erection_crew: '',
        description: '',
        root_cause: 'unknown',
        field_workaround: '',
        photos: []
      });
      
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error('Failed to log issue');
      console.error(error);
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      
      setFormData(prev => ({
        ...prev,
        photos: [
          ...prev.photos,
          {
            file_url: data.file_url,
            file_name: file.name,
            uploaded_at: new Date().toISOString(),
            caption: ''
          }
        ]
      }));
      
      toast.success('Photo uploaded');
    } catch (error) {
      toast.error('Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const addPieceMark = () => {
    if (!pieceMarkInput.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      affected_piece_marks: [...prev.affected_piece_marks, pieceMarkInput.trim().toUpperCase()]
    }));
    setPieceMarkInput('');
  };

  const removePieceMark = (mark) => {
    setFormData(prev => ({
      ...prev,
      affected_piece_marks: prev.affected_piece_marks.filter(m => m !== mark)
    }));
  };

  const addConnectionType = () => {
    if (!connectionTypeInput || formData.affected_connection_types.includes(connectionTypeInput)) return;
    
    setFormData(prev => ({
      ...prev,
      affected_connection_types: [...prev.affected_connection_types, connectionTypeInput]
    }));
  };

  const removeConnectionType = (type) => {
    setFormData(prev => ({
      ...prev,
      affected_connection_types: prev.affected_connection_types.filter(t => t !== type)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      toast.error('Description required');
      return;
    }
    
    if (formData.affected_piece_marks.length === 0) {
      toast.error('At least one piece mark required');
      return;
    }

    createMutation.mutate({
      ...formData,
      reported_by: currentUser?.email,
      status: 'open'
    });
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-500" />
          Log Field Issue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-zinc-400">Date</Label>
              <Input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Time</Label>
              <Input
                type="time"
                value={formData.issue_time}
                onChange={(e) => setFormData({ ...formData, issue_time: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>
          </div>

          {/* Issue Type & Severity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-zinc-400">Issue Type</Label>
              <Select value={formData.issue_type} onValueChange={(v) => setFormData({ ...formData, issue_type: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Severity</Label>
              <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Crew & Zone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-zinc-400">Crew</Label>
              <Input
                value={formData.erection_crew}
                onChange={(e) => setFormData({ ...formData, erection_crew: e.target.value })}
                placeholder="Crew A, Ironworkers, etc."
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Zone/Elevation</Label>
              <Input
                value={formData.erection_zone}
                onChange={(e) => setFormData({ ...formData, erection_zone: e.target.value })}
                placeholder="Grid A-B/1-3, Level 2"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          {/* Piece Marks */}
          <div>
            <Label className="text-xs text-zinc-400">Piece Marks *</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={pieceMarkInput}
                onChange={(e) => setPieceMarkInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPieceMark())}
                placeholder="C3, B12, etc."
                className="bg-zinc-800 border-zinc-700"
              />
              <Button type="button" onClick={addPieceMark} variant="outline" className="border-zinc-700">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.affected_piece_marks.map(mark => (
                <Badge key={mark} className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  {mark}
                  <X size={12} className="ml-1 cursor-pointer" onClick={() => removePieceMark(mark)} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Connection Types */}
          <div>
            <Label className="text-xs text-zinc-400">Connection Types</Label>
            <div className="flex gap-2 mb-2">
              <Select value={connectionTypeInput} onValueChange={setConnectionTypeInput}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Select connection type" />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTION_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={addConnectionType} variant="outline" className="border-zinc-700">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.affected_connection_types.map(type => (
                <Badge key={type} className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {type.replace(/_/g, ' ')}
                  <X size={12} className="ml-1 cursor-pointer" onClick={() => removeConnectionType(type)} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-zinc-400">Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the issue..."
              className="bg-zinc-800 border-zinc-700 min-h-[100px]"
              required
            />
          </div>

          {/* Root Cause */}
          <div>
            <Label className="text-xs text-zinc-400">Root Cause (Field Assessment)</Label>
            <Select value={formData.root_cause} onValueChange={(v) => setFormData({ ...formData, root_cause: v })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROOT_CAUSES.map(cause => (
                  <SelectItem key={cause} value={cause}>
                    {cause.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Work Stopped & Delay */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.work_stopped}
                onChange={(e) => setFormData({ ...formData, work_stopped: e.target.checked })}
                className="w-4 h-4"
              />
              <Label className="text-xs text-zinc-400">Work Stopped</Label>
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Est. Delay (hours)</Label>
              <Input
                type="number"
                value={formData.estimated_delay_hours}
                onChange={(e) => setFormData({ ...formData, estimated_delay_hours: parseFloat(e.target.value) || 0 })}
                className="bg-zinc-800 border-zinc-700"
                min="0"
                step="0.5"
              />
            </div>
          </div>

          {/* Field Workaround */}
          <div>
            <Label className="text-xs text-zinc-400">Field Workaround (if applied)</Label>
            <Textarea
              value={formData.field_workaround}
              onChange={(e) => setFormData({ ...formData, field_workaround: e.target.value })}
              placeholder="Temporary fix or workaround applied..."
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          {/* Photos */}
          <div>
            <Label className="text-xs text-zinc-400">Photos</Label>
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                  disabled={uploadingPhoto}
                />
                <label htmlFor="photo-upload">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-zinc-700"
                    disabled={uploadingPhoto}
                    onClick={() => document.getElementById('photo-upload').click()}
                  >
                    {uploadingPhoto ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Camera size={16} className="mr-2" />
                    )}
                    {uploadingPhoto ? 'Uploading...' : 'Take/Upload Photo'}
                  </Button>
                </label>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {formData.photos.map((photo, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={photo.file_url}
                      alt={photo.file_name}
                      className="w-full h-24 object-cover rounded border border-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-black"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : null}
            Log Issue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}