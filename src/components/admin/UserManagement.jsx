import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from '@/components/ui/DataTable';
import { UserPlus, Edit, Lock, Unlock } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

const USER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' }
];

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    role: 'user'
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list()
  });

  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      await base44.users.inviteUser(data.email, data.role);
      await base44.functions.invoke('logCriticalError', {
        level: 'info',
        message: `User invited: ${data.email} as ${data.role}`,
        context: { action: 'user_invite', email: data.email, role: data.role }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User invitation sent');
      setShowDialog(false);
      setFormData({ email: '', role: 'user' });
    },
    onError: (err) => toast.error(err?.message || 'Failed to invite user')
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.User.update(id, data);
      await base44.functions.invoke('logCriticalError', {
        level: 'info',
        message: `User updated: ${id}`,
        context: { action: 'user_update', user_id: id, changes: data }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated');
      setShowDialog(false);
      setEditingUser(null);
    },
    onError: (err) => toast.error(err?.message || 'Failed to update user')
  });

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      role: user.role
    });
    setShowDialog(true);
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'full_name',
      render: (row) => <span className="font-medium">{row.full_name || '-'}</span>
    },
    {
      header: 'Email',
      accessor: 'email'
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (row) => (
        <span className={cn(
          'px-2 py-1 rounded text-xs font-medium',
          row.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
        )}>
          {row.role === 'admin' ? 'Admin' : 'User'}
        </span>
      )
    },
    {
      header: 'Created',
      accessor: 'created_date',
      render: (row) => new Date(row.created_date).toLocaleDateString()
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(row)}
          className="text-blue-400 hover:text-blue-300"
        >
          <Edit size={14} className="mr-1" />
          Edit
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold">User Management</h3>
          <p className="text-sm text-muted-foreground">Manage user accounts and roles</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <UserPlus size={16} className="mr-2" />
          Invite User
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <DataTable
              columns={columns}
              data={users}
              emptyMessage="No users found"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setEditingUser(null);
          setFormData({ email: '', role: 'user' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Invite New User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editingUser}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (editingUser) {
                    updateMutation.mutate({ id: editingUser.id, data: { role: formData.role } });
                  } else {
                    inviteMutation.mutate(formData);
                  }
                }}
                disabled={!formData.email}
              >
                {editingUser ? 'Update' : 'Invite'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}