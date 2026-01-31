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
  const [formData, setFormData] = useState(() => {
    if (resource) {
      return {
        ...resource,
        skills: Array.isArray(resource.skills) ? resource.skills : [],
        certifications: Array.isArray(resource.certifications) ? resource.certifications : [],
        assigned_project_ids: Array.isArray(resource.assigned_project_ids) ? resource.assigned_project_ids : [],
        rate: resource.rate || '',
        max_concurrent_assignments: resource.max_concurrent_assignments || 3,
      };
    }
    return {
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
      current_project_id: '',
      assigned_project_ids: [],
      certifications: [],
      max_concurrent_assignments: 3,
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      notes: '',
    };
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (resource) {
      setFormData({
        ...resource,
        skills: Array.isArray(resource.skills) ? resource.skills : [],
        certifications: Array.isArray(resource.certifications) ? resource.certifications : [],
        assigned_project_ids: Array.isArray(resource.assigned_project_ids) ? resource.assigned_project_ids : [],
        rate: resource.rate || '',
        max_concurrent_assignments: resource.max_concurrent_assignments || 3,
      });
    }
  }, [resource]);

  const [skillInput, setSkillInput] = useState('');
  const [certInput, setCertInput] = useState('');

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
      ...formData,
      rate: formData.rate ? parseFloat(formData.rate) : undefined,
      max_concurrent_assignments: parseInt(formData.max_concurrent_assignments) || 3,
    };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type *</Label>
          <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="labor">Labor</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="subcontractor">Subcontractor</SelectItem>
              <SelectItem value="material">Material</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
              <SelectItem value="tool">Tool</SelectItem>
              <SelectItem value="consumable">Consumable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Resource name"
            required
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Role/Position</Label>
          <Input
            value={formData.role}
            onChange={(e) => handleChange('role', e.target.value)}
            placeholder="e.g., Lead Ironworker"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <Label>Classification</Label>
          <Input
            value={formData.classification}
            onChange={(e) => handleChange('classification', e.target.value)}
            placeholder="e.g., Ironworker, Crane Operator"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <Label>Skills & Capabilities</Label>
        <div className="flex gap-2">
          <Input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="Add skill (AWS Certified, Rigging, etc.)"
            className="bg-zinc-800 border-zinc-700"
          />
          <Button type="button" onClick={addSkill} size="sm" className="bg-zinc-700 hover:bg-zinc-600">
            Add
          </Button>
        </div>
        {formData.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.skills.map((skill, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="bg-blue-500/20 text-blue-400 border-blue-500/40 cursor-pointer hover:bg-blue-500/30"
                onClick={() => removeSkill(skill)}
              >
                {skill} ×
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Certifications */}
      <div className="space-y-2">
        <Label>Certifications</Label>
        <div className="flex gap-2">
          <Input
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCertification();
              }
            }}
            placeholder="Add certification"
            className="bg-zinc-800 border-zinc-700"
          />
          <Button type="button" onClick={addCertification} size="sm" className="bg-zinc-700 hover:bg-zinc-600">
            Add
          </Button>
        </div>
        {formData.certifications.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.certifications.map((cert, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="bg-green-500/20 text-green-400 border-green-500/40 cursor-pointer hover:bg-green-500/30"
                onClick={() => removeCertification(cert)}
              >
                {cert} ×
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Rate</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.rate}
            onChange={(e) => handleChange('rate', e.target.value)}
            placeholder="0.00"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <Label>Rate Type</Label>
          <Select value={formData.rate_type} onValueChange={(v) => handleChange('rate_type', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="lump_sum">Lump Sum</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Max Concurrent Tasks</Label>
          <Input
            type="number"
            min="1"
            max="10"
            value={formData.max_concurrent_assignments}
            onChange={(e) => handleChange('max_concurrent_assignments', e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Available From</Label>
          <Input
            type="date"
            value={formData.availability_start}
            onChange={(e) => handleChange('availability_start', e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <Label>Available Until</Label>
          <Input
            type="date"
            value={formData.availability_end}
            onChange={(e) => handleChange('availability_end', e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Primary Project</Label>
        <Select value={formData.current_project_id || ''} onValueChange={(v) => handleChange('current_project_id', v)}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>None</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Additional Projects (Multi-Assign)</Label>
        <div className="flex flex-wrap gap-2 p-2 bg-zinc-800 border border-zinc-700 rounded min-h-[42px]">
          {(formData.assigned_project_ids || []).map(projId => {
            const proj = projects.find(p => p.id === projId);
            return proj ? (
              <Badge
                key={projId}
                variant="secondary"
                className="bg-amber-500/20 text-amber-400 border-amber-500/40 cursor-pointer hover:bg-amber-500/30"
                onClick={() => handleChange('assigned_project_ids', (formData.assigned_project_ids || []).filter(id => id !== projId))}
              >
                {proj.project_number} ×
              </Badge>
            ) : null;
          })}
        </div>
        <Select 
          value="" 
          onValueChange={(v) => {
            if (v && !(formData.assigned_project_ids || []).includes(v)) {
              handleChange('assigned_project_ids', [...(formData.assigned_project_ids || []), v]);
            }
          }}
        >
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Add project..." />
          </SelectTrigger>
          <SelectContent>
            {projects
              .filter(p => !(formData.assigned_project_ids || []).includes(p.id))
              .map(p => (
                <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contact Info */}
      <div className="space-y-2">
        <Label>Contact Name</Label>
        <Input
          value={formData.contact_name}
          onChange={(e) => handleChange('contact_name', e.target.value)}
          placeholder="Contact person"
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Contact Phone</Label>
          <Input
            value={formData.contact_phone}
            onChange={(e) => handleChange('contact_phone', e.target.value)}
            placeholder="(555) 555-5555"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <Label>Contact Email</Label>
          <Input
            type="email"
            value={formData.contact_email}
            onChange={(e) => handleChange('contact_email', e.target.value)}
            placeholder="email@example.com"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          placeholder="Additional notes..."
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel} className="border-zinc-700">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-amber-500 hover:bg-amber-600 text-black">
          {isLoading ? 'Saving...' : resource ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}