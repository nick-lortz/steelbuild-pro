import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from '@/components/layout/PageHeader';
import ContentSection from '@/components/layout/ContentSection';
import DataTable from '@/components/ui/DataTable';
import PermissionManager from '@/components/settings/PermissionManager';
import NotificationPreferences from '@/components/settings/NotificationPreferences';
import TrainingCenter from '@/components/settings/TrainingCenter';
import { UserCircle, Shield, Users, Plus, Save, MessageSquare, Send, Bell, Monitor, Zap, Trash2, AlertTriangle, GraduationCap } from 'lucide-react';
import { toast } from "sonner";
import { safeFormat } from '@/components/shared/dateUtilsSafe';
import { cn } from '@/lib/utils';

export default function Settings() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    title: '',
    department: ''
  });
  const [displayPrefs, setDisplayPrefs] = useState({
    date_format: 'MM/dd/yyyy',
    time_zone: 'America/Phoenix',
    currency_format: 'USD',
    number_format: 'en-US',
    start_of_week: 'monday',
    default_view: 'dashboard',
    compact_mode: false,
    show_project_codes: true,
    show_tooltips: true,
    animation_speed: 'normal'
  });
  const [workflowPrefs, setWorkflowPrefs] = useState({
    auto_assign_tasks: false,
    require_task_approval: false,
    auto_advance_phase: false,
    enable_quick_actions: true,
    default_task_duration: 1,
    default_priority: 'medium',
    require_cost_code: true
  });
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000
  });

  useEffect(() => {
    if (currentUser) {
      setProfileData({
        full_name: currentUser.full_name || '',
        phone: currentUser.phone || '',
        title: currentUser.title || '',
        department: currentUser.department || ''
      });
      if (currentUser.display_preferences) {
        setDisplayPrefs((prev) => ({ ...prev, ...currentUser.display_preferences }));
      }
      if (currentUser.workflow_preferences) {
        setWorkflowPrefs((prev) => ({ ...prev, ...currentUser.workflow_preferences }));
      }
    }
  }, [currentUser]);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: currentUser?.role === 'admin'
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }) => base44.users.inviteUser(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowInviteDialog(false);
      setInviteEmail('');
      toast.success('Invite sent');
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('updateUserProfile', data);
      if (response.data.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Saved');
    }
  });

  const [feedbackForm, setFeedbackForm] = useState({
    type: 'feature_request',
    title: '',
    description: '',
    priority: 'medium'
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: (data) => base44.entities.Feedback.create({
      ...data,
      user_email: currentUser?.email,
      user_name: currentUser?.full_name || currentUser?.email
    }),
    onSuccess: () => {
      setFeedbackForm({ type: 'feature_request', title: '', description: '', priority: 'medium' });
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      toast.success('Feedback submitted');
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke('deleteUserAccount', { user_id: currentUser.id });
    },
    onSuccess: () => {
      toast.success('Account deleted. Logging out...');
      setTimeout(() => base44.auth.logout(), 2000);
    },
    onError: (error) => {
      toast.error('Failed to delete account: ' + error.message);
    }
  });

  const { data: myFeedback = [] } = useQuery({
    queryKey: ['feedback'],
    queryFn: () => base44.entities.Feedback.filter({ user_email: currentUser?.email }, '-created_date'),
    enabled: !!currentUser?.email
  });

  const isAdmin = currentUser?.role === 'admin';

  const userColumns = [
  {
    header: 'User',
    render: (row) =>
    <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
            <UserCircle size={16} className="text-amber-500" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">{row.full_name || 'No name'}</p>
            <p className="text-[10px] text-zinc-500">{row.email}</p>
          </div>
        </div>

  },
  {
    header: 'Role',
    render: (row) =>
    <Badge className={cn(
      "text-[10px] font-bold",
      row.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
    )}>
          <Shield size={9} className="mr-1" />
          {row.role.toUpperCase()}
        </Badge>

  },
  {
    header: 'Joined',
    render: (row) => safeFormat(row.created_date, 'MMM d, yyyy', '-')
  }];


  return (
    <div className="bg-gradient-to-b text-slate-50 min-h-screen from-zinc-950 to-black">
      <PageHeader
        title="Settings"
        subtitle="Profile • Preferences • Customization" />


      <ContentSection>
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="profile"><UserCircle size={12} className="mr-1.5" />Profile</TabsTrigger>
            {isAdmin && <TabsTrigger value="users"><Users size={12} className="mr-1.5" />Users</TabsTrigger>}
            {isAdmin && <TabsTrigger value="permissions"><Shield size={12} className="mr-1.5" />Permissions</TabsTrigger>}
            <TabsTrigger value="display"><Monitor size={12} className="mr-1.5" />Display</TabsTrigger>
            <TabsTrigger value="workflow"><Zap size={12} className="mr-1.5" />Workflow</TabsTrigger>
            <TabsTrigger value="notifications"><Bell size={12} className="mr-1.5" />Notifications</TabsTrigger>
            <TabsTrigger value="training"><GraduationCap size={12} className="mr-1.5" />Training</TabsTrigger>
            <TabsTrigger value="feedback"><MessageSquare size={12} className="mr-1.5" />Feedback</TabsTrigger>
          </TabsList>

          {/* Profile */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base uppercase tracking-wide">Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                  <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center">
                    <UserCircle size={32} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">{currentUser?.full_name || 'No name'}</p>
                    <p className="text-xs text-zinc-400">{currentUser?.email}</p>
                    <Badge className="mt-1 bg-amber-500/20 text-amber-400 text-[9px] font-bold px-2 py-0">
                      {currentUser?.role?.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Full Name</Label>
                    <Input value={profileData.full_name} onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })} className="bg-zinc-800 border-zinc-700 h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Job Title</Label>
                    <Input value={profileData.title} onChange={(e) => setProfileData({ ...profileData, title: e.target.value })} placeholder="Project Manager" className="bg-zinc-800 border-zinc-700 h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Phone</Label>
                    <Input value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} placeholder="+1 (555) 123-4567" className="bg-zinc-800 border-zinc-700 h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Department</Label>
                    <Input value={profileData.department} onChange={(e) => setProfileData({ ...profileData, department: e.target.value })} placeholder="Operations" className="bg-zinc-800 border-zinc-700 h-9" />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={() => updateProfileMutation.mutate(profileData)} className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-9 text-xs">
                    <Save size={14} className="mr-1" />
                    SAVE
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users */}
          {isAdmin &&
          <TabsContent value="users">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base uppercase tracking-wide">User Management</CardTitle>
                    <Button onClick={() => setShowInviteDialog(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-8 text-xs">
                      <Plus size={14} className="mr-1" />
                      INVITE
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable columns={userColumns} data={allUsers} emptyMessage="No users" />
                </CardContent>
              </Card>
            </TabsContent>
          }

          {/* Permissions */}
          {isAdmin &&
          <TabsContent value="permissions">
              <PermissionManager />
            </TabsContent>
          }

          {/* Display Preferences */}
          <TabsContent value="display">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base uppercase tracking-wide flex items-center gap-2">
                  <Monitor size={16} />
                  Display Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Date Format</Label>
                    <Select value={displayPrefs.date_format} onValueChange={(v) => setDisplayPrefs({ ...displayPrefs, date_format: v })}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Time Zone</Label>
                    <Select value={displayPrefs.time_zone} onValueChange={(v) => setDisplayPrefs({ ...displayPrefs, time_zone: v })}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="America/New_York">Eastern</SelectItem>
                        <SelectItem value="America/Chicago">Central</SelectItem>
                        <SelectItem value="America/Denver">Mountain</SelectItem>
                        <SelectItem value="America/Phoenix">Arizona</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Currency</Label>
                    <Select value={displayPrefs.currency_format} onValueChange={(v) => setDisplayPrefs({ ...displayPrefs, currency_format: v })}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="CAD">CAD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Week Starts On</Label>
                    <Select value={displayPrefs.start_of_week} onValueChange={(v) => setDisplayPrefs({ ...displayPrefs, start_of_week: v })}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="sunday">Sunday</SelectItem>
                        <SelectItem value="monday">Monday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-bold text-sm">Compact Mode</Label>
                      <p className="text-xs text-zinc-500">Reduce spacing and padding</p>
                    </div>
                    <Switch checked={displayPrefs.compact_mode} onCheckedChange={(v) => setDisplayPrefs({ ...displayPrefs, compact_mode: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-bold text-sm">Show Project Codes</Label>
                      <p className="text-xs text-zinc-500">Display project numbers in lists</p>
                    </div>
                    <Switch checked={displayPrefs.show_project_codes} onCheckedChange={(v) => setDisplayPrefs({ ...displayPrefs, show_project_codes: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-bold text-sm">Show Tooltips</Label>
                      <p className="text-xs text-zinc-500">Enable helpful hints</p>
                    </div>
                    <Switch checked={displayPrefs.show_tooltips} onCheckedChange={(v) => setDisplayPrefs({ ...displayPrefs, show_tooltips: v })} />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={() => updateProfileMutation.mutate({ display_preferences: displayPrefs })} className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-9 text-xs">
                    <Save size={14} className="mr-1" />
                    SAVE
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workflow */}
          <TabsContent value="workflow">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base uppercase tracking-wide flex items-center gap-2">
                  <Zap size={16} />
                  Workflow Automation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-bold text-sm">Auto-assign Tasks</Label>
                      <p className="text-xs text-zinc-500">Automatically assign to PM when created</p>
                    </div>
                    <Switch checked={workflowPrefs.auto_assign_tasks} onCheckedChange={(v) => setWorkflowPrefs({ ...workflowPrefs, auto_assign_tasks: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-bold text-sm">Require Cost Code</Label>
                      <p className="text-xs text-zinc-500">Mandatory cost code on tasks</p>
                    </div>
                    <Switch checked={workflowPrefs.require_cost_code} onCheckedChange={(v) => setWorkflowPrefs({ ...workflowPrefs, require_cost_code: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-bold text-sm">Enable Quick Actions</Label>
                      <p className="text-xs text-zinc-500">Show quick action buttons in lists</p>
                    </div>
                    <Switch checked={workflowPrefs.enable_quick_actions} onCheckedChange={(v) => setWorkflowPrefs({ ...workflowPrefs, enable_quick_actions: v })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Default Task Duration</Label>
                    <Select value={workflowPrefs.default_task_duration.toString()} onValueChange={(v) => setWorkflowPrefs({ ...workflowPrefs, default_task_duration: parseInt(v) })}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="1">1 Day</SelectItem>
                        <SelectItem value="2">2 Days</SelectItem>
                        <SelectItem value="3">3 Days</SelectItem>
                        <SelectItem value="5">1 Week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Default Priority</Label>
                    <Select value={workflowPrefs.default_priority} onValueChange={(v) => setWorkflowPrefs({ ...workflowPrefs, default_priority: v })}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={() => updateProfileMutation.mutate({ workflow_preferences: workflowPrefs })} className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-9 text-xs">
                    <Save size={14} className="mr-1" />
                    SAVE
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions */}
          {isAdmin &&
          <TabsContent value="permissions">
              <PermissionManager />
            </TabsContent>
          }

          {/* Notifications */}
          <TabsContent value="notifications">
            <NotificationPreferences />
          </TabsContent>

          {/* Training */}
          <TabsContent value="training">
            <TrainingCenter />
          </TabsContent>

          {/* Feedback */}
          <TabsContent value="feedback">
            <div className="space-y-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base uppercase tracking-wide flex items-center gap-2">
                    <MessageSquare size={16} />
                    Submit Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => {e.preventDefault();submitFeedbackMutation.mutate(feedbackForm);}} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Type</Label>
                        <Select value={feedbackForm.type} onValueChange={(v) => setFeedbackForm({ ...feedbackForm, type: v })}>
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800">
                            <SelectItem value="feature_request">Feature Request</SelectItem>
                            <SelectItem value="bug_report">Bug Report</SelectItem>
                            <SelectItem value="general_feedback">General</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Priority</Label>
                        <Select value={feedbackForm.priority} onValueChange={(v) => setFeedbackForm({ ...feedbackForm, priority: v })}>
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800">
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Title</Label>
                      <Input value={feedbackForm.title} onChange={(e) => setFeedbackForm({ ...feedbackForm, title: e.target.value })} placeholder="Brief summary" required className="bg-zinc-800 border-zinc-700 h-9" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Description</Label>
                      <Textarea value={feedbackForm.description} onChange={(e) => setFeedbackForm({ ...feedbackForm, description: e.target.value })} placeholder="Details..." required rows={4} className="bg-zinc-800 border-zinc-700" />
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={!feedbackForm.title || !feedbackForm.description} className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-9 text-xs">
                        <Send size={14} className="mr-1" />
                        SUBMIT
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base uppercase tracking-wide">History</CardTitle>
                </CardHeader>
                <CardContent>
                  {myFeedback.length === 0 ?
                  <p className="text-center text-zinc-600 py-6 text-sm">No feedback yet</p> :

                  <div className="space-y-2">
                      {myFeedback.map((item) =>
                    <div key={item.id} className="p-3 bg-zinc-800/50 rounded border border-zinc-800">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-bold text-white text-sm">{item.title}</h4>
                            <Badge className={cn(
                          "text-[9px] font-bold",
                          item.status === 'completed' && "bg-green-500/20 text-green-400",
                          item.status === 'in_progress' && "bg-blue-500/20 text-blue-400"
                        )}>
                              {item.status?.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-400">{item.description}</p>
                          <p className="text-[10px] text-zinc-600 mt-2 font-mono">
                            {safeFormat(item.created_date, 'MMM d, yyyy', '')}
                          </p>
                        </div>
                    )}
                    </div>
                  }
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-900 border-red-900/50 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle size={20} />
              Confirm Account Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              You are about to permanently delete your account. This will:
            </p>
            <ul className="text-xs text-zinc-400 space-y-1 ml-4 list-disc">
              <li>Remove all your personal data</li>
              <li>Revoke access to all projects</li>
              <li>Delete your preferences and settings</li>
              <li>Cannot be undone</li>
            </ul>
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <Label className="text-xs font-bold text-zinc-400">
                Type DELETE to confirm
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="bg-zinc-800 border-zinc-700 h-9 font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmText('');
                }}
                className="border-zinc-700 h-9 text-xs"
              >
                CANCEL
              </Button>
              <Button
                onClick={() => {
                  if (deleteConfirmText === 'DELETE') {
                    deleteAccountMutation.mutate();
                  }
                }}
                disabled={deleteConfirmText !== 'DELETE' || deleteAccountMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white h-9 text-xs"
              >
                <Trash2 size={14} className="mr-1" />
                {deleteAccountMutation.isPending ? 'DELETING...' : 'DELETE ACCOUNT'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {e.preventDefault();inviteMutation.mutate({ email: inviteEmail, role: inviteRole });}} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Email</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required className="bg-zinc-800 border-zinc-700 h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)} className="border-zinc-700 h-9 text-xs">
                CANCEL
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-9 text-xs">
                SEND INVITE
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </ContentSection>
    </div>);

}