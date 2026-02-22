import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import PMProjectSelector from '@/components/pm-toolkit/PMProjectSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Plus, X, Link as LinkIcon } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function PMScopeExclusions() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    scope_letter_url: '',
    furnished_installed: [],
    notes_assumptions: '',
    terms_conditions: '',
    exclusions: [],
    clarifications: []
  });
  const [newItem, setNewItem] = useState('');
  const [newExclusion, setNewExclusion] = useState('');
  const [newClarification, setNewClarification] = useState('');

  const { data: scopeRef, isLoading } = useQuery({
    queryKey: ['scopeReference', activeProjectId],
    queryFn: () => base44.entities.ScopeReference.filter({ project_id: activeProjectId, is_current: true }),
    enabled: !!activeProjectId,
    select: (data) => data[0]
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (scopeRef) {
        return base44.entities.ScopeReference.update(scopeRef.id, data);
      } else {
        return base44.entities.ScopeReference.create({ ...data, project_id: activeProjectId, is_current: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scopeReference']);
      setIsEditing(false);
      toast.success('Scope reference saved');
    }
  });

  React.useEffect(() => {
    if (scopeRef && !isEditing) {
      setFormData({
        scope_letter_url: scopeRef.scope_letter_url || '',
        furnished_installed: scopeRef.furnished_installed || [],
        notes_assumptions: scopeRef.notes_assumptions || '',
        terms_conditions: scopeRef.terms_conditions || '',
        exclusions: scopeRef.exclusions || [],
        clarifications: scopeRef.clarifications || []
      });
    }
  }, [scopeRef, isEditing]);

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const addItem = (field, value) => {
    if (!value.trim()) return;
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), value.trim()]
    }));
    if (field === 'furnished_installed') setNewItem('');
    if (field === 'exclusions') setNewExclusion('');
    if (field === 'clarifications') setNewClarification('');
  };

  const removeItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Select a project to manage scope & exclusions
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#E5E7EB]">Scope & Exclusions</h1>
          <p className="text-sm text-[#9CA3AF]">Scope Letter Reference & Justification Anchor</p>
        </div>
        <div className="flex items-center gap-4">
          <PMProjectSelector />
          <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>Edit Scope Reference</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>Save</Button>
            </>
          )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Scope Letter Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-2">
              <label className="text-sm text-[#9CA3AF]">Scope Letter URL/Link</label>
              <Input
                value={formData.scope_letter_url}
                onChange={(e) => setFormData(prev => ({ ...prev, scope_letter_url: e.target.value }))}
                placeholder="Paste document link or upload URL"
              />
            </div>
          ) : (
            <div>
              {formData.scope_letter_url ? (
                <a href={formData.scope_letter_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#FF9D42] hover:underline">
                  <LinkIcon className="w-4 h-4" />
                  View Scope Letter
                </a>
              ) : (
                <p className="text-sm text-[#6B7280]">No scope letter uploaded</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Furnished & Installed Scope</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.furnished_installed.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-[#0A0A0A] rounded border border-[rgba(255,255,255,0.05)]">
              <span className="flex-1 text-sm">{item}</span>
              {isEditing && (
                <Button variant="ghost" size="icon" onClick={() => removeItem('furnished_installed', idx)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          {isEditing && (
            <div className="flex gap-2">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Add scope item..."
                onKeyPress={(e) => e.key === 'Enter' && addItem('furnished_installed', newItem)}
              />
              <Button onClick={() => addItem('furnished_installed', newItem)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes & Assumptions</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={formData.notes_assumptions}
              onChange={(e) => setFormData(prev => ({ ...prev, notes_assumptions: e.target.value }))}
              rows={4}
              placeholder="Special conditions, assumptions, etc."
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{formData.notes_assumptions || 'None specified'}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Terms & Conditions Highlights</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={formData.terms_conditions}
              onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
              rows={4}
              placeholder="e.g., Tax not included, acceptance window, payment terms..."
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{formData.terms_conditions || 'None specified'}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exclusions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.exclusions.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-[#0A0A0A] rounded border border-[rgba(255,255,255,0.05)]">
              <Badge variant="destructive" className="shrink-0">Excluded</Badge>
              <span className="flex-1 text-sm">{item}</span>
              {isEditing && (
                <Button variant="ghost" size="icon" onClick={() => removeItem('exclusions', idx)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          {isEditing && (
            <div className="flex gap-2">
              <Input
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                placeholder="Add exclusion..."
                onKeyPress={(e) => e.key === 'Enter' && addItem('exclusions', newExclusion)}
              />
              <Button onClick={() => addItem('exclusions', newExclusion)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clarifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.clarifications.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-[#0A0A0A] rounded border border-[rgba(255,255,255,0.05)]">
              <span className="flex-1 text-sm">{item}</span>
              {isEditing && (
                <Button variant="ghost" size="icon" onClick={() => removeItem('clarifications', idx)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          {isEditing && (
            <div className="flex gap-2">
              <Input
                value={newClarification}
                onChange={(e) => setNewClarification(e.target.value)}
                placeholder="Add clarification..."
                onKeyPress={(e) => e.key === 'Enter' && addItem('clarifications', newClarification)}
              />
              <Button onClick={() => addItem('clarifications', newClarification)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}