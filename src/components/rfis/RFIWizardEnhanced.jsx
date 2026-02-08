import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const RFI_TYPES = [
  { value: 'connection_detail', label: 'Connection Detail' },
  { value: 'member_size_length', label: 'Member Size / Length' },
  { value: 'embed_anchor', label: 'Embed / Anchor' },
  { value: 'tolerance_fitup', label: 'Tolerance / Fit-Up' },
  { value: 'coating_finish', label: 'Coating / Finish' },
  { value: 'erection_sequence', label: 'Erection Sequence' },
  { value: 'other', label: 'Other' }
];

export default function RFIWizardEnhanced({ projectId, onSubmit, onCancel }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('type');
  const [formData, setFormData] = useState({
    rfi_type: '',
    subject: '',
    question: '',
    discipline: '',
    location_area: '',
    spec_section: '',
    linked_task_ids: [],
    linked_piece_marks: [],
    linked_drawing_set_ids: [],
    blocked_work: 'none',
    blocked_team: '',
    attachments: []
  });
  const [calculatedDueDate, setCalculatedDueDate] = useState(null);
  const [routingInfo, setRoutingInfo] = useState(null);
  const [impacts, setImpacts] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => apiClient.entities.Task.filter({ project_id: projectId })
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiClient.entities.Project.filter({ id: projectId }),
    select: (data) => data?.[0]
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawingSets', projectId],
    queryFn: () => apiClient.entities.DrawingSet.filter({ project_id: projectId })
  });

  // Auto-calculate due date when tasks selected
  useEffect(() => {
    if (formData.linked_task_ids.length > 0) {
      apiClient.functions.invoke('calculateRFIDueDate', {
        project_id: projectId,
        linked_task_ids: formData.linked_task_ids
      }).then(res => {
        setCalculatedDueDate(res.data);
      });
    }
  }, [formData.linked_task_ids, projectId]);

  // Auto-route when type selected
  useEffect(() => {
    if (formData.rfi_type) {
      apiClient.functions.invoke('autoRouteRFI', {
        project_id: projectId,
        rfi_type: formData.rfi_type,
        is_internal: formData.blocked_work !== 'none'
      }).then(res => {
        setRoutingInfo(res.data);
      });
    }
  }, [formData.rfi_type, formData.blocked_work, projectId]);

  // Detect impacts when tasks/deliveries linked
  useEffect(() => {
    if (formData.linked_task_ids.length > 0 || formData.blocked_work !== 'none') {
      apiClient.functions.invoke('detectRFIImpacts', {
        project_id: projectId,
        linked_task_ids: formData.linked_task_ids,
        linked_piece_marks: formData.linked_piece_marks,
        blocked_work: formData.blocked_work
      }).then(res => {
        setImpacts(res.data);
      });
    }
  }, [formData.linked_task_ids, formData.blocked_work, projectId]);

  const createRFIMutation = useMutation({
    mutationFn: async (data) => {
      const rfiNumber = (await apiClient.entities.RFI.filter({ project_id: projectId })).length + 1;
      return apiClient.entities.RFI.create({
        project_id: projectId,
        rfi_number: rfiNumber,
        status: 'internal_review',
        ...data,
        blocker_info: formData.blocked_work !== 'none' ? {
          is_blocker: true,
          blocked_work: formData.blocked_work,
          blocked_team: formData.blocked_team,
          blocked_since: new Date().toISOString()
        } : null,
        smart_due_date: calculatedDueDate ? {
          impacted_task_start: calculatedDueDate.impacted_task_start,
          calculated_due_date: calculatedDueDate.due_date,
          days_until_impact: calculatedDueDate.days_until_impact
        } : null
      });
    },
    onSuccess: (data) => {
      toast.success(`RFI #${data.rfi_number} created (internal review)`);
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      onSubmit?.(data);
    },
    onError: (err) => toast.error(`Error: ${err.message}`)
  });

  const handleSubmit = async () => {
    if (!formData.rfi_type || !formData.subject || !formData.question) {
      toast.error('Missing required fields');
      return;
    }
    createRFIMutation.mutate(formData);
  };

  // Step 1: Type & Discipline
  if (step === 'type') {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Step 1: RFI Type & Discipline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-bold text-zinc-300 block mb-2">RFI Type *</label>
            <Select value={formData.rfi_type} onValueChange={(val) => setFormData({...formData, rfi_type: val})}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {RFI_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-bold text-zinc-300 block mb-2">Subject *</label>
            <Input
              placeholder="RFI subject line"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-zinc-300 block mb-2">Discipline</label>
            <Input
              placeholder="e.g., Steel Erection, Connections"
              value={formData.discipline}
              onChange={(e) => setFormData({...formData, discipline: e.target.value})}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          {routingInfo && (
            <div className="p-3 bg-blue-900/30 border border-blue-700 rounded text-sm">
              <div className="text-blue-300 font-bold">Routing Info:</div>
              <div className="text-blue-200 mt-1">{routingInfo.routed_by_type}</div>
              <div className="text-xs text-blue-400 mt-1">Ball in court: {routingInfo.recommended_ball_in_court}</div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => setStep('details')} className="bg-amber-600">Next: Details</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Details & Links
  if (step === 'details') {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Step 2: Question & Linkages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-bold text-zinc-300 block mb-2">Question *</label>
            <Textarea
              placeholder="Detailed question / request"
              value={formData.question}
              onChange={(e) => setFormData({...formData, question: e.target.value})}
              className="bg-zinc-800 border-zinc-700 h-24"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-zinc-300 block mb-2">Location / Area</label>
            <Input
              placeholder="Grid A-B/1-3, Level 2, etc."
              value={formData.location_area}
              onChange={(e) => setFormData({...formData, location_area: e.target.value})}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-zinc-300 block mb-2">Spec Section</label>
            <Input
              placeholder="e.g., 05100, 05500"
              value={formData.spec_section}
              onChange={(e) => setFormData({...formData, spec_section: e.target.value})}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-zinc-300 block mb-2">Link Impacted Tasks</label>
            <Select value={formData.linked_task_ids[0] || ''} onValueChange={(val) => setFormData({...formData, linked_task_ids: val ? [val] : []})}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select task..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {tasks.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.phase})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {calculatedDueDate && (
              <div className="text-xs text-zinc-400 mt-2">
                Due: {calculatedDueDate.due_date} ({calculatedDueDate.days_until_impact} days)
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-bold text-zinc-300 block mb-2">Link Drawings</label>
            <Select value={formData.linked_drawing_set_ids[0] || ''} onValueChange={(val) => setFormData({...formData, linked_drawing_set_ids: val ? [val] : []})}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select drawing set..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {drawings.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.set_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setStep('type')}>Back</Button>
            <Button onClick={() => setStep('blocker')} className="bg-amber-600">Next: Blocker</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Blocker Info
  if (step === 'blocker') {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Step 3: Impact & Blockers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-bold text-zinc-300 block mb-2">Does This Block Work?</label>
            <Select value={formData.blocked_work} onValueChange={(val) => setFormData({...formData, blocked_work: val})}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="none">No Blocker</SelectItem>
                <SelectItem value="fabrication">Blocks Fabrication</SelectItem>
                <SelectItem value="delivery">Blocks Delivery</SelectItem>
                <SelectItem value="erection">Blocks Erection</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.blocked_work !== 'none' && (
            <div>
              <label className="text-sm font-bold text-zinc-300 block mb-2">Blocked Team/Crew</label>
              <Input
                placeholder="e.g., Erection Crew A"
                value={formData.blocked_team}
                onChange={(e) => setFormData({...formData, blocked_team: e.target.value})}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          )}

          {impacts && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded text-sm space-y-2">
              <div className="text-red-300 font-bold flex items-center gap-2">
                <AlertTriangle size={16} /> Detected Impacts
              </div>
              {impacts.fabrication_blocked && <div className="text-red-200">🔴 Fabrication blocked</div>}
              {impacts.delivery_blocked && <div className="text-red-200">🔴 Delivery blocked</div>}
              {impacts.erection_blocked && <div className="text-red-200">🔴 Erection blocked</div>}
              {impacts.blocked_crews.length > 0 && (
                <div className="text-red-200">{impacts.blocked_crews.length} crew(s) waiting</div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setStep('details')}>Back</Button>
            <Button onClick={handleSubmit} disabled={createRFIMutation.isPending} className="bg-green-600">
              {createRFIMutation.isPending ? 'Creating...' : 'Create RFI (Internal Review)'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
}