import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Copy, Download, Loader2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

export default function WeeklySummaryPanel({ weekId, projectIds = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['weekly-summary', weekId, projectIds],
    queryFn: async () => {
      const response = await apiClient.functions.invoke('generateWeeklySummary', {
        week_id: weekId,
        project_ids: projectIds
      });
      return response.data;
    },
    enabled: isExpanded,
    staleTime: 5 * 60 * 1000
  });

  const handleCopy = () => {
    if (data?.summary) {
      navigator.clipboard.writeText(data.summary);
      toast.success('Summary copied to clipboard');
    }
  };

  const handleDownload = () => {
    if (data?.summary) {
      const blob = new Blob([data.summary], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `production-summary-${weekId}.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Summary downloaded');
    }
  };

  if (!isExpanded) {
    return (
      <Card className="bg-gradient-to-r from-amber-900/20 to-amber-800/20 border-amber-700">
        <CardContent className="p-4">
          <Button
            onClick={() => setIsExpanded(true)}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black"
          >
            <Sparkles size={16} className="mr-2" />
            Generate AI Weekly Summary
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-amber-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-500">
            <Sparkles size={20} />
            Weekly Summary
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            </Button>
            {data && (
              <>
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  <Copy size={14} />
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download size={14} />
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => setIsExpanded(false)}>
              Close
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-amber-500" size={32} />
            <span className="ml-3 text-zinc-400">Analyzing production notes...</span>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Metrics */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-zinc-800 p-3 rounded">
                <div className="text-2xl font-bold text-amber-500">{data.metrics.total_notes}</div>
                <div className="text-xs text-zinc-400">Total Notes</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded">
                <div className="text-2xl font-bold text-blue-500">{data.metrics.actions}</div>
                <div className="text-xs text-zinc-400">Action Items</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded">
                <div className="text-2xl font-bold text-purple-500">{data.metrics.decisions}</div>
                <div className="text-xs text-zinc-400">Decisions</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded">
                <div className="text-2xl font-bold text-green-500">{data.metrics.projects_count}</div>
                <div className="text-xs text-zinc-400">Projects</div>
              </div>
            </div>

            {/* Alerts */}
            {(data.metrics.overdue_actions > 0 || data.metrics.open_actions > 5) && (
              <div className="flex gap-2">
                {data.metrics.overdue_actions > 0 && (
                  <Badge className="bg-red-700">
                    {data.metrics.overdue_actions} Overdue Actions
                  </Badge>
                )}
                {data.metrics.open_actions > 5 && (
                  <Badge variant="outline" className="text-amber-400">
                    {data.metrics.open_actions} Open Actions
                  </Badge>
                )}
              </div>
            )}

            {/* AI Summary */}
            <div className="bg-zinc-800 rounded-lg p-4 prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-bold text-amber-500 mb-3">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-bold text-amber-400 mb-2 mt-4">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold text-zinc-200 mb-2 mt-3">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc ml-4 space-y-1 text-zinc-300">{children}</ul>,
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  p: ({ children }) => <p className="text-sm text-zinc-300 mb-2">{children}</p>,
                  strong: ({ children }) => <strong className="text-zinc-100 font-semibold">{children}</strong>
                }}
              >
                {data.summary}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-500">
            Failed to generate summary
          </div>
        )}
      </CardContent>
    </Card>
  );
}