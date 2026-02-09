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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/notifications';
import { Loader2, X } from 'lucide-react';

const APPLICABILITY_TAGS = [
  'galvanized',
  'seismic',
  'stairs',
  'handrails',
  'misc_metals',
  'hss',
  'panel_points',
  'field_bolted',
  'field_welded',
  'high_strength_bolts',
  'moment_connections',
  'simple_connections'
];

export default function DetailImprovementForm({ projectId, pattern, issueIds, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    project_id: projectId,
    title: pattern ? `${pattern.connection_type.replace(/_/g, ' ')} - ${pattern.root_cause.replace(/_/g, ' ')}` : '',
    connection_type: pattern?.connection_type || '',
    root_cause: pattern?.root_cause || 'other',
    description: '',
    recommended_change: '',
    design_intent_change: false,
    source_field_issues: issueIds || pattern?.issues.map(i => i.id) || [],
    applicability_tags: [],
    recommended_for: 'both',
    constraints: {
      min_thickness: null,
      max_thickness: null,
      bolt_diameter_range: '',
      member_series: '',
      erection_access_required: ''
    },
    evidence_count: pattern?.count || 0,
    confidence_score: pattern?.confidence_score || 50
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DetailImprovement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detail-improvements'] });
      toast.success('Improvement proposed');
      if (onSuccess) onSuccess();
    },
    onError: () => {
      toast.error('Failed to create improvement');
    }
  });

  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      applicability_tags: prev.applicability_tags.includes(tag)
        ? prev.applicability_tags.filter(t => t !== tag)
        : [...prev.applicability_tags, tag]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.recommended_change.trim()) {
      toast.error('Title and recommended change required');
      return;
    }

    // Determine approval threshold
    let approval_threshold = 'detailing_lead_only';
    if (formData.design_intent_change) {
      approval_threshold = 'requires_eor_review';
    } else if (formData.estimated_cost_impact > 5000 || formData.estimated_schedule_impact > 2) {
      approval_threshold = 'requires_pm_approval';
    }

    createMutation.mutate({
      ...formData,
      approval_threshold,
      status: 'pending_review'
    });
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base">Propose Detail Improvement</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Evidence */}
          {pattern && (
            <div className="p-3 bg-blue-500/5 border border-blue-500/30 rounded text-xs">
              <div className="font-semibold text-blue-400 mb-1">Pattern Evidence</div>
              <div className="text-zinc-400">
                {pattern.count} field issues • {pattern.piece_marks.length} piece marks affected • {pattern.confidence_score}% confidence
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <Label className="text-xs text-zinc-400">Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of improvement"
              className="bg-zinc-800 border-zinc-700"
              required
            />
          </div>

          {/* Connection Type & Root Cause */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-zinc-400">Connection Type</Label>
              <Input
                value={formData.connection_type}
                onChange={(e) => setFormData({ ...formData, connection_type: e.target.value })}
                placeholder="shear_tab, hss_moment, etc."
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Root Cause</Label>
              <Select 
                value={formData.root_cause} 
                onValueChange={(v) => setFormData({ ...formData, root_cause: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fit_up_tolerance">Fit-up Tolerance</SelectItem>
                  <SelectItem value="member_size">Member Size</SelectItem>
                  <SelectItem value="plate_thickness">Plate Thickness</SelectItem>
                  <SelectItem value="bolt_spec">Bolt Specification</SelectItem>
                  <SelectItem value="weld_spec">Weld Specification</SelectItem>
                  <SelectItem value="code_requirement">Code Requirement</SelectItem>
                  <SelectItem value="access_clearance">Access/Clearance</SelectItem>
                  <SelectItem value="fabrication_process">Fabrication Process</SelectItem>
                  <SelectItem value="erection_sequence">Erection Sequence</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-zinc-400">Problem Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What's the problem? Why does it occur?"
              className="bg-zinc-800 border-zinc-700 min-h-[80px]"
            />
          </div>

          {/* Recommended Change */}
          <div>
            <Label className="text-xs text-zinc-400">Recommended Change *</Label>
            <Textarea
              value={formData.recommended_change}
              onChange={(e) => setFormData({ ...formData, recommended_change: e.target.value })}
              placeholder="Specific detail change (e.g., increase edge distance from 1.5 to 2.0 inches for 3/4 inch bolts)"
              className="bg-zinc-800 border-zinc-700 min-h-[80px]"
              required
            />
          </div>

          {/* Design Intent Change */}
          <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/30 rounded">
            <Checkbox
              checked={formData.design_intent_change}
              onCheckedChange={(checked) => setFormData({ ...formData, design_intent_change: checked })}
            />
            <Label className="text-xs text-zinc-300 cursor-pointer">
              This change affects design intent (load path, connection category, member sizes, or code requirements)
            </Label>
          </div>

          {/* Recommended For */}
          <div>
            <Label className="text-xs text-zinc-400">Apply To</Label>
            <Select 
              value={formData.recommended_for} 
              onValueChange={(v) => setFormData({ ...formData, recommended_for: v })}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shop">Shop Details Only</SelectItem>
                <SelectItem value="field">Field Revisions Only</SelectItem>
                <SelectItem value="both">Both Shop & Field</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Applicability Tags */}
          <div>
            <Label className="text-xs text-zinc-400 mb-2 block">Applicability Tags</Label>
            <div className="flex flex-wrap gap-2">
              {APPLICABILITY_TAGS.map(tag => (
                <Badge
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={
                    formData.applicability_tags.includes(tag)
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 cursor-pointer'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 cursor-pointer hover:border-zinc-600'
                  }
                >
                  {tag.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>

          {/* Constraints */}
          <div className="space-y-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded">
            <div className="text-xs font-semibold text-zinc-300">Application Constraints</div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] text-zinc-500">Min Thickness (in)</Label>
                <Input
                  type="number"
                  step="0.125"
                  value={formData.constraints.min_thickness || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    constraints: { ...formData.constraints, min_thickness: parseFloat(e.target.value) || null }
                  })}
                  className="bg-zinc-800 border-zinc-700 h-8 text-xs"
                  placeholder="0.25"
                />
              </div>
              <div>
                <Label className="text-[10px] text-zinc-500">Max Thickness (in)</Label>
                <Input
                  type="number"
                  step="0.125"
                  value={formData.constraints.max_thickness || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    constraints: { ...formData.constraints, max_thickness: parseFloat(e.target.value) || null }
                  })}
                  className="bg-zinc-800 border-zinc-700 h-8 text-xs"
                  placeholder="2.0"
                />
              </div>
            </div>

            <div>
              <Label className="text-[10px] text-zinc-500">Bolt Diameter Range</Label>
              <Input
                value={formData.constraints.bolt_diameter_range}
                onChange={(e) => setFormData({
                  ...formData,
                  constraints: { ...formData.constraints, bolt_diameter_range: e.target.value }
                })}
                placeholder='e.g., "3/4\" - 1\"" or "7/8\" only"'
                className="bg-zinc-800 border-zinc-700 h-8 text-xs"
              />
            </div>

            <div>
              <Label className="text-[10px] text-zinc-500">Member Series</Label>
              <Input
                value={formData.constraints.member_series}
                onChange={(e) => setFormData({
                  ...formData,
                  constraints: { ...formData.constraints, member_series: e.target.value }
                })}
                placeholder='e.g., "W shapes", "HSS square only"'
                className="bg-zinc-800 border-zinc-700 h-8 text-xs"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1 border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
            >
              {createMutation.isPending ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
              Submit for Review
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}