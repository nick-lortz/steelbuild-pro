import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { FileText, TrendingUp, Loader2, Download, Copy } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function AIProgressReport({ projectId }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState('week');

  const generateReport = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('aiProgressSummary', { 
        project_id: projectId,
        period 
      });
      if (data.success) {
        setReport(data);
        toast.success('Progress report generated');
      } else {
        toast.error('Report generation failed');
      }
    } catch (error) {
      toast.error('Failed to generate report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (!report) {
    return (
      <Card className="bg-gradient-to-br from-blue-900/20 to-green-900/20 border-blue-500/30">
        <CardContent className="p-6 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-blue-400" />
          <h3 className="text-lg font-bold text-white mb-2">AI Progress Summary</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Generate comprehensive progress reports from RFIs, daily logs, and activity data
          </p>
          <div className="flex gap-2 justify-center mb-4">
            <Button
              size="sm"
              variant={period === 'week' ? 'default' : 'outline'}
              onClick={() => setPeriod('week')}
            >
              Last Week
            </Button>
            <Button
              size="sm"
              variant={period === 'month' ? 'default' : 'outline'}
              onClick={() => setPeriod('month')}
            >
              Last Month
            </Button>
          </div>
          <Button 
            onClick={generateReport} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { report: data } = report;
  
  const categoryIcons = {
    accomplishment: '✓',
    milestone: '🎯',
    issue: '⚠',
    risk: '⚡'
  };

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              AI Progress Report
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={period === 'week' ? 'default' : 'ghost'}
                onClick={() => { setPeriod('week'); setReport(null); }}
              >
                Week
              </Button>
              <Button
                size="sm"
                variant={period === 'month' ? 'default' : 'ghost'}
                onClick={() => { setPeriod('month'); setReport(null); }}
              >
                Month
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={generateReport}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Executive Summary */}
          <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white">Executive Summary</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(data.summary)}
              >
                <Copy size={14} />
              </Button>
            </div>
            <div className="text-sm text-zinc-300 whitespace-pre-wrap">{data.summary}</div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1">Tasks Completed</div>
              <div className="text-2xl font-bold text-white">{data.metrics.tasks_completed}</div>
            </div>
            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1">Progress</div>
              <div className="text-2xl font-bold text-white">{data.metrics.progress_percent}%</div>
            </div>
            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1">Labor Hours</div>
              <div className="text-2xl font-bold text-white">{data.metrics.labor_hours}</div>
            </div>
            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1">RFIs Closed</div>
              <div className="text-2xl font-bold text-white">{data.metrics.rfis_closed}</div>
            </div>
          </div>

          {/* Safety Record */}
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
            <div className="text-xs text-green-400 font-bold mb-1">Safety Record</div>
            <div className="text-sm text-zinc-300">{data.metrics.safety_record}</div>
          </div>

          {/* Highlights */}
          {data.highlights.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-white mb-2">Key Highlights</h4>
              <div className="space-y-2">
                {data.highlights.map((highlight, idx) => (
                  <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{categoryIcons[highlight.category] || '•'}</span>
                      <div className="flex-1">
                        <div className="font-bold text-white text-sm mb-1">{highlight.title}</div>
                        <div className="text-xs text-zinc-400">{highlight.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Week Focus */}
          {data.next_week_focus.length > 0 && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
              <div className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2">
                <TrendingUp size={14} />
                Next Week Focus
              </div>
              <ul className="space-y-1">
                {data.next_week_focus.map((item, idx) => (
                  <li key={idx} className="text-xs text-zinc-300">• {item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Concerns */}
          {data.concerns.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded">
              <div className="text-sm font-bold text-amber-400 mb-2">Concerns</div>
              <ul className="space-y-1">
                {data.concerns.map((concern, idx) => (
                  <li key={idx} className="text-xs text-zinc-300">• {concern}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Client-Ready Version */}
          <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white">Client-Ready Summary</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(data.client_ready)}
              >
                <Copy size={14} />
              </Button>
            </div>
            <div className="text-sm text-zinc-300 whitespace-pre-wrap">{data.client_ready}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}