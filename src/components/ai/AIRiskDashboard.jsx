import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/api/client';
import { Shield, AlertTriangle, Loader2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/notifications';

export default function AIRiskDashboard({ projectId }) {
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState(null);

  const analyzeRisks = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.functions.invoke('aiRiskAssessment', { project_id: projectId });
      if (data.success) {
        setAssessment(data);
        toast.success('Risk assessment complete');
      } else {
        toast.error('Assessment failed');
      }
    } catch (error) {
      toast.error('Failed to assess risks');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!assessment) {
    return (
      <Card className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/30">
        <CardContent className="p-6 text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <h3 className="text-lg font-bold text-white mb-2">AI Risk Assessment</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Analyze project risks, delays, and issues with proactive alerts
          </p>
          <Button 
            onClick={analyzeRisks} 
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Assess Risks
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { assessment: data, metrics } = assessment;
  
  const riskLevelColors = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500'
  };

  const severityColors = {
    low: 'text-green-400 border-green-500/30',
    medium: 'text-yellow-400 border-yellow-500/30',
    high: 'text-orange-400 border-orange-500/30',
    critical: 'text-red-400 border-red-500/30'
  };

  const criticalRisks = data.risks.filter(r => r.severity === 'critical' || r.severity === 'high');

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              AI Risk Assessment
            </CardTitle>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={analyzeRisks}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Risk Score */}
          <div className="flex items-center justify-between p-4 bg-zinc-950 rounded border border-zinc-800">
            <div>
              <div className="text-sm text-zinc-400">Overall Risk Score</div>
              <div className="text-2xl font-bold text-white">{data.risk_score}/100</div>
            </div>
            <Badge className={cn('text-sm', riskLevelColors[data.risk_level])}>
              {data.risk_level.toUpperCase()}
            </Badge>
          </div>

          {/* Summary */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
            <p className="text-sm text-zinc-300">{data.summary}</p>
          </div>

          {/* Red Flags */}
          {data.red_flags.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
              <div className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle size={14} />
                Red Flags
              </div>
              <ul className="space-y-1">
                {data.red_flags.map((flag, idx) => (
                  <li key={idx} className="text-xs text-zinc-300">• {flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Critical/High Risks */}
          {criticalRisks.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-white mb-2">Critical & High Severity Risks</h4>
              <div className="space-y-2">
                {criticalRisks.map((risk, idx) => (
                  <div key={idx} className={cn('p-3 rounded border', severityColors[risk.severity], 'bg-zinc-950')}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-bold text-white text-sm">{risk.title}</div>
                      <Badge className="ml-2 capitalize">{risk.severity}</Badge>
                    </div>
                    <div className="text-xs text-zinc-400 mb-2">{risk.description}</div>
                    <div className="text-xs text-zinc-500 mb-1">
                      <strong>Impact:</strong> {risk.impact}
                    </div>
                    <div className="text-xs text-zinc-500 mb-1">
                      <strong>Likelihood:</strong> {risk.likelihood}
                    </div>
                    <div className="text-xs text-green-400">
                      <strong>Mitigation:</strong> {risk.mitigation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {data.recommended_actions.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-white mb-2">Recommended Actions</h4>
              <div className="space-y-2">
                {data.recommended_actions.map((action, idx) => (
                  <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded">
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-bold text-white text-sm">{action.action}</div>
                      <Badge variant={action.priority === 'immediate' ? 'destructive' : 'default'}>
                        {action.priority}
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-400 mb-1">{action.rationale}</div>
                    {action.due_by && (
                      <div className="flex items-center gap-1 text-xs text-amber-400">
                        <Calendar size={10} />
                        Due: {action.due_by}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Forecast */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1">Schedule Outlook</div>
              <div className={cn('text-sm font-bold capitalize', 
                data.forecast.schedule_outlook === 'on_track' ? 'text-green-400' :
                data.forecast.schedule_outlook === 'at_risk' ? 'text-yellow-400' : 'text-red-400'
              )}>
                {data.forecast.schedule_outlook.replace('_', ' ')}
              </div>
            </div>
            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1">Cost Outlook</div>
              <div className={cn('text-sm font-bold capitalize',
                data.forecast.cost_outlook === 'under_budget' ? 'text-green-400' :
                data.forecast.cost_outlook === 'on_budget' ? 'text-blue-400' : 'text-red-400'
              )}>
                {data.forecast.cost_outlook.replace('_', ' ')}
              </div>
            </div>
          </div>

          <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Forecast Completion</div>
            <div className="text-sm font-bold text-white">{data.forecast.completion_date_estimate}</div>
            <div className="text-xs text-zinc-500 mt-1">Confidence: {data.forecast.confidence_level}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}