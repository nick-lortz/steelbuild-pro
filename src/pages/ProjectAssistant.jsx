import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Sparkles, AlertTriangle, CheckCircle, XCircle, TrendingUp, Package, Truck, Wrench } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

const QUICK_QUERIES = [
  { label: 'Fabrication Status', query: 'What is currently blocking fabrication?' },
  { label: 'Erection Readiness', query: 'Which work packages are ready for erection?' },
  { label: 'RFI Impact', query: 'Which RFIs are affecting the critical path?' },
  { label: 'Margin at Risk', query: 'What is margin at risk today?' },
  { label: 'Delivery Issues', query: 'Are there any delivery sequence conflicts?' },
  { label: 'Escalation Needed', query: 'What needs escalation this week?' }
];

export default function ProjectAssistant() {
  const { activeProjectId } = useActiveProject();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: activeProjectId });
      return projects[0];
    },
    enabled: !!activeProjectId
  });

  useEffect(() => {
    if (!activeProjectId) return;

    const initConversation = async () => {
      const conv = await base44.agents.createConversation({
        agent_name: 'project_manager_assistant',
        metadata: {
          name: `PMA - ${project?.name || 'Project'}`,
          project_id: activeProjectId
        }
      });
      setConversationId(conv.id);
      setMessages(conv.messages || []);
    };

    initConversation();
  }, [activeProjectId, project]);

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!conversationId || !text.trim()) return;

    setIsLoading(true);
    setInputValue('');

    const conversation = await base44.agents.getConversation(conversationId);
    await base44.agents.addMessage(conversation, {
      role: 'user',
      content: text
    });
  };

  const handleQuickQuery = (query) => {
    sendMessage(query);
  };

  if (!activeProjectId) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-amber-500/20">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Active Project</h2>
            <p className="text-muted-foreground">Select a project to activate the Project Manager Assistant</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-amber-500" />
            Project Manager Assistant
          </h1>
          <p className="text-muted-foreground mt-1">
            Operational intelligence for {project?.name}
          </p>
        </div>
        <Badge variant="default" className="px-4 py-2">
          <Sparkles className="w-4 h-4 mr-2" />
          AI-Powered
        </Badge>
      </div>

      {/* Quick Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Quick Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {QUICK_QUERIES.map((item, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="justify-start text-left h-auto py-3"
                onClick={() => handleQuickQuery(item.query)}
                disabled={isLoading}>
                {item.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Ask me anything about this project's status, risks, or readiness</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                'flex gap-3',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-4 py-3',
                  msg.role === 'user'
                    ? 'bg-amber-500 text-black'
                    : 'bg-muted'
                )}>
                {msg.role === 'user' ? (
                  <p>{msg.content}</p>
                ) : (
                  <ReactMarkdown
                    className="prose prose-sm max-w-none dark:prose-invert"
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>
                    }}>
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-3">
                <p className="text-muted-foreground">Analyzing project data...</p>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="border-t p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(inputValue);
            }}
            className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about fabrication status, erection readiness, margin at risk..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !inputValue.trim()}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}