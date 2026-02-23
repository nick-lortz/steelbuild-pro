import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { useAuth } from '@/components/shared/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PenTool, MessageSquare, FileText, Sparkles, Plus, Users } from 'lucide-react';
import Whiteboard from '@/components/collaboration/Whiteboard';
import CollabChat from '@/components/collaboration/CollabChat';
import CollabDocument from '@/components/collaboration/CollabDocument';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Collaboration() {
  const { activeProjectId } = useActiveProject();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState(null);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionType, setNewSessionType] = useState('whiteboard');

  const { data: sessions = [] } = useQuery({
    queryKey: ['collaboration-sessions', activeProjectId],
    queryFn: async () => {
      return await base44.entities.CollaborationSession.filter(
        { project_id: activeProjectId, status: 'active' },
        '-created_date',
        100
      );
    },
    enabled: !!activeProjectId
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.CollaborationSession.create({
        project_id: activeProjectId,
        session_type: data.type,
        title: data.title,
        participants: [user.email],
        active_users: [user.email],
        status: 'active'
      });
    },
    onSuccess: (newSession) => {
      queryClient.invalidateQueries(['collaboration-sessions']);
      setSelectedSession(newSession);
      setNewSessionOpen(false);
      setNewSessionTitle('');
    }
  });

  const handlePMAInsight = async () => {
    if (!selectedSession) return;

    // Create PMA conversation linked to this session
    const conv = await base44.agents.createConversation({
      agent_name: 'project_manager_assistant',
      metadata: {
        name: `PMA Insight - ${selectedSession.title}`,
        project_id: activeProjectId,
        session_id: selectedSession.id
      }
    });

    await base44.agents.addMessage(conv, {
      role: 'user',
      content: `Provide insight for this collaboration session: ${selectedSession.title}. What risks, blockers, or actions should the team discuss?`
    });

    const messages = await base44.agents.getConversation(conv.id);
    const pmaResponse = messages.messages[messages.messages.length - 1];

    if (pmaResponse?.role === 'assistant') {
      await base44.entities.CollaborationMessage.create({
        session_id: selectedSession.id,
        project_id: activeProjectId,
        author: 'pma@steelbuild.pro',
        author_name: 'Project Manager Assistant',
        message: pmaResponse.content,
        pma_insight: true
      });
    }
  };

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select a project to start collaborating</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Team Collaboration</h1>
          <p className="text-muted-foreground">Real-time whiteboard, chat, and documents</p>
        </div>

        <Dialog open={newSessionOpen} onOpenChange={setNewSessionOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Collaboration Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Session Title</Label>
                <Input
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  placeholder="e.g., RFI-042 Design Review"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={newSessionType} onValueChange={setNewSessionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whiteboard">Whiteboard</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="document">Shared Document</SelectItem>
                    <SelectItem value="design_review">Design Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => createSessionMutation.mutate({ title: newSessionTitle, type: newSessionType })}
                disabled={!newSessionTitle.trim()}
                className="w-full">
                Create Session
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-220px)]">
        {/* Session List */}
        <Card className="col-span-3 overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {sessions.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No active sessions. Create one to start.
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedSession?.id === session.id
                        ? 'bg-amber-500/10 border border-amber-500/20'
                        : 'hover:bg-muted'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {session.session_type === 'whiteboard' && <PenTool className="w-4 h-4" />}
                      {session.session_type === 'chat' && <MessageSquare className="w-4 h-4" />}
                      {session.session_type === 'document' && <FileText className="w-4 h-4" />}
                      <span className="font-medium text-sm">{session.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {session.active_users?.length || 0} active
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Workspace */}
        <Card className="col-span-9 overflow-hidden flex flex-col">
          {!selectedSession ? (
            <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a session or create a new one</p>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>{selectedSession.title}</CardTitle>
                  <Button variant="outline" size="sm" onClick={handlePMAInsight}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Ask PMA
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <Tabs defaultValue="workspace" className="h-full flex flex-col">
                  <TabsList className="w-full justify-start rounded-none border-b">
                    <TabsTrigger value="workspace">Workspace</TabsTrigger>
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                  </TabsList>
                  <TabsContent value="workspace" className="flex-1 m-0">
                    {selectedSession.session_type === 'whiteboard' && (
                      <Whiteboard
                        sessionId={selectedSession.id}
                        initialData={selectedSession.whiteboard_data}
                        onSave={(data) => {
                          base44.entities.CollaborationSession.update(selectedSession.id, {
                            whiteboard_data: data
                          });
                        }}
                      />
                    )}
                    {selectedSession.session_type === 'document' && (
                      <CollabDocument session={selectedSession} />
                    )}
                  </TabsContent>
                  <TabsContent value="chat" className="flex-1 m-0">
                    <CollabChat
                      sessionId={selectedSession.id}
                      projectId={activeProjectId}
                      onPMAInsight={handlePMAInsight}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}