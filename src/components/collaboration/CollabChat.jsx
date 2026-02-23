import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/shared/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Paperclip, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function CollabChat({ sessionId, projectId, onPMAInsight }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['collaboration-messages', sessionId],
    queryFn: async () => {
      return await base44.entities.CollaborationMessage.filter(
        { session_id: sessionId },
        'created_date',
        1000
      );
    },
    enabled: !!sessionId,
    refetchInterval: 3000
  });

  const sendMutation = useMutation({
    mutationFn: async (msg) => {
      return await base44.entities.CollaborationMessage.create({
        session_id: sessionId,
        project_id: projectId,
        author: user.email,
        author_name: user.full_name,
        message: msg,
        pma_insight: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['collaboration-messages', sessionId]);
      setMessage('');
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message);
  };

  const handlePMARequest = () => {
    if (onPMAInsight) onPMAInsight();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isOwn = msg.author === user.email;
          const isPMA = msg.pma_insight;

          return (
            <div
              key={msg.id}
              className={cn(
                'flex gap-2',
                isOwn && !isPMA ? 'justify-end' : 'justify-start'
              )}>
              {isPMA && (
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[70%] rounded-lg px-3 py-2',
                  isOwn && !isPMA ? 'bg-amber-500 text-black' : 'bg-muted'
                )}>
                {!isOwn && !isPMA && (
                  <p className="text-xs font-medium mb-1">{msg.author_name}</p>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <p className="text-xs opacity-60 mt-1">
                  {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePMARequest}
          className="flex-shrink-0">
          <Sparkles className="w-4 h-4" />
        </Button>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type message..."
          className="flex-1"
        />
        <Button size="sm" onClick={handleSend} disabled={!message.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}