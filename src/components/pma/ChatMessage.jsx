import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Copy, Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || 'Action';
  const status = toolCall?.status || 'pending';

  const parsedResults = (() => {
    if (!toolCall.results) return null;
    try { return typeof toolCall.results === 'string' ? JSON.parse(toolCall.results) : toolCall.results; }
    catch { return toolCall.results; }
  })();

  const isError = parsedResults && (
    (typeof parsedResults === 'string' && /error|failed/i.test(parsedResults)) ||
    parsedResults?.success === false
  );

  const statusConfig = {
    pending: { icon: Clock, color: 'text-zinc-400', text: 'Pending' },
    running: { icon: Loader2, color: 'text-blue-400', text: 'Running...', spin: true },
    in_progress: { icon: Loader2, color: 'text-blue-400', text: 'Running...', spin: true },
    completed: isError
      ? { icon: AlertCircle, color: 'text-red-400', text: 'Failed' }
      : { icon: CheckCircle2, color: 'text-green-400', text: 'Done' },
    success: { icon: CheckCircle2, color: 'text-green-400', text: 'Done' },
    failed: { icon: AlertCircle, color: 'text-red-400', text: 'Failed' },
    error: { icon: AlertCircle, color: 'text-red-400', text: 'Failed' }
  }[status] || { icon: Zap, color: 'text-zinc-400', text: '' };

  const Icon = statusConfig.icon;
  const label = name.split('.').reverse().join(' › ');

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setExpanded(v => !v)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-left',
          'border-zinc-700 hover:bg-zinc-800',
          expanded && 'bg-zinc-800'
        )}
      >
        <Icon className={cn('h-3 w-3 flex-shrink-0', statusConfig.color, statusConfig.spin && 'animate-spin')} />
        <span className="text-zinc-300 truncate">{label}</span>
        {statusConfig.text && (
          <span className={cn('text-zinc-500 ml-auto flex-shrink-0', isError && 'text-red-400')}>
            {statusConfig.text}
          </span>
        )}
        {(toolCall.arguments_string || parsedResults) && !statusConfig.spin && (
          <ChevronRight className={cn('h-3 w-3 text-zinc-500 flex-shrink-0 transition-transform', expanded && 'rotate-90')} />
        )}
      </button>

      {expanded && (
        <div className="mt-1.5 ml-3 pl-3 border-l border-zinc-700 space-y-2">
          {toolCall.arguments_string && (
            <div>
              <div className="text-zinc-500 mb-1">Input:</div>
              <pre className="bg-zinc-900 rounded p-2 text-xs text-zinc-300 whitespace-pre-wrap overflow-auto max-h-32">
                {(() => { try { return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2); } catch { return toolCall.arguments_string; } })()}
              </pre>
            </div>
          )}
          {parsedResults && (
            <div>
              <div className="text-zinc-500 mb-1">Result:</div>
              <pre className="bg-zinc-900 rounded p-2 text-xs text-zinc-300 whitespace-pre-wrap overflow-auto max-h-48">
                {typeof parsedResults === 'object' ? JSON.stringify(parsedResults, null, 2) : parsedResults}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="h-4 w-4 text-black" />
        </div>
      )}

      <div className={cn('max-w-[85%]', isUser && 'flex flex-col items-end')}>
        {message.content && (
          <div className={cn(
            'rounded-2xl px-4 py-3',
            isUser
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black'
              : 'bg-zinc-800 border border-zinc-700 text-white'
          )}>
            {isUser ? (
              <p className="text-sm font-medium">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="text-sm prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-1.5 leading-relaxed text-zinc-200">{children}</p>,
                  ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc text-zinc-200">{children}</ul>,
                  ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal text-zinc-200">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  strong: ({ children }) => <strong className="font-bold text-amber-400">{children}</strong>,
                  h1: ({ children }) => <h1 className="text-base font-bold text-white mt-3 mb-1">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-bold text-white mt-2.5 mb-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold text-zinc-200 mt-2 mb-1">{children}</h3>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-amber-500 pl-3 my-2 text-zinc-400 italic">{children}</blockquote>
                  ),
                  code: ({ inline, className, children }) => {
                    if (inline) return (
                      <code className="bg-zinc-900 text-amber-400 px-1 py-0.5 rounded text-xs">{children}</code>
                    );
                    return (
                      <div className="relative group/code my-2">
                        <pre className="bg-zinc-900 rounded-lg p-3 overflow-x-auto">
                          <code className="text-xs text-zinc-300">{children}</code>
                        </pre>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-zinc-800 hover:bg-zinc-700"
                          onClick={() => {
                            navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                            toast.success('Copied');
                          }}
                        >
                          <Copy className="h-3 w-3 text-zinc-400" />
                        </Button>
                      </div>
                    );
                  },
                  a: ({ children, href }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                      {children}
                    </a>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2">
                      <table className="text-xs border-collapse w-full">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => <th className="border border-zinc-700 px-2 py-1 text-zinc-300 bg-zinc-900 text-left">{children}</th>,
                  td: ({ children }) => <td className="border border-zinc-700 px-2 py-1 text-zinc-400">{children}</td>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {message.tool_calls?.length > 0 && (
          <div className="w-full mt-1 space-y-1">
            {message.tool_calls.map((tc, i) => <ToolCallDisplay key={i} toolCall={tc} />)}
          </div>
        )}
      </div>
    </div>
  );
}