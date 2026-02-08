import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import ContentSection from '@/components/layout/ContentSection';
import ChatPanel from '@/components/messaging/ChatPanel';
import ActivityFeed from '@/components/activity/ActivityFeed';
import { MessageSquare } from 'lucide-react';

export default function Messages() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.entities.User.list()
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.list('-updated_date')
  });

  const { data: recentMessages = [] } = useQuery({
    queryKey: ['recentMessages'],
    queryFn: () => apiClient.entities.Message.list('-created_date', 100)
  });

  const conversations = React.useMemo(() => {
    const convMap = new Map();
    
    recentMessages.forEach(msg => {
      const otherUser = msg.sender_email === currentUser?.email 
        ? msg.recipient_email 
        : msg.sender_email;
      
      if (!otherUser) return;
      
      if (!convMap.has(otherUser)) {
        const user = users.find(u => u.email === otherUser);
        const project = projects.find(p => p.id === msg.project_id);
        convMap.set(otherUser, {
          email: otherUser,
          name: user?.full_name || otherUser,
          lastMessage: msg.content,
          lastTimestamp: msg.created_date,
          projectName: project?.name,
          unread: !msg.is_read && msg.recipient_email === currentUser?.email
        });
      }
    });

    return Array.from(convMap.values())
      .sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
  }, [recentMessages, users, projects, currentUser]);

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageShell>
      <PageHeader
        title="Communications"
        subtitle="messages & activity"
      />

      <ContentSection>
        <Tabs defaultValue="messages" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="messages">
              <MessageSquare size={14} className="mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          </TabsList>

        <TabsContent value="messages">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardContent className="p-4">
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-4"
                />
                <div className="space-y-2">
                  {filteredConversations.map(conv => (
                    <button
                      key={conv.email}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedConversation?.email === conv.email
                          ? 'bg-amber-500/20'
                          : 'bg-secondary hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">{conv.name}</p>
                        {conv.unread && (
                          <div className="w-2 h-2 bg-amber-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                      {conv.projectName && (
                        <p className="text-[10px] text-muted-foreground mt-1">{conv.projectName}</p>
                      )}
                    </button>
                  ))}
                  {filteredConversations.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No conversations found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              {selectedConversation ? (
                <ChatPanel
                  projectId={null}
                  recipientEmail={selectedConversation.email}
                />
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-[500px] text-muted-foreground">
                    Select a conversation to start messaging
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

          <TabsContent value="activity">
            <ActivityFeed />
          </TabsContent>
        </Tabs>
      </ContentSection>
    </PageShell>
  );
}