import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, Clock } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/ui/PageHeader';

export default function NotificationSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Check push notification support
  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
  }, []);

  const { data: preferences = null, isLoading } = useQuery({
    queryKey: ['notificationPrefs', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const prefs = await base44.entities.NotificationPreference.filter(
        { user_id: currentUser.email },
        '-created_date',
        1
      );
      return prefs[0] || null;
    },
    enabled: !!currentUser?.email
  });

  const [formData, setFormData] = useState(() => ({
    deadline_alerts: true,
    deadline_days_before: 3,
    status_changes: true,
    task_assigned: true,
    rfi_responses: true,
    delivery_updates: true,
    in_app_enabled: true,
    email_enabled: true,
    email_digest_frequency: 'immediate',
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00'
  }));

  React.useEffect(() => {
    if (preferences) {
      setFormData(preferences);
    }
  }, [preferences]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);
      if (preferences?.id) {
        return base44.entities.NotificationPreference.update(preferences.id, formData);
      } else {
        return base44.entities.NotificationPreference.create({
          ...formData,
          user_id: currentUser.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPrefs'] });
      toast.success('Preferences saved');
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error('Failed to save preferences');
      setIsSaving(false);
    }
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <PageHeader title="Notification Settings" />
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <PageHeader title="Notification Settings" />

      <div className="max-w-2xl space-y-6">
        {/* Notification Types */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell size={20} />
              Notification Types
            </CardTitle>
            <CardDescription>Choose which events trigger notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <Label className="text-sm font-medium">Deadline Alerts</Label>
              <Switch
                checked={formData.deadline_alerts}
                onCheckedChange={(v) => handleChange('deadline_alerts', v)}
              />
            </div>

            {formData.deadline_alerts && (
              <div className="ml-4 p-3 bg-zinc-800/50 rounded">
                <Label className="text-xs">Days Before Deadline</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.deadline_days_before}
                  onChange={(e) => handleChange('deadline_days_before', parseInt(e.target.value))}
                  className="mt-2 bg-zinc-700 border-zinc-600"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <Label className="text-sm font-medium">Status Changes</Label>
              <Switch
                checked={formData.status_changes}
                onCheckedChange={(v) => handleChange('status_changes', v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <Label className="text-sm font-medium">Task Assigned</Label>
              <Switch
                checked={formData.task_assigned}
                onCheckedChange={(v) => handleChange('task_assigned', v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <Label className="text-sm font-medium">RFI Responses</Label>
              <Switch
                checked={formData.rfi_responses}
                onCheckedChange={(v) => handleChange('rfi_responses', v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <Label className="text-sm font-medium">Delivery Updates</Label>
              <Switch
                checked={formData.delivery_updates}
                onCheckedChange={(v) => handleChange('delivery_updates', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Delivery Channels */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail size={20} />
              Delivery Channels
            </CardTitle>
            <CardDescription>How you want to receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <Label className="text-sm font-medium">In-App Notifications</Label>
              <Switch
                checked={formData.in_app_enabled}
                onCheckedChange={(v) => handleChange('in_app_enabled', v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <Label className="text-sm font-medium">Email Notifications</Label>
              <Switch
                checked={formData.email_enabled}
                onCheckedChange={(v) => handleChange('email_enabled', v)}
              />
            </div>

            {formData.email_enabled && (
              <div className="ml-4 p-3 bg-zinc-800/50 rounded">
                <Label className="text-xs">Email Frequency</Label>
                <Select value={formData.email_digest_frequency} onValueChange={(v) => handleChange('email_digest_frequency', v)}>
                  <SelectTrigger className="mt-2 bg-zinc-700 border-zinc-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                    <SelectItem value="weekly">Weekly Digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              Quiet Hours
            </CardTitle>
            <CardDescription>Pause notifications during specific hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <Label className="text-sm font-medium">Enable Quiet Hours</Label>
              <Switch
                checked={formData.quiet_hours_enabled}
                onCheckedChange={(v) => handleChange('quiet_hours_enabled', v)}
              />
            </div>

            {formData.quiet_hours_enabled && (
              <div className="grid grid-cols-2 gap-4 ml-4">
                <div className="p-3 bg-zinc-800/50 rounded">
                  <Label className="text-xs">Start Time</Label>
                  <Input
                    type="time"
                    value={formData.quiet_hours_start}
                    onChange={(e) => handleChange('quiet_hours_start', e.target.value)}
                    className="mt-2 bg-zinc-700 border-zinc-600"
                  />
                </div>
                <div className="p-3 bg-zinc-800/50 rounded">
                  <Label className="text-xs">End Time</Label>
                  <Input
                    type="time"
                    value={formData.quiet_hours_end}
                    onChange={(e) => handleChange('quiet_hours_end', e.target.value)}
                    className="mt-2 bg-zinc-700 border-zinc-600"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={isSaving || saveMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
          >
            {isSaving || saveMutation.isPending ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
}