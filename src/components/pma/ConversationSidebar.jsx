import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MessageSquare, Search, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function ConversationSidebar({ activeProjectId, conversationId, onSelect, onNew }) {
  const [search, setSearch] = useState('');

  const { data: conversations = [], refetch } = useQuery({
    queryKey: ['pma-conversations', activeProjectId],
    queryFn: () => base44.agents.listConversations({ agent_name: 'project_manager_assistant' }),
    enabled: !!activeProjectId,
    staleTime: 10000
  });

  const projectConvs = conversations
    .filter(c => c.metadata?.project_id === activeProjectId)
    .filter(c => search
      ? (c.metadata?.name || '').toLowerCase().includes(search.toLowerCase())
      : true
    )
    .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date));

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800 w-64 flex-shrink-0">
      <div className="p-3 border-b border-zinc-800">
        <Button
          onClick={onNew}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold"
          size="sm"
        >
          <Plus size={14} className="mr-1.5" />
          New Conversation
        </Button>
      </div>

      <div className="p-2 border-b border-zinc-800">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-7 h-7 text-xs bg-zinc-900 border-zinc-700 text-zinc-300"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {projectConvs.length === 0 ? (
          <div className="text-center py-8 text-zinc-600 text-xs px-4">
            No conversations yet
          </div>
        ) : (
          projectConvs.map(conv => {
            const isActive = conv.id === conversationId;
            const lastMsg = conv.messages?.[conv.messages.length - 1];
            const preview = lastMsg?.content?.slice(0, 60) || 'No messages yet';
            const ago = conv.updated_date || conv.created_date
              ? formatDistanceToNow(new Date(conv.updated_date || conv.created_date), { addSuffix: true })
              : '';

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={cn(
                  'w-full text-left px-3 py-2.5 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50',
                  isActive && 'bg-amber-500/10 border-l-2 border-l-amber-500'
                )}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare size={12} className={cn('mt-0.5 flex-shrink-0', isActive ? 'text-amber-500' : 'text-zinc-600')} />
                  <div className="min-w-0 flex-1">
                    <div className={cn('text-xs font-medium truncate', isActive ? 'text-amber-400' : 'text-zinc-300')}>
                      {conv.metadata?.name || 'Conversation'}
                    </div>
                    <div className="text-[10px] text-zinc-600 truncate mt-0.5">{preview}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock size={9} className="text-zinc-700" />
                      <span className="text-[10px] text-zinc-700">{ago}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}