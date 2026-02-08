import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Edit, Plus, X, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { safeFormat } from '@/components/shared/dateUtilsSafe';

const MODULES = [
'projects', 'schedule', 'financials', 'rfis', 'change_orders',
'drawings', 'deliveries', 'labor', 'equipment', 'documents',
'reports', 'users', 'settings'];


const PERMISSION_TYPES = {
  projects: ['view', 'create', 'edit', 'delete'],
  schedule: ['view', 'create', 'edit', 'delete'],
  financials: ['view', 'create', 'edit', 'delete', 'approve'],
  rfis: ['view', 'create', 'edit', 'delete', 'submit'],
  change_orders: ['view', 'create', 'edit', 'delete', 'approve'],
  drawings: ['view', 'create', 'edit', 'delete', 'approve'],
  deliveries: ['view', 'create', 'edit', 'delete'],
  labor: ['view', 'create', 'edit', 'delete', 'approve'],
  equipment: ['view', 'create', 'edit', 'delete'],
  documents: ['view', 'upload', 'edit', 'delete', 'approve'],
  reports: ['view', 'create', 'export'],
  users: ['view', 'invite', 'edit', 'delete'],
  settings: ['view', 'edit']
};

export default function PermissionManager() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    module: 'projects',
    permission_type: 'view',
    granted: true,
    project_id: null,
    reason: ''
  });
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    staleTime: 5 * 60 * 1000
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ['permission-overrides', selectedUser?.email],
    queryFn: () => base44.entities.UserPermissionOverride.filter({
      user_email: selectedUser.email
    }),
    enabled: !!selectedUser?.email,
    staleTime: 2 * 60 * 1000
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ email, custom_role }) => {
      const response = await base44.functions.invoke('updateUserProfile', {
        user_email: email,
        custom_role
      });
      if (response.data.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role updated');
    }
  });

  const createOverrideMutation = useMutation({
    mutationFn: (data) => base44.entities.UserPermissionOverride.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-overrides'] });
      setShowOverrideDialog(false);
      setOverrideForm({ module: 'projects', permission_type: 'view', granted: true, project_id: null, reason: '' });
      toast.success('Override created');
    }
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: (id) => base44.entities.UserPermissionOverride.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-overrides'] });
      toast.success('Override removed');
    }
  });

  const userOverridesByProject = useMemo(() => {
    const grouped = { global: [], byProject: {} };
    overrides.forEach((o) => {
      if (o.project_id) {
        if (!grouped.byProject[o.project_id]) grouped.byProject[o.project_id] = [];
        grouped.byProject[o.project_id].push(o);
      } else {
        grouped.global.push(o);
      }
    });
    return grouped;
  }, [overrides]);

  return (
    <div className="space-y-4">
      {/* User List */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base uppercase tracking-wide">User Permissions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-800">
            {users.map((user) => {
              const isSelected = selectedUser?.email === user.email;
              const userOverrides = overrides.filter((o) => o.user_email === user.email);

              return (
                <div
                  key={user.email} className="text-slate-50 p-3 cursor-pointer hover:bg-zinc-800/50 transition-colors"




                  onClick={() => setSelectedUser(isSelected ? null : user)}>

                  <div className="text-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <Shield size={14} className="text-amber-500" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{user.full_name || 'No name'}</p>
                        <p className="text-[10px] text-zinc-500">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.custom_role || user.role}
                        onValueChange={(role) => updateUserRoleMutation.mutate({
                          email: user.email,
                          custom_role: role
                        })}
                        onClick={(e) => e.stopPropagation()}>

                        <SelectTrigger className="w-40 h-7 bg-zinc-950 border-zinc-700 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="executive">Executive</SelectItem>
                          <SelectItem value="project_manager">Project Manager</SelectItem>
                          <SelectItem value="field_supervisor">Field Supervisor</SelectItem>
                          <SelectItem value="field_crew">Field Crew</SelectItem>
                          <SelectItem value="estimator">Estimator</SelectItem>
                          <SelectItem value="detailer">Detailer</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {userOverrides.length > 0 &&
                      <Badge className="bg-purple-500/20 text-purple-400 text-[9px] font-bold">
                          {userOverrides.length} overrides
                        </Badge>
                      }
                    </div>
                  </div>

                  {isSelected &&
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Permission Overrides</p>
                        <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOverrideDialog(true);
                        }}
                        className="h-7 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold">

                          <Plus size={10} className="mr-1" />
                          ADD OVERRIDE
                        </Button>
                      </div>

                      {/* Global Overrides */}
                      {userOverridesByProject.global.length > 0 &&
                    <div className="mb-2">
                          <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold mb-1">Global</p>
                          <div className="space-y-1">
                            {userOverridesByProject.global.map((override) =>
                        <div key={override.id} className="flex items-center justify-between p-2 bg-zinc-950 rounded border border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <Badge className={cn(
                              "text-[9px] font-bold",
                              override.granted ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                            )}>
                                    {override.granted ? 'GRANT' : 'DENY'}
                                  </Badge>
                                  <span className="text-xs text-white">
                                    {override.permission_type} <span className="text-zinc-600">on</span> {override.module}
                                  </span>
                                </div>
                                <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteOverrideMutation.mutate(override.id);
                            }}
                            className="h-6 px-1 text-red-500">

                                  <X size={10} />
                                </Button>
                              </div>
                        )}
                          </div>
                        </div>
                    }

                      {/* Project-specific Overrides */}
                      {Object.keys(userOverridesByProject.byProject).map((projId) => {
                      const project = projects.find((p) => p.id === projId);
                      const projOverrides = userOverridesByProject.byProject[projId];

                      return (
                        <div key={projId} className="mb-2">
                            <p className="text-[9px] text-amber-400 uppercase tracking-wider font-bold mb-1">
                              {project?.project_number || 'Project'}
                            </p>
                            <div className="space-y-1">
                              {projOverrides.map((override) =>
                            <div key={override.id} className="flex items-center justify-between p-2 bg-zinc-950 rounded border border-amber-500/20">
                                  <div className="flex items-center gap-2">
                                    <Badge className={cn(
                                  "text-[9px] font-bold",
                                  override.granted ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                )}>
                                      {override.granted ? 'GRANT' : 'DENY'}
                                    </Badge>
                                    <span className="text-xs text-white">
                                      {override.permission_type} <span className="text-zinc-600">on</span> {override.module}
                                    </span>
                                  </div>
                                  <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteOverrideMutation.mutate(override.id);
                                }}
                                className="h-6 px-1 text-red-500">

                                    <X size={10} />
                                  </Button>
                                </div>
                            )}
                            </div>
                          </div>);

                    })}

                      {overrides.length === 0 &&
                    <p className="text-center text-zinc-600 py-4 text-xs">No overrides</p>
                    }
                    </div>
                  }
                </div>);

            })}
          </div>
        </CardContent>
      </Card>

      {/* Add Override Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Add Permission Override</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            createOverrideMutation.mutate({
              user_email: selectedUser.email,
              ...overrideForm,
              granted_by: selectedUser.email
            });
          }} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Scope</Label>
              <Select
                value={overrideForm.project_id || 'global'}
                onValueChange={(v) => setOverrideForm({ ...overrideForm, project_id: v === 'global' ? null : v })}>

                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="global">Global (All Projects)</SelectItem>
                  {projects.map((p) =>
                  <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Module</Label>
                <Select value={overrideForm.module} onValueChange={(v) => setOverrideForm({ ...overrideForm, module: v, permission_type: PERMISSION_TYPES[v][0] })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {MODULES.map((m) =>
                    <SelectItem key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Permission</Label>
                <Select value={overrideForm.permission_type} onValueChange={(v) => setOverrideForm({ ...overrideForm, permission_type: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {PERMISSION_TYPES[overrideForm.module].map((p) =>
                    <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Action</Label>
              <Select value={overrideForm.granted.toString()} onValueChange={(v) => setOverrideForm({ ...overrideForm, granted: v === 'true' })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="true">Grant Permission</SelectItem>
                  <SelectItem value="false">Deny Permission</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Reason (Optional)</Label>
              <Input
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                placeholder="Why this override is needed..."
                className="bg-zinc-800 border-zinc-700 h-9" />

            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowOverrideDialog(false)} className="border-zinc-700 h-9 text-xs">
                CANCEL
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white h-9 text-xs font-bold">
                ADD OVERRIDE
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>);

}