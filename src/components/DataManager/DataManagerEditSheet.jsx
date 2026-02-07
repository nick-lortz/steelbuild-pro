import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';

export default function DataManagerEditSheet({
  entityId,
  entityConfig,
  record,
  projectId,
  projects,
  showAllProjects,
  onClose
}) {
  const [formData, setFormData] = useState({
    project_id: record?.project_id || projectId,
    ...Object.fromEntries(
      entityConfig.fields.map(f => [f.name, record?.[f.name] || (f.type === 'checkbox' ? false : '')])
    )
  });

  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  const isNew = !record;

  // Validation
  const validate = () => {
    const newErrors = {};

    entityConfig.fields.forEach(field => {
      const value = formData[field.name];

      if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        newErrors[field.name] = `${field.label} is required`;
      }

      if (field.min !== undefined && value && Number(value) < field.min) {
        newErrors[field.name] = `${field.label} must be >= ${field.min}`;
      }

      if (field.max !== undefined && value && Number(value) > field.max) {
        newErrors[field.name] = `${field.label} must be <= ${field.max}`;
      }

      if (field.type === 'date' && value && isNaN(new Date(value).getTime())) {
        newErrors[field.name] = 'Invalid date';
      }
    });

    // Project required
    if (!formData.project_id) {
      newErrors.project_id = 'Project is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        project_id: formData.project_id,
        ...Object.fromEntries(
          entityConfig.fields.map(f => [f.name, formData[f.name]])
        )
      };
      return base44.entities[entityConfig.entityName].create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityId] });
      toast.success(`${entityConfig.singularLabel} created`);
      onClose();
    },
    onError: (err) => toast.error(`Create failed: ${err.message}`)
  });

  const updateMutation = useMutation({
    mutationFn: (data) => {
      const payload = Object.fromEntries(
        entityConfig.fields.map(f => [f.name, formData[f.name]])
      );
      return base44.entities[entityConfig.entityName].update(record.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityId] });
      toast.success(`${entityConfig.singularLabel} updated`);
      onClose();
    },
    onError: (err) => toast.error(`Update failed: ${err.message}`)
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities[entityConfig.entityName].delete(record.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityId] });
      toast.success(`${entityConfig.singularLabel} deleted`);
      onClose();
    },
    onError: (err) => toast.error(`Delete failed: ${err.message}`)
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (isNew) {
      createMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  };

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isNew ? `New ${entityConfig.singularLabel}` : `Edit ${entityConfig.singularLabel}`}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Project Selection */}
          {(isNew || showAllProjects) && (
            <div>
              <Label>Project *</Label>
              <Select value={formData.project_id || ''} onValueChange={(val) => handleChange('project_id', val)}>
                <SelectTrigger className={errors.project_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_number} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.project_id && <p className="text-xs text-red-500 mt-1">{errors.project_id}</p>}
            </div>
          )}

          {/* Fields */}
          {entityConfig.fields.map(field => {
            const value = formData[field.name];
            const error = errors[field.name];

            return (
              <div key={field.name}>
                <Label>{field.label} {field.required && '*'}</Label>

                {field.type === 'text' && (
                  <Input
                    value={value || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className={error ? 'border-red-500' : ''}
                    placeholder={field.label}
                  />
                )}

                {field.type === 'textarea' && (
                  <Textarea
                    value={value || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className={error ? 'border-red-500' : ''}
                    rows={3}
                    placeholder={field.label}
                  />
                )}

                {field.type === 'number' && (
                  <Input
                    type="number"
                    value={value || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className={error ? 'border-red-500' : ''}
                    min={field.min}
                    max={field.max}
                    step="any"
                    placeholder={field.label}
                  />
                )}

                {field.type === 'date' && (
                  <Input
                    type="date"
                    value={value || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className={error ? 'border-red-500' : ''}
                  />
                )}

                {field.type === 'select' && (
                  <Select value={value || ''} onValueChange={(val) => handleChange(field.name, val)}>
                    <SelectTrigger className={error ? 'border-red-500' : ''}>
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map(opt => (
                        <SelectItem key={opt} value={opt}>
                          {opt.replace(/_/g, ' ').charAt(0).toUpperCase() + opt.slice(1).replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {field.type === 'checkbox' && (
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      checked={value || false}
                      onCheckedChange={(checked) => handleChange(field.name, checked)}
                    />
                    <span className="text-sm">{field.label}</span>
                  </div>
                )}

                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
              </div>
            );
          })}
        </form>

        <SheetFooter className="mt-8 gap-2 flex justify-between">
          {!isNew && (
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Delete this record?')) {
                  deleteMutation.mutate();
                }
              }}
              disabled={isLoading}
              className="flex-0"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isNew ? 'Create' : 'Update'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}