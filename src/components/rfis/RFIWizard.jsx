import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, CheckCircle, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RFIWizard({ rfi, projects, drawings, changeOrders, submittals, deliveries, onSubmit, onCancel, isLoading, templateData }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    project_id: rfi?.project_id || templateData?.project_id || '',
    rfi_number: rfi?.rfi_number || '',
    subject: rfi?.subject || templateData?.fields?.subject || '',
    category: rfi?.category || templateData?.category || 'structural',
    discipline: rfi?.discipline || templateData?.fields?.discipline || '',
    location_area: rfi?.location_area || '',
    spec_section: rfi?.spec_section || templateData?.fields?.spec_section || '',
    question: rfi?.question || templateData?.fields?.question || '',
    status: rfi?.status || 'draft',
    priority: rfi?.priority || 'medium',
    ball_in_court: rfi?.ball_in_court || 'internal',
    assigned_to: rfi?.assigned_to || '',
    response_owner: rfi?.response_owner || '',
    distribution_list: rfi?.distribution_list || [],
    external_contacts: rfi?.external_contacts || [],
    due_date: rfi?.due_date?.split('T')[0] || '',
    days_to_respond: rfi?.days_to_respond || 5,
    cost_impact: rfi?.cost_impact || 'unknown',
    schedule_impact: rfi?.schedule_impact || 'unknown',
    estimated_cost_impact: rfi?.estimated_cost_impact || 0,
    schedule_impact_days: rfi?.schedule_impact_days || 0,
    linked_drawing_set_ids: rfi?.linked_drawing_set_ids || [],
    linked_change_order_ids: rfi?.linked_change_order_ids || [],
    linked_submittal_ids: rfi?.linked_submittal_ids || [],
    linked_delivery_ids: rfi?.linked_delivery_ids || [],
    template_used: templateData?.name || rfi?.template_used || ''
  });

  const [newContact, setNewContact] = useState({ name: '', email: '', company: '', role: '' });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addDistributionEmail = (email) => {
    if (email && !formData.distribution_list.includes(email)) {
      handleChange('distribution_list', [...formData.distribution_list, email]);
    }
  };

  const removeDistributionEmail = (email) => {
    handleChange('distribution_list', formData.distribution_list.filter(e => e !== email));
  };

  const addExternalContact = () => {
    if (newContact.name && newContact.email) {
      handleChange('external_contacts', [...formData.external_contacts, { ...newContact }]);
      setNewContact({ name: '', email: '', company: '', role: '' });
    }
  };

  const removeExternalContact = (index) => {
    handleChange('external_contacts', formData.external_contacts.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!formData.project_id || !formData.subject) {
      toast.error('Project and subject are required');
      return;
    }

    onSubmit(formData);
  };

  const canProceed = () => {
    if (step === 1) return formData.project_id && formData.subject && formData.question;
    if (step === 2) return true;
    return true;
  };

  const projectDrawings = drawings?.filter(d => d.project_id === formData.project_id) || [];
  const projectCOs = changeOrders?.filter(co => co.project_id === formData.project_id) || [];

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {['Question', 'Impact & Links', 'Distribution', 'Review'].map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = step === stepNum;
          const isComplete = step > stepNum;
          return (
            <div key={stepNum} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  isActive ? 'border-amber-500 bg-amber-500 text-black' :
                  isComplete ? 'border-green-500 bg-green-500 text-black' :
                  'border-zinc-700 text-zinc-500'
                }`}>
                  {isComplete ? <CheckCircle size={16} /> : stepNum}
                </div>
                <span className={`text-xs mt-1 ${isActive ? 'text-white' : 'text-zinc-500'}`}>{label}</span>
              </div>
              {idx < 3 && <div className={`flex-1 h-0.5 mx-2 ${step > stepNum ? 'bg-green-500' : 'bg-zinc-800'}`} />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Question */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Project *</Label>
            <Select value={formData.project_id} onValueChange={(v) => handleChange('project_id', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="structural">Structural</SelectItem>
                  <SelectItem value="architectural">Architectural</SelectItem>
                  <SelectItem value="mep">MEP</SelectItem>
                  <SelectItem value="coordination">Coordination</SelectItem>
                  <SelectItem value="clarification">Clarification</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Discipline</Label>
              <Input
                value={formData.discipline}
                onChange={(e) => handleChange('discipline', e.target.value)}
                placeholder="e.g., Steel Erection"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Spec Section</Label>
              <Input
                value={formData.spec_section}
                onChange={(e) => handleChange('spec_section', e.target.value)}
                placeholder="e.g., 05 12 00"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location/Area/Gridlines</Label>
            <Input
              value={formData.location_area}
              onChange={(e) => handleChange('location_area', e.target.value)}
              placeholder="e.g., Grid A-B/1-3, Level 2"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              placeholder="Brief title of the RFI"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="space-y-2">
            <Label>Question *</Label>
            <Textarea
              value={formData.question}
              onChange={(e) => handleChange('question', e.target.value)}
              rows={8}
              placeholder="Detailed question or request for information..."
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
        </div>
      )}

      {/* Step 2: Impact & Links */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cost Impact</Label>
              <Select value={formData.cost_impact} onValueChange={(v) => handleChange('cost_impact', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Schedule Impact</Label>
              <Select value={formData.schedule_impact} onValueChange={(v) => handleChange('schedule_impact', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SLA Days</Label>
              <Input
                type="number"
                value={formData.days_to_respond}
                onChange={(e) => handleChange('days_to_respond', parseInt(e.target.value) || 5)}
                className="bg-zinc-800 border-zinc-700"
                min="1"
              />
            </div>
          </div>

          {formData.cost_impact === 'yes' && (
            <div className="space-y-2">
              <Label>Estimated Cost Impact ($)</Label>
              <Input
                type="number"
                value={formData.estimated_cost_impact}
                onChange={(e) => handleChange('estimated_cost_impact', parseFloat(e.target.value) || 0)}
                className="bg-zinc-800 border-zinc-700"
                placeholder="0"
              />
            </div>
          )}

          {formData.schedule_impact === 'yes' && (
            <div className="space-y-2">
              <Label>Schedule Impact (days)</Label>
              <Input
                type="number"
                value={formData.schedule_impact_days}
                onChange={(e) => handleChange('schedule_impact_days', parseFloat(e.target.value) || 0)}
                className="bg-zinc-800 border-zinc-700"
                placeholder="0"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Linked Drawing Sets</Label>
            <Select
              value={formData.linked_drawing_set_ids[0] || ''}
              onValueChange={(v) => {
                if (v && !formData.linked_drawing_set_ids.includes(v)) {
                  handleChange('linked_drawing_set_ids', [...formData.linked_drawing_set_ids, v]);
                }
              }}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select drawing sets" />
              </SelectTrigger>
              <SelectContent>
                {projectDrawings.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.set_number} - {d.set_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.linked_drawing_set_ids.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.linked_drawing_set_ids.map(id => {
                  const drawing = projectDrawings.find(d => d.id === id);
                  return drawing ? (
                    <Badge key={id} className="bg-zinc-700">
                      {drawing.set_number}
                      <button
                        type="button"
                        onClick={() => handleChange('linked_drawing_set_ids', formData.linked_drawing_set_ids.filter(did => did !== id))}
                        className="ml-2 hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Linked Change Orders</Label>
            <Select
              value={formData.linked_change_order_ids[0] || ''}
              onValueChange={(v) => {
                if (v && !formData.linked_change_order_ids.includes(v)) {
                  handleChange('linked_change_order_ids', [...formData.linked_change_order_ids, v]);
                }
              }}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select change orders" />
              </SelectTrigger>
              <SelectContent>
                {projectCOs.map(co => (
                  <SelectItem key={co.id} value={co.id}>CO-{String(co.co_number).padStart(3, '0')} - {co.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.linked_change_order_ids.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.linked_change_order_ids.map(id => {
                  const co = projectCOs.find(c => c.id === id);
                  return co ? (
                    <Badge key={id} className="bg-zinc-700">
                      CO-{String(co.co_number).padStart(3, '0')}
                      <button
                        type="button"
                        onClick={() => handleChange('linked_change_order_ids', formData.linked_change_order_ids.filter(cid => cid !== id))}
                        className="ml-2 hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Distribution */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assigned To (Internal)</Label>
              <Input
                value={formData.assigned_to}
                onChange={(e) => handleChange('assigned_to', e.target.value)}
                placeholder="Person managing this RFI"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Response Owner (External)</Label>
              <Input
                value={formData.response_owner}
                onChange={(e) => handleChange('response_owner', e.target.value)}
                placeholder="Who will provide answer"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ball in Court</Label>
            <Select value={formData.ball_in_court} onValueChange={(v) => handleChange('ball_in_court', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="external">External</SelectItem>
                <SelectItem value="gc">GC</SelectItem>
                <SelectItem value="architect">Architect</SelectItem>
                <SelectItem value="engineer">Engineer</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Distribution List</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Add email address"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addDistributionEmail(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            {formData.distribution_list.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.distribution_list.map((email, idx) => (
                  <Badge key={idx} className="bg-zinc-700">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeDistributionEmail(email)}
                      className="ml-2 hover:text-red-400"
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>External Contacts</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
              <Input
                type="email"
                placeholder="Email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
              <Input
                placeholder="Company"
                value={newContact.company}
                onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
              <Input
                placeholder="Role"
                value={newContact.role}
                onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={addExternalContact}
              disabled={!newContact.name || !newContact.email}
              className="bg-zinc-700 hover:bg-zinc-600"
            >
              <Plus size={14} className="mr-2" />
              Add Contact
            </Button>

            {formData.external_contacts.length > 0 && (
              <div className="space-y-2 mt-3">
                {formData.external_contacts.map((contact, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-zinc-800 rounded">
                    <div>
                      <p className="text-sm font-medium">{contact.name}</p>
                      <p className="text-xs text-zinc-400">{contact.email} • {contact.company} • {contact.role}</p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeExternalContact(idx)}
                      className="h-6 w-6 text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-zinc-400">Category:</span> <span className="text-white capitalize">{formData.category}</span></div>
            <div><span className="text-zinc-400">Priority:</span> <span className="text-white capitalize">{formData.priority}</span></div>
            <div><span className="text-zinc-400">Location:</span> <span className="text-white">{formData.location_area || '-'}</span></div>
            <div><span className="text-zinc-400">Spec:</span> <span className="text-white">{formData.spec_section || '-'}</span></div>
            <div><span className="text-zinc-400">Assigned:</span> <span className="text-white">{formData.assigned_to || '-'}</span></div>
            <div><span className="text-zinc-400">Ball in Court:</span> <span className="text-white capitalize">{formData.ball_in_court}</span></div>
            <div><span className="text-zinc-400">Cost Impact:</span> <span className="text-white capitalize">{formData.cost_impact}</span></div>
            <div><span className="text-zinc-400">Schedule Impact:</span> <span className="text-white capitalize">{formData.schedule_impact}</span></div>
          </div>

          <Card className="bg-zinc-800 border-zinc-700 p-4">
            <h4 className="font-bold text-sm mb-2">Subject</h4>
            <p className="text-white">{formData.subject}</p>
          </Card>

          <Card className="bg-zinc-800 border-zinc-700 p-4">
            <h4 className="font-bold text-sm mb-2">Question</h4>
            <p className="text-white whitespace-pre-wrap">{formData.question}</p>
          </Card>

          {formData.distribution_list.length > 0 && (
            <Card className="bg-zinc-800 border-zinc-700 p-4">
              <h4 className="font-bold text-sm mb-2">Distribution ({formData.distribution_list.length})</h4>
              <div className="flex flex-wrap gap-2">
                {formData.distribution_list.map((email, idx) => (
                  <Badge key={idx} className="bg-zinc-700">{email}</Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-zinc-800">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-zinc-700"
        >
          <X size={16} className="mr-2" />
          Cancel
        </Button>

        <div className="flex gap-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="border-zinc-700"
            >
              <ChevronLeft size={16} className="mr-2" />
              Back
            </Button>
          )}

          {step < 4 ? (
            <Button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Next
              <ChevronRight size={16} className="ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle size={16} className="mr-2" />
              {isLoading ? 'Saving...' : rfi ? 'Update RFI' : 'Submit RFI'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}