import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { UserCircle, Bell, LogOut, Moon, Sun, Mail, Briefcase } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { toast } from '@/components/ui/notifications';
import ScreenContainer from '@/components/layout/ScreenContainer';
import PageHeader from '@/components/ui/PageHeader';

export default function Profile() {
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    taskReminders: true,
    drawingApprovals: true,
    rfiUpdates: true,
    changeOrderAlerts: true
  });

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      toast.success('Preferences saved');
    },
    onError: () => {
      toast.error('Failed to save preferences');
    }
  });

  const handleNotificationChange = (key, value) => {
    const updated = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(updated);
    updateUserMutation.mutate({ notification_preferences: updated });
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader title="Profile" showBackButton={false} />

      {/* User Info Card */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <UserCircle size={32} className="text-amber-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{currentUser?.full_name || 'User'}</h2>
              <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{currentUser?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase size={16} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm capitalize">{currentUser?.role}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dark-mode" className="text-sm font-medium">Dark Mode</Label>
              <p className="text-xs text-muted-foreground">Toggle dark/light theme</p>
            </div>
            <Switch
              id="dark-mode"
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell size={18} />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notif" className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">Receive updates via email</p>
            </div>
            <Switch
              id="email-notif"
              checked={notificationPrefs.emailNotifications}
              onCheckedChange={(v) => handleNotificationChange('emailNotifications', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="task-remind" className="text-sm font-medium">Task Reminders</Label>
              <p className="text-xs text-muted-foreground">Notify on task due dates</p>
            </div>
            <Switch
              id="task-remind"
              checked={notificationPrefs.taskReminders}
              onCheckedChange={(v) => handleNotificationChange('taskReminders', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="drawing-approve" className="text-sm font-medium">Drawing Approvals</Label>
              <p className="text-xs text-muted-foreground">Notify on drawing status changes</p>
            </div>
            <Switch
              id="drawing-approve"
              checked={notificationPrefs.drawingApprovals}
              onCheckedChange={(v) => handleNotificationChange('drawingApprovals', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="rfi-updates" className="text-sm font-medium">RFI Updates</Label>
              <p className="text-xs text-muted-foreground">Notify on RFI responses</p>
            </div>
            <Switch
              id="rfi-updates"
              checked={notificationPrefs.rfiUpdates}
              onCheckedChange={(v) => handleNotificationChange('rfiUpdates', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="co-alerts" className="text-sm font-medium">Change Order Alerts</Label>
              <p className="text-xs text-muted-foreground">Notify on CO status changes</p>
            </div>
            <Switch
              id="co-alerts"
              checked={notificationPrefs.changeOrderAlerts}
              onCheckedChange={(v) => handleNotificationChange('changeOrderAlerts', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut size={18} className="mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </ScreenContainer>
  );
}