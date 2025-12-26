import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import { UserCircle, Mail, Shield, Users, Plus, Trash2, Settings as SettingsIcon } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import { format } from 'date-fns';

export default function Settings() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
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
                    defaultValue={currentUser?.full_name || ''}
                    onBlur={(e) => {
                      if (e.target.value !== currentUser?.full_name) {
                        updateProfileMutation.mutate({ full_name: e.target.value });
                      }
                    }}
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
                  <Label>Role</Label>
                  <Input
                    value={currentUser?.role || ''}
                    disabled
                    className="bg-zinc-800 border-zinc-700 opacity-50 capitalize"
                  />
                  <p className="text-xs text-zinc-500">Contact an admin to change your role</p>
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