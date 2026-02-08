import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, BellOff, X } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

const DEFAULT_THRESHOLDS = {
  budgetWarning: 80,
  budgetCritical: 95,
  scheduleWarning: 80,
  overdueTasksWarning: 3,
  overdueTasksCritical: 5,
  criticalRfisWarning: 1,
  overdueRfisWarning: 3,
};

export default function ProjectAlerts({ 
  project, 
  financials, 
  tasks, 
  rfis,
  projectTotals,
  scheduleMetrics,
  showConfig,
  onCloseConfig
}) {
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [enabledAlerts, setEnabledAlerts] = useState({
    budget: true,
    schedule: true,
    rfis: true,
  });

  const queryClient = useQueryClient();

  // Load saved settings from user preferences
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const user = await apiClient.auth.me();
        const savedSettings = user[`project_alerts_${project.id}`];
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.thresholds) setThresholds(settings.thresholds);
          if (settings.enabledAlerts) setEnabledAlerts(settings.enabledAlerts);
        }
      } catch (error) {
        console.error('Failed to load alert settings:', error);
      }
    };
    if (project) loadSettings();
  }, [project]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const settings = JSON.stringify({ thresholds, enabledAlerts });
      await apiClient.auth.updateMe({
        [`project_alerts_${project.id}`]: settings,
      });
    },
    onSuccess: () => {
      toast.success('Alert settings saved');
      onCloseConfig();
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  // Calculate active alerts
  const activeAlerts = [];

  if (enabledAlerts.budget) {
    if (projectTotals.percentSpent >= thresholds.budgetCritical) {
      activeAlerts.push({
        id: 'budget-critical',
        type: 'critical',
        category: 'budget',
        message: `Budget at ${projectTotals.percentSpent.toFixed(1)}% - CRITICAL`,
        value: projectTotals.percentSpent,
      });
    } else if (projectTotals.percentSpent >= thresholds.budgetWarning) {
      activeAlerts.push({
        id: 'budget-warning',
        type: 'warning',
        category: 'budget',
        message: `Budget at ${projectTotals.percentSpent.toFixed(1)}% - approaching limit`,
        value: projectTotals.percentSpent,
      });
    }
  }

  if (enabledAlerts.schedule) {
    if (scheduleMetrics.overdue >= thresholds.overdueTasksCritical) {
      activeAlerts.push({
        id: 'schedule-critical',
        type: 'critical',
        category: 'schedule',
        message: `${scheduleMetrics.overdue} tasks overdue - CRITICAL`,
        value: scheduleMetrics.overdue,
      });
    } else if (scheduleMetrics.overdue >= thresholds.overdueTasksWarning) {
      activeAlerts.push({
        id: 'schedule-warning',
        type: 'warning',
        category: 'schedule',
        message: `${scheduleMetrics.overdue} tasks overdue`,
        value: scheduleMetrics.overdue,
      });
    }

    if (scheduleMetrics.adherence < thresholds.scheduleWarning) {
      activeAlerts.push({
        id: 'adherence-warning',
        type: 'warning',
        category: 'schedule',
        message: `Schedule adherence at ${scheduleMetrics.adherence.toFixed(0)}%`,
        value: scheduleMetrics.adherence,
      });
    }
  }

  if (enabledAlerts.rfis) {
    const criticalRfis = rfis.filter(r => 
      r.priority === 'critical' && (r.status === 'pending' || r.status === 'submitted')
    ).length;

    if (criticalRfis >= thresholds.criticalRfisWarning) {
      activeAlerts.push({
        id: 'rfis-critical',
        type: 'critical',
        category: 'rfis',
        message: `${criticalRfis} critical RFIs pending`,
        value: criticalRfis,
      });
    }

    const overdueRfis = rfis.filter(r => 
      r.due_date && 
      new Date(r.due_date) < new Date() && 
      (r.status === 'pending' || r.status === 'submitted')
    ).length;

    if (overdueRfis >= thresholds.overdueRfisWarning) {
      activeAlerts.push({
        id: 'rfis-overdue',
        type: 'warning',
        category: 'rfis',
        message: `${overdueRfis} RFIs overdue`,
        value: overdueRfis,
      });
    }
  }

  return (
    <>
      {/* Active Alerts Banner */}
      {activeAlerts.length > 0 && (
        <Card className="bg-red-500/5 border-red-500/20 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              Active Alerts ({activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-lg flex items-center justify-between ${
                    alert.type === 'critical' 
                      ? 'bg-red-500/10 border border-red-500/30' 
                      : 'bg-amber-500/10 border border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Bell size={16} className={alert.type === 'critical' ? 'text-red-400' : 'text-amber-400'} />
                    <span className="text-white text-sm">{alert.message}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={
                      alert.type === 'critical' 
                        ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }
                  >
                    {alert.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Dialog */}
      <Dialog open={showConfig} onOpenChange={onCloseConfig}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Configure Project Alerts</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Budget Alerts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Budget Alerts</h3>
                  <p className="text-sm text-zinc-400">Get notified when budget thresholds are exceeded</p>
                </div>
                <Switch
                  checked={enabledAlerts.budget}
                  onCheckedChange={(checked) => 
                    setEnabledAlerts({ ...enabledAlerts, budget: checked })
                  }
                />
              </div>

              {enabledAlerts.budget && (
                <div className="pl-4 space-y-3 border-l-2 border-amber-500">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Warning Threshold (%)</Label>
                      <Input
                        type="number"
                        value={thresholds.budgetWarning}
                        onChange={(e) => setThresholds({ 
                          ...thresholds, 
                          budgetWarning: Number(e.target.value) 
                        })}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Critical Threshold (%)</Label>
                      <Input
                        type="number"
                        value={thresholds.budgetCritical}
                        onChange={(e) => setThresholds({ 
                          ...thresholds, 
                          budgetCritical: Number(e.target.value) 
                        })}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Schedule Alerts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Schedule Alerts</h3>
                  <p className="text-sm text-zinc-400">Monitor overdue tasks and schedule adherence</p>
                </div>
                <Switch
                  checked={enabledAlerts.schedule}
                  onCheckedChange={(checked) => 
                    setEnabledAlerts({ ...enabledAlerts, schedule: checked })
                  }
                />
              </div>

              {enabledAlerts.schedule && (
                <div className="pl-4 space-y-3 border-l-2 border-blue-500">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Overdue Tasks Warning</Label>
                      <Input
                        type="number"
                        value={thresholds.overdueTasksWarning}
                        onChange={(e) => setThresholds({ 
                          ...thresholds, 
                          overdueTasksWarning: Number(e.target.value) 
                        })}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Overdue Tasks Critical</Label>
                      <Input
                        type="number"
                        value={thresholds.overdueTasksCritical}
                        onChange={(e) => setThresholds({ 
                          ...thresholds, 
                          overdueTasksCritical: Number(e.target.value) 
                        })}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Schedule Adherence Threshold (%)</Label>
                    <Input
                      type="number"
                      value={thresholds.scheduleWarning}
                      onChange={(e) => setThresholds({ 
                        ...thresholds, 
                        scheduleWarning: Number(e.target.value) 
                      })}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* RFI Alerts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">RFI Alerts</h3>
                  <p className="text-sm text-zinc-400">Track critical and overdue RFIs</p>
                </div>
                <Switch
                  checked={enabledAlerts.rfis}
                  onCheckedChange={(checked) => 
                    setEnabledAlerts({ ...enabledAlerts, rfis: checked })
                  }
                />
              </div>

              {enabledAlerts.rfis && (
                <div className="pl-4 space-y-3 border-l-2 border-purple-500">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Critical RFIs Warning</Label>
                      <Input
                        type="number"
                        value={thresholds.criticalRfisWarning}
                        onChange={(e) => setThresholds({ 
                          ...thresholds, 
                          criticalRfisWarning: Number(e.target.value) 
                        })}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Overdue RFIs Warning</Label>
                      <Input
                        type="number"
                        value={thresholds.overdueRfisWarning}
                        onChange={(e) => setThresholds({ 
                          ...thresholds, 
                          overdueRfisWarning: Number(e.target.value) 
                        })}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => setThresholds(DEFAULT_THRESHOLDS)}
                className="border-zinc-700"
              >
                Reset to Defaults
              </Button>
              <Button
                onClick={() => saveSettings.mutate()}
                disabled={saveSettings.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {saveSettings.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
