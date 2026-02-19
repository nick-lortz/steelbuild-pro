import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ResourceForm({ resource, projects, onSubmit, onCancel, isLoading }) {

  const NONE_PROJECT_VALUE = '__none__';

  const buildDefaultFormData = () => ({
    type: 'labor',
    name: '',
    role: '',
    classification: '',
    skills: [],
    rate: '',
    rate_type: 'hourly',
    status: 'available',
    availability_start: '',
    availability_end: '',
    current_project_id: NONE_PROJECT_VALUE,
    assigned_project_ids: [],
    certifications: [],
    max_concurrent_assignments: 3,
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    notes: '',
  });

  const buildResourceFormData = (resourceData) => ({
    ...buildDefaultFormData(),
    ...resourceData,
    skills: Array.isArray(resourceData?.skills) ? resourceData.skills : [],
    certifications: Array.isArray(resourceData?.certifications) ? resourceData.certifications : [],
    assigned_project_ids: Array.isArray(resourceData?.assigned_project_ids)
      ? resourceData.assigned_project_ids
      : [],
    rate: resourceData?.rate || '',
    max_concurrent_assignments: resourceData?.max_concurrent_assignments || 3,
    current_project_id: resourceData?.current_project_id || NONE_PROJECT_VALUE,
  });

  const [formData, setFormData] = useState(buildDefaultFormData());
  const [skillInput, setSkillInput] = useState('');
  const [certInput, setCertInput] = useState('');

  useEffect(() => {
    if (resource) {
      setFormData(buildResourceFormData(resource));
    } else {
      setFormData(buildDefaultFormData());
    }
  }, [resource]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      handleChange('skills', [...formData.skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    handleChange('skills', formData.skills.filter(s => s !== skill));
  };

  const addCertification = () => {
    if (certInput.trim() && !formData.certifications.includes(certInput.trim())) {
      handleChange('certifications', [...formData.certifications, certInput.trim()]);
      setCertInput('');
    }
  };

  const removeCertification = (cert) => {
    handleChange('certifications', formData.certifications.filter(c => c !== cert));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      type: formData.type,
      name: formData.name.trim(),
      role: formData.role || null,
      classification: formData.classification || null,
      skills: formData.skills || [],
      certifications: formData.certifications || [],
      rate: formData.rate ? parseFloat(formData.rate) : 0,
      rate_type: formData.rate_type,
      status: formData.status,
      availability_start: formData.availability_start || null,
      availability_end: formData.availability_end || null,
      current_project_id:
        formData.current_project_id === NONE_PROJECT_VALUE
          ? null
          : formData.current_project_id,
      assigned_project_ids: formData.assigned_project_ids || [],
      max_concurrent_assignments: parseInt(formData.max_concurrent_assignments) || 3,
      contact_name: formData.contact_name || null,
      contact_phone: formData.contact_phone || null,
      contact_email: formData.contact_email || null,
      notes: formData.notes || null
    };

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type *</Label>
          <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="labor">Labor</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="subcontractor">Subcontractor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div>
        <Label>Primary Project</Label>
        <Select
          value={formData.current_project_id}
          onValueChange={(v) => handleChange('current_project_id', v)}
        >
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_PROJECT_VALUE}>None</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.project_number} - {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-amber-500 hover:bg-amber-600 text-black">
          {isLoading ? 'Saving...' : resource ? 'Update' : 'Create'}
        </Button>
      </div>

    </form>
  );
}
