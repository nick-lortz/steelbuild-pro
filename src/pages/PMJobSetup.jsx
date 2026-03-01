import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import PMProjectSelector from '@/components/pm-toolkit/PMProjectSelector';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Plus, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

const DEFAULT_CHECKLIST = [
  { title: 'Project Information', order: 0 },
  { title: 'Drawings / Revisions / Submittals', order: 1 },
  { title: 'RFIs', order: 2 },
  { title: 'Work Packages', order: 3 },
  { title: 'Schedule', order: 4 },
  { title: 'Budget & Financials', order: 5 },
  { title: 'SOV', order: 6 },
  { title: 'Labor & Scope', order: 7 },
  { title: 'Resources', order: 8 },
  { title: 'Change Orders', order: 9 },
];

export default function PMJobSetup() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [showEmailDraft, setShowEmailDraft] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [seeding, setSeeding] = useState(false);

  const { data: checklistItems = [], isLoading } = useQuery({
    queryKey: ['checklistItems', activeProjectId],
    queryFn: () => base44.entities.ProjectChecklistItem.filter({ project_id: activeProjectId, category: 'job_setup' }),
    enabled: !!activeProjectId
  });

  const { data: emailTemplates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.filter({ category: 'job_setup' })
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectChecklistItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['checklistItems'])
  });

  // Auto-seed default checklist when a project has no items
  useEffect(() => {
    if (!activeProjectId || isLoading || checklistItems.length > 0 || seeding) return;
    setSeeding(true);
    Promise.all(
      DEFAULT_CHECKLIST.map(item =>
        base44.entities.ProjectChecklistItem.create({
          project_id: activeProjectId,
          category: 'job_setup',
          title: item.title,
          order: item.order,
          status: 'not_started',
          required: false
        })
      )
    ).then(() => {
      queryClient.invalidateQueries(['checklistItems']);
      setSeeding(false);
    });
  }, [activeProjectId, isLoading, checklistItems.length]);

  const toggleStatus = (item) => {
    const newStatus = item.status === 'completed' ? 'not_started' : 'completed';
    updateItemMutation.mutate({
      id: item.id,
      data: {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
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
        <div className="flex items-center gap-4">
          <PMProjectSelector />
          <Badge className="text-lg px-4 py-2">{progress}% Complete</Badge>
        </div>
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Checklist Items</CardTitle>
              <CardDescription>{completedCount} of {totalCount} completed</CardDescription>
            </div>
            <Button onClick={() => {
              const title = prompt('Task title:');
              if (!title) return;
              base44.entities.ProjectChecklistItem.create({
                project_id: activeProjectId,
                category: 'job_setup',
                title,
                status: 'not_started',
                order: checklistItems.length
              }).then(() => {
                queryClient.invalidateQueries(['checklistItems']);
                toast.success('Task added');
              });
            }} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Templates
              </CardTitle>
              <CardDescription>Draft job setup communications</CardDescription>
            </div>
            <Button onClick={() => {
              const name = prompt('Template name:');
              if (!name) return;
              const subject = prompt('Email subject:');
              if (!subject) return;
              base44.entities.EmailTemplate.create({
                name,
                subject,
                body: 'Enter email content here...',
                category: 'job_setup'
              }).then(() => {
                queryClient.invalidateQueries(['emailTemplates']);
                toast.success('Template created');
              });
            }} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Template
            </Button>
          </div>
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