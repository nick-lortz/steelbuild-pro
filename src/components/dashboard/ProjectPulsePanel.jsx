import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, ChevronDown, ChevronUp, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ProjectPulsePanel({ projectId, projectName }) {
  const queryClient = useQueryClient();
  const [showBrief, setShowBrief] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: pulse, isLoading } = useQuery({
    queryKey: ['projectPulse', projectId],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getProjectPulse', { project_id: projectId });
      return data;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  const { data: latestInsight } = useQuery({
    queryKey: ['latestInsight', projectId],
    queryFn: async () => {
      const insights = await base44.entities.AIInsight.filter({
        project_id: projectId,
        insight_type: 'project_pulse',
        is_published: true
      });
      return insights.sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at))[0];
    },
    enabled: !!projectId
  });

  const refreshPulseMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('generateProjectPulseArtifacts', { project_id: projectId });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projectPulse', projectId] });
      queryClient.invalidateQueries({ queryKey: ['latestInsight', projectId] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success(`Pulse refreshed: ${data.alerts_created} alerts generated`);
      setIsRefreshing(false);
    },
    onError: () => {
      toast.error('Failed to refresh pulse');
      setIsRefreshing(false);
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refreshPulseMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!pulse) return null;

  // Prepare aging chart data
  const agingData = [
    { name: 'RFIs', '0-7d': pulse.aging.rfi['0-7'], '8-14d': pulse.aging.rfi['8-14'], '15+d': pulse.aging.rfi['15+'] },
    { name: 'Submittals', '0-7d': pulse.aging.submittal['0-7'], '8-14d': pulse.aging.submittal['8-14'], '15+d': pulse.aging.submittal['15+'] },
    { name: 'COs', '0-7d': pulse.aging.changeOrder['0-7'], '8-14d': pulse.aging.changeOrder['8-14'], '15+d': pulse.aging.changeOrder['15+'] }
  ];

  const severityColors = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/30',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  };

  const getEntityLink = (blocker) => {
    const routes = {
      RFI: 'RFIHub',
      Task: 'Schedule',
      Delivery: 'Deliveries',
      ChangeOrder: 'ChangeOrders',
      DrawingSet: 'Drawings',
      Submittal: 'Submittals'
    };
    const page = routes[blocker.entity];
    return page ? createPageUrl(page) + `?project=${projectId}` : null;
  };

  return (
    <Card className="border-[rgba(255,157,66,0.2)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#FF9D42]" />
            Project Pulse
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Top Blockers */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">
            Top Blockers ({pulse.blockers.length} total)
          </h4>
          {pulse.blockers.slice(0, 5).length === 0 ? (
            <div className="text-center py-6 text-green-400 bg-green-500/5 rounded-lg border border-green-500/20">
              ✓ No critical blockers detected
            </div>
          ) : (
            <div className="space-y-2">
              {pulse.blockers.slice(0, 5).map((blocker, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,157,66,0.2)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={severityColors[blocker.severity]}>
                          {blocker.severity}
                        </Badge>
                        <span className="text-xs text-[#6B7280]">{blocker.days_open}d open</span>
                      </div>
                      <p className="text-sm font-medium text-white mb-1">{blocker.title}</p>
                      <p className="text-xs text-[#9CA3AF]">{blocker.reason}</p>
                      {blocker.recommended_action && (
                        <p className="text-xs text-blue-400 mt-2">→ {blocker.recommended_action}</p>
                      )}
                    </div>
                    {getEntityLink(blocker) && (
                      <Link to={getEntityLink(blocker)}>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aging Chart */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Aging Analysis</h4>
          <div className="bg-[#0A0A0A] rounded-lg p-4 border border-[rgba(255,255,255,0.05)]">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agingData}>
                <XAxis dataKey="name" stroke="#6B7280" style={{ fontSize: 12 }} />
                <YAxis stroke="#6B7280" style={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E5E7EB'
                  }}
                />
                <Bar dataKey="0-7d" stackId="a" fill="#10B981" />
                <Bar dataKey="8-14d" stackId="a" fill="#F59E0B" />
                <Bar dataKey="15+d" stackId="a" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Brief */}
        {latestInsight && (
          <div>
            <button
              onClick={() => setShowBrief(!showBrief)}
              className="w-full flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,157,66,0.2)] transition-colors"
            >
              <span className="text-sm font-semibold text-white">AI Executive Brief</span>
              {showBrief ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showBrief && (
              <div className="mt-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg space-y-3">
                <p className="text-sm text-[#E5E7EB] leading-relaxed">{latestInsight.summary}</p>
                
                {latestInsight.key_findings?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">
                      Key Findings
                    </p>
                    <ul className="space-y-1">
                      {latestInsight.key_findings.map((finding, idx) => (
                        <li key={idx} className="text-xs text-[#9CA3AF] flex items-start gap-2">
                          <span className="text-[#FF9D42]">•</span>
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {latestInsight.recommendations?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">
                      Recommendations
                    </p>
                    <ul className="space-y-1">
                      {latestInsight.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-xs text-blue-400 flex items-start gap-2">
                          <span>→</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <p className="text-[10px] text-[#6B7280] pt-2 border-t border-[rgba(255,255,255,0.05)]">
                  Generated {new Date(latestInsight.generated_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}