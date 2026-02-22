import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';

export default function ProjectStatusEmail() {
  const { activeProjectId } = useActiveProject();
  const [selectedProjectId, setSelectedProjectId] = useState(activeProjectId || '');
  const [recipients, setRecipients] = useState('');
  const [includeBlockers, setIncludeBlockers] = useState(true);
  const [includeMetrics, setIncludeMetrics] = useState(true);

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => base44.entities.Project.filter({
      status: { $in: ['awarded', 'in_progress', 'on_hold'] }
    }),
    staleTime: 5 * 60 * 1000
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await base44.functions.invoke('sendProjectStatusUpdate', payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Status update sent to ${data.data.recipients} recipient(s)`);
      setRecipients('');
    },
    onError: (error) => {
      toast.error('Failed to send status update: ' + error.message);
    }
  });

  const handleSend = () => {
    if (!selectedProjectId) {
      toast.error('Select a project');
      return;
    }
    
    const emailList = recipients.split(',').map(e => e.trim()).filter(e => e);
    if (emailList.length === 0) {
      toast.error('Enter at least one recipient email');
      return;
    }

    sendEmailMutation.mutate({
      project_id: selectedProjectId,
      recipient_emails: emailList,
      include_blockers: includeBlockers,
      include_metrics: includeMetrics
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#E5E7EB] flex items-center gap-3">
          <Mail className="w-8 h-8 text-[#FF9D42]" />
          Send Project Status Update
        </h1>
        <p className="text-sm text-[#6B7280] mt-2">Email project health and blockers via Gmail</p>
      </div>

      <Card className="bg-[#0A0A0A]/90">
        <CardHeader>
          <CardTitle className="text-lg">Email Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Selection */}
          <div>
            <Label htmlFor="project">Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_number} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipients */}
          <div>
            <Label htmlFor="recipients">Recipients (comma-separated)</Label>
            <Input
              id="recipients"
              type="text"
              placeholder="john@gc.com, jane@owner.com"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-[#6B7280] mt-1">Separate multiple emails with commas</p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="metrics" 
                checked={includeMetrics}
                onCheckedChange={setIncludeMetrics}
              />
              <Label htmlFor="metrics" className="font-normal cursor-pointer">
                Include key metrics (RFIs, tasks, deliveries)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="blockers" 
                checked={includeBlockers}
                onCheckedChange={setIncludeBlockers}
              />
              <Label htmlFor="blockers" className="font-normal cursor-pointer">
                Include top blockers
              </Label>
            </div>
          </div>

          {/* Send Button */}
          <Button 
            onClick={handleSend} 
            disabled={sendEmailMutation.isPending}
            className="w-full"
          >
            {sendEmailMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Status Update
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}