import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Zap, Play, Pause, Trash2, Plus, Clock, Database, Mail, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';

export default function AutomationWorkflows() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['automations-list'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('listAutomations', {});
        return response.data || [];
      } catch (error) {
        console.error('List automations error:', error);
        return [];
      }
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, name }) => {
      return await base44.functions.invoke('toggleAutomation', { 
        automation_id: id,
        automation_name: name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations-list'] });
      toast.success('Automation updated');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to toggle automation');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, name }) => {
      if (!confirm(`Delete automation "${name}"?`)) return null;
      return await base44.functions.invoke('deleteAutomation', { 
        automation_id: id,
        automation_name: name
      });
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['automations-list'] });
        toast.success('Automation deleted');
      }
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to delete automation');
    }
  });

  const createDefaultWorkflows = async () => {
    setCreating(true);
    try {
      // RFI response automation
      await base44.functions.invoke('createAutomation', {
        automation_type: 'entity',
        name: 'Auto-Update Tasks on RFI Response',
        function_name: 'autoUpdateTaskOnRFI',
        entity_name: 'RFI',
        event_types: ['update'],
        is_active: true
      });

      // Approval workflow automation
      await base44.functions.invoke('createAutomation', {
        automation_type: 'entity',
        name: 'Auto-Assign Tasks on Approvals',
        function_name: 'autoAssignTaskOnApproval',
        entity_name: 'ChangeOrder',
        event_types: ['update'],
        is_active: true
      });

      // Delivery automation
      await base44.functions.invoke('createAutomation', {
        automation_type: 'entity',
        name: 'Auto-Release Tasks on Delivery',
        function_name: 'autoAssignTaskOnApproval',
        entity_name: 'Delivery',
        event_types: ['update'],
        is_active: true
      });

      // Deadline monitoring (daily at 6am)
      await base44.functions.invoke('createAutomation', {
        automation_type: 'scheduled',
        name: 'Daily Deadline & Critical Path Monitor',
        function_name: 'checkCriticalDeadlines',
        schedule_type: 'simple',
        repeat_interval: 1,
        repeat_unit: 'days',
        start_time: '06:00',
        is_active: true
      });

      queryClient.invalidateQueries({ queryKey: ['automations-list'] });
      toast.success('Default workflows created');
    } catch (error) {
      toast.error(error?.message || 'Failed to create workflows');
    } finally {
      setCreating(false);
    }
  };

  const getAutomationIcon = (automation) => {
    if (automation.automation_type === 'scheduled') return <Clock size={16} />;
    if (automation.entity_name === 'RFI') return <Mail size={16} />;
    if (automation.entity_name === 'Delivery') return <Database size={16} />;
    return <Zap size={16} />;
  };

  const getAutomationColor = (automation) => {
    if (!automation.is_active) return 'bg-zinc-800 border-zinc-700';
    if (automation.automation_type === 'scheduled') return 'bg-blue-500/10 border-blue-500/20';
    return 'bg-green-500/10 border-green-500/20';
  };

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Automation Workflows" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader 
        title="Automation Workflows" 
        subtitle="Streamline processes with automated triggers and notifications"
        actions={
          <div className="flex gap-2">
            {automations.length === 0 && (
              <Button onClick={createDefaultWorkflows} disabled={creating}>
                <Plus size={16} className="mr-2" />
                {creating ? 'Creating...' : 'Create Default Workflows'}
              </Button>
            )}
          </div>
        }
      />

      {automations.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Zap size={48} className="mx-auto mb-4 text-zinc-600" />
            <h3 className="text-xl font-semibold mb-2 text-white">No Workflows Configured</h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Set up automated workflows to handle RFI responses, task assignments, deadline monitoring, and external integrations.
            </p>
            <Button onClick={createDefaultWorkflows} disabled={creating}>
              <Plus size={16} className="mr-2" />
              {creating ? 'Creating Workflows...' : 'Create Default Workflows'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Total Workflows</p>
                    <p className="text-2xl font-bold text-white">{automations.length}</p>
                  </div>
                  <Zap size={24} className="text-zinc-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Active</p>
                    <p className="text-2xl font-bold text-green-400">
                      {automations.filter(a => a.is_active).length}
                    </p>
                  </div>
                  <Play size={24} className="text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Scheduled</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {automations.filter(a => a.automation_type === 'scheduled').length}
                    </p>
                  </div>
                  <Clock size={24} className="text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Entity-Based</p>
                    <p className="text-2xl font-bold text-amber-400">
                      {automations.filter(a => a.automation_type === 'entity').length}
                    </p>
                  </div>
                  <Database size={24} className="text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workflows List */}
          <div className="space-y-3">
            {automations.map((automation) => (
              <Card key={automation.id} className={`border ${getAutomationColor(automation)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${automation.is_active ? 'bg-zinc-800' : 'bg-zinc-900'}`}>
                        {getAutomationIcon(automation)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{automation.name}</h3>
                          <Badge variant={automation.is_active ? 'default' : 'secondary'} className="text-xs">
                            {automation.is_active ? 'Active' : 'Paused'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {automation.automation_type === 'scheduled' ? 'Scheduled' : 'Entity Trigger'}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-zinc-400 space-y-1">
                          <p>Function: <span className="text-zinc-300">{automation.function_name}</span></p>
                          
                          {automation.automation_type === 'entity' && (
                            <p>
                              Trigger: <span className="text-zinc-300">
                                {automation.entity_name} {automation.event_types?.join(', ')}
                              </span>
                            </p>
                          )}
                          
                          {automation.automation_type === 'scheduled' && automation.repeat_unit && (
                            <p>
                              Schedule: <span className="text-zinc-300">
                                Every {automation.repeat_interval} {automation.repeat_unit}
                                {automation.start_time && ` at ${automation.start_time}`}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={automation.is_active}
                        onCheckedChange={() => toggleMutation.mutate({ 
                          id: automation.id,
                          name: automation.name
                        })}
                        disabled={toggleMutation.isPending}
                      />
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate({ 
                          id: automation.id,
                          name: automation.name
                        })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Integration Info */}
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-400 mb-1">External ERP Integration</h4>
                  <p className="text-sm text-zinc-300 mb-2">
                    To sync data to external ERP systems, configure the <code className="px-1 py-0.5 bg-zinc-800 rounded text-xs">EXTERNAL_ERP_WEBHOOK_URL</code> secret in Settings.
                  </p>
                  <p className="text-xs text-zinc-400">
                    Then call the <code className="px-1 py-0.5 bg-zinc-800 rounded">syncToExternalERP</code> function with project_id and sync_type (sov, financials, change_orders, or all).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}