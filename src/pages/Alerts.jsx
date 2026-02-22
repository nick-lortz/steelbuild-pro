import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, X, ExternalLink, Filter } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function Alerts() {
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [dismissAlert, setDismissAlert] = useState(null);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => base44.entities.Alert.list('-created_date', 200),
    staleTime: 60 * 1000
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const acknowledgeMutation = useMutation({
    mutationFn: ({ id, user_email }) => 
      base44.entities.Alert.update(id, {
        status: 'acknowledged',
        acknowledged_by: user_email,
        acknowledged_at: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert acknowledged');
    }
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => 
      base44.entities.Alert.update(id, {
        status: 'dismissed',
        resolved_at: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert dismissed');
      setDismissAlert(null);
    }
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesProject = projectFilter === 'all' || alert.project_id === projectFilter;
      const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
      const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
      return matchesProject && matchesSeverity && matchesStatus;
    });
  }, [alerts, projectFilter, severityFilter, statusFilter]);

  const groupedAlerts = useMemo(() => {
    const groups = {};
    filteredAlerts.forEach(alert => {
      const key = alert.project_id || 'no-project';
      if (!groups[key]) groups[key] = [];
      groups[key].push(alert);
    });
    return groups;
  }, [filteredAlerts]);

  const severityColors = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/30',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  };

  const statusColors = {
    active: 'text-red-400',
    acknowledged: 'text-yellow-400',
    resolved: 'text-green-400',
    dismissed: 'text-zinc-600'
  };

  const getEntityLink = (alert) => {
    const routes = {
      RFI: 'RFIHub',
      Task: 'Schedule',
      Delivery: 'Deliveries',
      ChangeOrder: 'ChangeOrders',
      DrawingSet: 'Drawings',
      Submittal: 'Submittals'
    };
    const page = routes[alert.entity_type];
    return page ? createPageUrl(page) + `?project=${alert.project_id}` : null;
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? `${project.project_number} - ${project.name}` : 'Unknown Project';
  };

  return (
    <div className="min-h-screen bg-[#0A0E13]">
      <div className="border-b border-[rgba(255,255,255,0.05)] bg-black/95">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#E5E7EB]">Alerts</h1>
              <p className="text-sm text-[#6B7280] mt-1">
                {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)]">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-[#6B7280]" />
            
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_number} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>

            {(projectFilter !== 'all' || severityFilter !== 'all' || statusFilter !== 'active') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setProjectFilter('all');
                  setSeverityFilter('all');
                  setStatusFilter('active');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="max-w-[1800px] mx-auto px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-[#6B7280]">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <p className="text-lg">No alerts match current filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAlerts).map(([projectId, projectAlerts]) => (
              <div key={projectId}>
                {projectFilter === 'all' && (
                  <h3 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">
                    {getProjectName(projectId)}
                  </h3>
                )}
                <div className="space-y-2">
                  {projectAlerts.map(alert => (
                    <Card key={alert.id} className="bg-[#0A0A0A]/90 hover:border-[rgba(255,157,66,0.2)]">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className={severityColors[alert.severity]}>
                                {alert.severity}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {alert.alert_type.replace(/_/g, ' ')}
                              </Badge>
                              {alert.days_open > 0 && (
                                <span className="text-xs text-[#6B7280]">{alert.days_open}d open</span>
                              )}
                              <span className={`text-xs ${statusColors[alert.status]}`}>
                                {alert.status}
                              </span>
                            </div>
                            
                            <h4 className="font-semibold text-white mb-1">{alert.title}</h4>
                            <p className="text-sm text-[#9CA3AF] mb-2">{alert.message}</p>
                            
                            {alert.recommended_action && (
                              <p className="text-sm text-blue-400 flex items-center gap-1">
                                → {alert.recommended_action}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            {getEntityLink(alert) && (
                              <Link to={getEntityLink(alert)}>
                                <Button variant="ghost" size="icon">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </Link>
                            )}
                            
                            {alert.status === 'active' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => acknowledgeMutation.mutate({ 
                                    id: alert.id, 
                                    user_email: currentUser?.email 
                                  })}
                                >
                                  Acknowledge
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDismissAlert(alert)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!dismissAlert} onOpenChange={() => setDismissAlert(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Dismiss Alert?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {dismissAlert?.title}
              <br /><br />
              This will mark the alert as dismissed. You can still view it in the dismissed filter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => dismissMutation.mutate(dismissAlert.id)}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}