import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Cloud, MessageSquare, DollarSign, CheckCircle2, AlertCircle, 
  Send, FileText, Zap, Settings, Users, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Integrations() {
  const queryClient = useQueryClient();
  const [slackChannel, setSlackChannel] = useState('');
  const [teamsWebhook, setTeamsWebhook] = useState('');
  const [driveFolder, setDriveFolder] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me()
  });

  const { data: integrationStatus, isLoading } = useQuery({
    queryKey: ['integration-status'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getIntegrationStatus', {});
      return response.data;
    },
    staleTime: 5 * 60 * 1000
  });

  const testSlackMutation = useMutation({
    mutationFn: async (channel) => {
      const response = await base44.functions.invoke('sendSlackNotification', {
        channel,
        message: 'Test message from SteelBuild-Pro',
        type: 'test'
      });
      return response.data;
    },
    onSuccess: () => toast.success('Slack notification sent'),
    onError: (err) => toast.error(err.message || 'Failed to send')
  });

  const testTeamsMutation = useMutation({
    mutationFn: async (webhook) => {
      const response = await base44.functions.invoke('sendTeamsNotification', {
        webhook_url: webhook,
        title: 'Test Message',
        message: 'SteelBuild-Pro is connected',
        type: 'info'
      });
      return response.data;
    },
    onSuccess: () => toast.success('Teams notification sent'),
    onError: (err) => toast.error(err.message || 'Failed to send')
  });

  const syncDriveMutation = useMutation({
    mutationFn: async (folderId) => {
      const response = await base44.functions.invoke('syncGoogleDrive', { folder_id: folderId });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Synced ${data.synced_count || 0} documents`);
      queryClient.invalidateQueries({ queryKey: ['integration-status'] });
    },
    onError: (err) => toast.error(err.message || 'Sync failed')
  });

  const isAdmin = currentUser?.role === 'admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600/10 via-zinc-900/50 to-purple-600/5 border border-purple-500/20 p-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-500 flex items-center justify-center shadow-2xl shadow-purple-500/30">
            <Zap className="w-8 h-8 text-black" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Integrations</h1>
            <p className="text-zinc-400 font-medium mt-1">Connect third-party tools</p>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <Card className="mb-6 bg-amber-500/10 border-amber-500/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              <p className="text-sm text-amber-400">Admin access required to manage integrations</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="storage" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="storage"><Cloud size={12} className="mr-1.5" />Storage</TabsTrigger>
          <TabsTrigger value="communication"><MessageSquare size={12} className="mr-1.5" />Communication</TabsTrigger>
          <TabsTrigger value="accounting"><DollarSign size={12} className="mr-1.5" />Accounting</TabsTrigger>
        </TabsList>

        {/* Cloud Storage */}
        <TabsContent value="storage">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Google Drive */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base uppercase tracking-wide flex items-center gap-2">
                    <img src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" className="w-5 h-5" alt="" />
                    Google Drive
                  </CardTitle>
                  {integrationStatus?.google_drive?.connected && (
                    <Badge className="bg-green-500/20 text-green-400 text-[8px]">
                      <CheckCircle2 size={10} className="mr-1" />
                      CONNECTED
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-zinc-400">Auto-sync project documents to Google Drive</p>
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Drive Folder ID</Label>
                  <Input
                    value={driveFolder}
                    onChange={(e) => setDriveFolder(e.target.value)}
                    placeholder="Enter folder ID from Drive URL"
                    className="bg-zinc-950 border-zinc-700 h-9 text-xs"
                    disabled={!isAdmin}
                  />
                  <p className="text-[9px] text-zinc-600">Format: https://drive.google.com/drive/folders/[FOLDER_ID]</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => syncDriveMutation.mutate(driveFolder)}
                    disabled={!isAdmin || !driveFolder || syncDriveMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                  >
                    {syncDriveMutation.isPending ? (
                      <><RefreshCw size={12} className="mr-1 animate-spin" />Syncing...</>
                    ) : (
                      <><Cloud size={12} className="mr-1" />Sync Now</>
                    )}
                  </Button>
                </div>

                {integrationStatus?.google_drive?.last_sync && (
                  <p className="text-[9px] text-zinc-600">
                    Last sync: {new Date(integrationStatus.google_drive.last_sync).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Dropbox (Placeholder) */}
            <Card className="bg-zinc-900 border-zinc-800 opacity-60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base uppercase tracking-wide flex items-center gap-2">
                  <Cloud size={16} className="text-blue-500" />
                  Dropbox
                </CardTitle>
                <Badge className="bg-zinc-800 text-zinc-500 text-[8px] w-fit">COMING SOON</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-zinc-500">Auto-sync to Dropbox folders</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Communication */}
        <TabsContent value="communication">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Slack */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base uppercase tracking-wide flex items-center gap-2">
                    <MessageSquare size={16} className="text-purple-500" />
                    Slack
                  </CardTitle>
                  {integrationStatus?.slack?.connected && (
                    <Badge className="bg-green-500/20 text-green-400 text-[8px]">
                      <CheckCircle2 size={10} className="mr-1" />
                      CONNECTED
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-zinc-400">Send project notifications to Slack channels</p>
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Channel Name</Label>
                  <Input
                    value={slackChannel}
                    onChange={(e) => setSlackChannel(e.target.value)}
                    placeholder="#project-updates"
                    className="bg-zinc-950 border-zinc-700 h-9 text-xs"
                    disabled={!isAdmin}
                  />
                </div>

                <Button
                  onClick={() => testSlackMutation.mutate(slackChannel)}
                  disabled={!isAdmin || !slackChannel || testSlackMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 h-8 text-xs w-full"
                >
                  {testSlackMutation.isPending ? (
                    <><RefreshCw size={12} className="mr-1 animate-spin" />Sending...</>
                  ) : (
                    <><Send size={12} className="mr-1" />Send Test Message</>
                  )}
                </Button>

                <div className="pt-2 border-t border-zinc-800 space-y-1">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Auto-notifications</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-400">RFI overdue alerts</p>
                      <Switch disabled={!isAdmin} className="scale-75" />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-400">Critical task delays</p>
                      <Switch disabled={!isAdmin} className="scale-75" />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-400">Delivery arrivals</p>
                      <Switch disabled={!isAdmin} className="scale-75" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Microsoft Teams */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base uppercase tracking-wide flex items-center gap-2">
                    <Users size={16} className="text-blue-500" />
                    Microsoft Teams
                  </CardTitle>
                  {integrationStatus?.teams?.configured && (
                    <Badge className="bg-green-500/20 text-green-400 text-[8px]">
                      <CheckCircle2 size={10} className="mr-1" />
                      CONFIGURED
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-zinc-400">Post updates to Teams channels via webhook</p>
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Webhook URL</Label>
                  <Input
                    value={teamsWebhook}
                    onChange={(e) => setTeamsWebhook(e.target.value)}
                    placeholder="https://outlook.office.com/webhook/..."
                    className="bg-zinc-950 border-zinc-700 h-9 text-xs"
                    type="password"
                    disabled={!isAdmin}
                  />
                  <p className="text-[9px] text-zinc-600">
                    Get from Teams → Channel → Connectors → Incoming Webhook
                  </p>
                </div>

                <Button
                  onClick={() => testTeamsMutation.mutate(teamsWebhook)}
                  disabled={!isAdmin || !teamsWebhook || testTeamsMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 h-8 text-xs w-full"
                >
                  {testTeamsMutation.isPending ? (
                    <><RefreshCw size={12} className="mr-1 animate-spin" />Sending...</>
                  ) : (
                    <><Send size={12} className="mr-1" />Send Test Message</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Accounting */}
        <TabsContent value="accounting">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* QuickBooks */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base uppercase tracking-wide flex items-center gap-2">
                    <DollarSign size={16} className="text-green-500" />
                    QuickBooks
                  </CardTitle>
                  {integrationStatus?.quickbooks?.connected && (
                    <Badge className="bg-green-500/20 text-green-400 text-[8px]">
                      <CheckCircle2 size={10} className="mr-1" />
                      CONNECTED
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-zinc-400">Sync expenses, invoices, and cost codes</p>
                
                <div className="space-y-2 p-3 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Setup Required</p>
                  <ol className="text-[10px] text-zinc-400 space-y-1 list-decimal list-inside">
                    <li>Go to Settings → Environment Variables</li>
                    <li>Add QUICKBOOKS_CLIENT_ID</li>
                    <li>Add QUICKBOOKS_CLIENT_SECRET</li>
                    <li>Return here to authorize</li>
                  </ol>
                </div>

                <Button
                  disabled
                  className="bg-green-600 hover:bg-green-700 h-8 text-xs w-full opacity-50"
                >
                  <Settings size={12} className="mr-1" />
                  Configure QuickBooks
                </Button>

                <div className="pt-2 border-t border-zinc-800">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Auto-sync</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-400">Sync expenses daily</p>
                      <Switch disabled className="scale-75" />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-400">Export invoices</p>
                      <Switch disabled className="scale-75" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Xero */}
            <Card className="bg-zinc-900 border-zinc-800 opacity-60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base uppercase tracking-wide flex items-center gap-2">
                  <DollarSign size={16} className="text-blue-500" />
                  Xero
                </CardTitle>
                <Badge className="bg-zinc-800 text-zinc-500 text-[8px] w-fit">COMING SOON</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-zinc-500">Accounting integration for international projects</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Integration Activity Log */}
      {isAdmin && integrationStatus?.recent_activity && (
        <Card className="mt-6 bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {integrationStatus.recent_activity.map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-zinc-950 rounded border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-zinc-800 text-zinc-400 text-[8px]">
                      {activity.integration}
                    </Badge>
                    <p className="text-xs text-white">{activity.action}</p>
                  </div>
                  <p className="text-[9px] text-zinc-600">{activity.timestamp}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}