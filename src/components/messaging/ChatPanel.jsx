import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Mic, Square, AtSign } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { format } from 'date-fns';

export default function ChatPanel({ projectId, recipientEmail, relatedEntityType, relatedEntityId }) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [showMentions, setShowMentions] = useState(false);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me()
  });

  const { data: projectUsers = [] } = useQuery({
    queryKey: ['projectUsers', projectId],
    queryFn: async () => {
      const project = await base44.entities.Project.list().then(p => p.find(pr => pr.id === projectId));
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => 
        u.email === project?.project_manager || 
        u.email === project?.superintendent ||
        (project?.assigned_users && project.assigned_users.includes(u.email))
      );
    },
    enabled: !!projectId
  });

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['messages', projectId, recipientEmail],
    queryFn: async () => {
      const query = { project_id: projectId };
      if (recipientEmail) {
        query.recipient_email = recipientEmail;
      }
      return base44.entities.Message.filter(query, '-created_date');
    },
    refetchInterval: 3000 // Poll every 3s
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
      setMessage('');
    }
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const extractMentions = (text) => {
    const mentionRegex = /@(\S+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentioned = projectUsers.find(u => 
        u.email.startsWith(match[1]) || u.full_name?.toLowerCase().includes(match[1].toLowerCase())
      );
      if (mentioned) mentions.push(mentioned.email);
    }
    return mentions;
  };

  const handleSend = () => {
    if (!message.trim()) return;

    const mentions = extractMentions(message);
    
    sendMessageMutation.mutate({
      project_id: projectId,
      sender_email: currentUser.email,
      sender_name: currentUser.full_name || currentUser.email,
      recipient_email: recipientEmail || null,
      content: message,
      mentions,
      related_entity_type: relatedEntityType || 'none',
      related_entity_id: relatedEntityId || null
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'voice-note.webm', { type: 'audio/webm' });
        
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        sendMessageMutation.mutate({
          project_id: projectId,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name || currentUser.email,
          recipient_email: recipientEmail || null,
          content: '[Voice Note]',
          voice_note_url: file_url,
          related_entity_type: relatedEntityType || 'none',
          related_entity_id: relatedEntityId || null
        });

        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const insertMention = (user) => {
    setMessage(prev => prev + `@${user.full_name || user.email} `);
    setShowMentions(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Messages</span>
          {recipientEmail && <Badge variant="outline">{recipientEmail}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-4">
          <div className="space-y-3 py-4">
            {messages.map((msg) => {
              const isOwn = msg.sender_email === currentUser?.email;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${isOwn ? 'bg-amber-500/20' : 'bg-secondary'} rounded-lg p-3`}>
                    {!isOwn && (
                      <p className="text-xs font-medium mb-1">{msg.sender_name}</p>
                    )}
                    {msg.voice_note_url ? (
                      <audio controls src={msg.voice_note_url} className="w-full max-w-xs" />
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(msg.created_date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          {showMentions && (
            <div className="mb-2 p-2 bg-secondary rounded-lg space-y-1 max-h-32 overflow-y-auto">
              {projectUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => insertMention(user)}
                  className="w-full text-left px-2 py-1 text-sm hover:bg-muted rounded"
                >
                  {user.full_name || user.email}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowMentions(!showMentions)}
            >
              <AtSign size={16} />
            </Button>
            
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1"
            />

            {isRecording ? (
              <Button variant="destructive" size="icon" onClick={stopRecording}>
                <Square size={16} />
              </Button>
            ) : (
              <Button variant="outline" size="icon" onClick={startRecording}>
                <Mic size={16} />
              </Button>
            )}

            <Button onClick={handleSend} disabled={!message.trim() || sendMessageMutation.isPending}>
              <Send size={16} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}