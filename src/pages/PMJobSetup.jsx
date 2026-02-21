import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Plus, Mail, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PMJobSetup() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [showEmailDraft, setShowEmailDraft] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const { data: checklistItems = [], isLoading } = useQuery({
    queryKey: ['checklistItems', activeProjectId],
    queryFn: () => base44.entities.ProjectChecklistItem.filter({ project_id: activeProjectId, category: 'job_setup' }),
    enabled: !!activeProjectId
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: () => base44.entities.ProjectChecklistTemplate.filter({ category: 'job_setup' })
  });

  const { data: emailTemplates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.filter({ category: 'job_setup' })
  });

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => base44.entities.Project.filter({ id: activeProjectId }),
    enabled: !!activeProjectId,
    select: (data) => data[0]
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectChecklistItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['checklistItems'])
  });

  const createFromTemplate = useMutation({
    mutationFn: async (templateId) => {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;
      
      const promises = template.items.map((item, idx) =>
        base44.entities.ProjectChecklistItem.create({
          project_id: activeProjectId,
          category: 'job_setup',
          title: item.title,
          description: item.description,
          required: item.required || false,
          order: item.order || idx,
          status: 'not_started'
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['checklistItems']);
      toast.success('Checklist items created from template');
    }
  });

  const toggleStatus = (item) => {
    const newStatus = item.status === 'completed' ? 'not_started' : 'completed';
    updateItemMutation.mutate({
      id: item.id,
      data: {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        completed_by: newStatus === 'completed' ? (project?.project_manager || 'current_user') : null
      }
    });
  };

  const completedCount = checklistItems.filter(i => i.status === 'completed').length;
  const totalCount = checklistItems.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Select a project to view job setup checklist
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#E5E7EB]">Job Setup</h1>
          <p className="text-sm text-[#9CA3AF]">"So You've Won a Job" - Kickoff Tasks & Communications</p>
        </div>
        <Badge className="text-lg px-4 py-2">{progress}% Complete</Badge>
      </div>

      {checklistItems.length === 0 && templates.length > 0 && (
        <Card className="border-[#FF9D42]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#FF9D42]" />
              Initialize Job Setup
            </CardTitle>
            <CardDescription>Load the standard job won checklist to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {templates.map(template => (
                <Button
                  key={template.id}
                  onClick={() => createFromTemplate.mutate(template.id)}
                  disabled={createFromTemplate.isPending}
                >
                  Load: {template.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Checklist Items</CardTitle>
          <CardDescription>{completedCount} of {totalCount} completed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checklistItems.sort((a, b) => (a.order || 0) - (b.order || 0)).map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,157,66,0.2)] transition-colors"
            >
              <button onClick={() => toggleStatus(item)} className="mt-0.5">
                {item.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-[#6B7280]" />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={`font-medium ${item.status === 'completed' ? 'line-through text-[#6B7280]' : 'text-[#E5E7EB]'}`}>
                    {item.title}
                  </h4>
                  {item.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                </div>
                {item.description && (
                  <p className="text-sm text-[#9CA3AF] mt-1">{item.description}</p>
                )}
                {item.assigned_to && (
                  <p className="text-xs text-[#6B7280] mt-2">Assigned: {item.assigned_to}</p>
                )}
              </div>
            </div>
          ))}

          {checklistItems.length === 0 && templates.length === 0 && (
            <div className="text-center py-8 text-[#6B7280]">
              No checklist items yet. Create your first task above.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Templates
          </CardTitle>
          <CardDescription>Draft job setup communications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {emailTemplates.map(template => (
            <Button
              key={template.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setSelectedTemplate(template);
                setShowEmailDraft(true);
              }}
            >
              <Mail className="w-4 h-4 mr-2" />
              {template.name}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}