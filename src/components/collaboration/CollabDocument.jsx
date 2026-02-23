import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { debounce } from 'lodash';

export default function CollabDocument({ session, onUpdate }) {
  const [content, setContent] = useState(session?.document_content || '');
  const [activeUsers, setActiveUsers] = useState(session?.active_users || []);

  const updateMutation = useMutation({
    mutationFn: async (newContent) => {
      return await base44.entities.CollaborationSession.update(session.id, {
        document_content: newContent,
        active_users: activeUsers
      });
    }
  });

  const debouncedUpdate = debounce((value) => {
    updateMutation.mutate(value);
    if (onUpdate) onUpdate(value);
  }, 1000);

  useEffect(() => {
    // Subscribe to session updates
    const unsubscribe = base44.entities.CollaborationSession.subscribe((event) => {
      if (event.id === session.id && event.type === 'update') {
        setContent(event.data.document_content || '');
        setActiveUsers(event.data.active_users || []);
      }
    });

    return unsubscribe;
  }, [session.id]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setContent(newValue);
    debouncedUpdate(newValue);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {activeUsers.length} active
        </span>
        {activeUsers.map((email, idx) => (
          <Badge key={idx} variant="secondary" className="text-xs">
            {email.split('@')[0]}
          </Badge>
        ))}
      </div>

      <Textarea
        value={content}
        onChange={handleChange}
        placeholder="Start typing... changes sync in real-time"
        className="flex-1 resize-none border-0 focus-visible:ring-0 font-mono text-sm"
      />
    </div>
  );
}