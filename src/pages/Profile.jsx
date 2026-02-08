import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { UserCircle, Bell, LogOut, Moon, Sun, Mail, Briefcase, Trash2, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { toast } from '@/components/ui/notifications';
import ScreenContainer from '@/components/layout/ScreenContainer';
import PageHeader from '@/components/ui/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    queryFn: () => apiClient.auth.me()
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => apiClient.auth.updateMe(data),
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
    apiClient.auth.logout();
  };

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      // Delete user account via backend function
      return await apiClient.functions.invoke('deleteUserAccount', {});
    },
    onSuccess: () => {
      toast.success('Account deleted successfully');
      setTimeout(() => {
        apiClient.auth.logout();
      }, 1500);
    },
    onError: (error) => {
      toast.error('Failed to delete account. Please contact support.');
      console.error('Delete account error:', error);
    }
  });

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
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
            variant="outline"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut size={18} className="mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="mb-4 border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle size={18} />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            <p className="text-sm">Permanently delete your account and all associated data.</p>
            <p className="text-xs text-muted-foreground">
              This action cannot be undone. All projects, RFIs, documents, and settings will be permanently removed.
            </p>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full"
                disabled={deleteAccountMutation.isPending}
              >
                <Trash2 size={18} className="mr-2" />
                {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account and remove all your data from our servers.
                  This action cannot be undone.
                  <br /><br />
                  <strong>All of the following will be permanently deleted:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Your profile and account information</li>
                    <li>All projects you created or manage</li>
                    <li>RFIs, deliveries, and daily logs</li>
                    <li>Documents and photos</li>
                    <li>Schedule and task data</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete My Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </ScreenContainer>
  );
}