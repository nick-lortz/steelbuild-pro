import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserCircle, Mail, Shield, Users, Plus, Trash2, Settings as SettingsIcon, Bell, Palette, Save } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import { format } from 'date-fns';

export default function Settings() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    title: '',
    department: '',
  });
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    project_notifications: true,
    rfi_notifications: true,
    change_order_notifications: true,
    theme: 'dark',
    date_format: 'MM/dd/yyyy',
    time_zone: 'America/New_York',
  });
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    onSuccess: (data) => {
      setProfileData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        title: data.title || '',
        department: data.department || '',
      });
      if (data.preferences) {
        setPreferences({ ...preferences, ...data.preferences });
      }
    },
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: currentUser?.role === 'admin',
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }) => base44.users.inviteUser(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteRole('user');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const saveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const savePreferences = () => {
    updateProfileMutation.mutate({ preferences });
  };

  const handleInviteUser = (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const isAdmin = currentUser?.role === 'admin';

  const userColumns = [
    {
      header: 'User',
      accessor: 'email',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
            <UserCircle size={20} className="text-amber-500" />
          </div>
          <div>
            <p className="font-medium text-white">{row.full_name || 'No name set'}</p>
            <p className="text-sm text-zinc-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (row) => (
        <Badge variant="outline" className={row.role === 'admin' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}>
          <Shield size={12} className="mr-1" />
          {row.role}
        </Badge>
      ),
    },
    {
      header: 'Joined',
      accessor: 'created_date',
      render: (row) => row.created_date ? format(new Date(row.created_date), 'MMM d, yyyy') : '-',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your profile and application settings"
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="profile">
            <UserCircle size={14} className="mr-2" />
            Profile
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users">
              <Users size={14} className="mr-2" />
              User Management
            </TabsTrigger>
          )}
          <TabsTrigger value="preferences">
            <Bell size={14} className="mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="app">
            <SettingsIcon size={14} className="mr-2" />
            App Settings
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <UserCircle size={40} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-lg font-medium text-white">{currentUser?.full_name || 'No name set'}</p>
                  <p className="text-sm text-zinc-400">{currentUser?.email}</p>
                  <Badge variant="outline" className="mt-2 capitalize">
                    {currentUser?.role}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={currentUser?.email || ''}
                    disabled
                    className="bg-zinc-800 border-zinc-700 opacity-50"
                  />
                  <p className="text-xs text-zinc-500">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input
                    value={profileData.title}
                    onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                    placeholder="Project Manager"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={profileData.department}
                    onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                    placeholder="Engineering"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={currentUser?.role || ''}
                    disabled
                    className="bg-zinc-800 border-zinc-700 opacity-50 capitalize"
                  />
                  <p className="text-xs text-zinc-500">Contact an admin to change your role</p>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={saveProfile}
                    disabled={updateProfileMutation.isPending}
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    <Save size={16} className="mr-2" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="users">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <Button
                    onClick={() => setShowInviteDialog(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    <Plus size={16} className="mr-2" />
                    Invite User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={userColumns}
                  data={allUsers}
                  emptyMessage="No users found. Invite users to get started."
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <div className="space-y-6">
            {/* Notifications */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell size={20} />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-zinc-400">Receive general email updates</p>
                  </div>
                  <Switch
                    checked={preferences.email_notifications}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, email_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Project Updates</Label>
                    <p className="text-sm text-zinc-400">Get notified about project changes</p>
                  </div>
                  <Switch
                    checked={preferences.project_notifications}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, project_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>RFI Notifications</Label>
                    <p className="text-sm text-zinc-400">Alerts for new and updated RFIs</p>
                  </div>
                  <Switch
                    checked={preferences.rfi_notifications}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, rfi_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Change Order Notifications</Label>
                    <p className="text-sm text-zinc-400">Updates on change orders</p>
                  </div>
                  <Switch
                    checked={preferences.change_order_notifications}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, change_order_notifications: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Display Preferences */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette size={20} />
                  Display & Format
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select value={preferences.date_format} onValueChange={(value) => setPreferences({ ...preferences, date_format: value })}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/dd/yyyy">MM/DD/YYYY (12/31/2025)</SelectItem>
                      <SelectItem value="dd/MM/yyyy">DD/MM/YYYY (31/12/2025)</SelectItem>
                      <SelectItem value="yyyy-MM-dd">YYYY-MM-DD (2025-12-31)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time Zone</Label>
                  <Select value={preferences.time_zone} onValueChange={(value) => setPreferences({ ...preferences, time_zone: value })}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                      <SelectItem value="Pacific/Honolulu">Hawaii Time (HT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={preferences.theme} onValueChange={(value) => setPreferences({ ...preferences, theme: value })}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark (Current)</SelectItem>
                      <SelectItem value="light" disabled>Light (Coming Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={savePreferences}
                    disabled={updateProfileMutation.isPending}
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    <Save size={16} className="mr-2" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* App Settings Tab */}
        <TabsContent value="app">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <h3 className="font-medium text-white mb-2">Application Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Application Name</span>
                    <span className="text-white">SteelBuild Pro (Stabilized Edition)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Version</span>
                    <span className="text-white">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total Users</span>
                    <span className="text-white">{allUsers.length}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-zinc-800 rounded-lg">
                <h3 className="font-medium text-white mb-2">Access Control</h3>
                <p className="text-sm text-zinc-400">
                  This application uses role-based access control. Users are assigned either 'admin' or 'user' roles. 
                  Admins have full access to all features including user management.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User - Standard Access</SelectItem>
                  <SelectItem value="admin">Admin - Full Access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}