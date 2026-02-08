import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { AlertTriangle, TrendingUp, Search, Sparkles, Brain, Shield } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function AIInsightsPanel({ projectId }) {
  const [loading, setLoading] = useState(false);
  const [nlQuery, setNlQuery] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const [riskScore, setRiskScore] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [delayPredictions, setDelayPredictions] = useState(null);

  const analyzeRisk = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.functions.invoke('calculateProjectRiskScore', { project_id: projectId });
      setRiskScore(data);
      toast.success('Risk analysis complete');
    } catch (error) {
      toast.error('Risk analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const detectAnomalies = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.functions.invoke('detectAnomalies', { project_id: projectId });
      setAnomalies(data);
      toast.success('Anomaly detection complete');
    } catch (error) {
      toast.error('Anomaly detection failed');
    } finally {
      setLoading(false);
    }
  };

  const predictDelays = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.functions.invoke('predictScheduleDelays', { project_id: projectId });
      setDelayPredictions(data);
      toast.success('Delay prediction complete');
    } catch (error) {
      toast.error('Delay prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleNLQuery = async (e) => {
    e.preventDefault();
    if (!nlQuery.trim()) return;
    
    setLoading(true);
    try {
      const { data } = await apiClient.functions.invoke('nlQueryProjects', { query: nlQuery });
      setQueryResults(data);
    } catch (error) {
      toast.error('Query failed');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 75) return 'text-red-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-4">
      {/* Natural Language Query */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search size={16} />
            Ask AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNLQuery} className="space-y-3">
            <Input
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              placeholder="e.g., Show overdue tasks for fabrication phase"
              className="bg-secondary"
            />
            <Button type="submit" disabled={loading} className="w-full">
              <Sparkles size={16} className="mr-2" />
              Search
            </Button>
          </form>

          {queryResults && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">{queryResults.interpretation}</p>
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-sm font-medium mb-2">Summary:</p>
                <p className="text-sm">{queryResults.summary}</p>
              </div>
              {queryResults.results?.tasks?.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2">Matching Tasks:</p>
                  <div className="space-y-1">
                    {queryResults.results.tasks.slice(0, 5).map((task, i) => (
                      <div key={i} className="text-xs p-2 bg-secondary rounded">
                        {task.name} - {task.relevance_note}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Actions */}
      <div className="grid grid-cols-1 gap-3">
        <Button variant="outline" onClick={analyzeRisk} disabled={loading}>
          <Shield size={16} className="mr-2" />
          Calculate Risk Score
        </Button>
        <Button variant="outline" onClick={detectAnomalies} disabled={loading}>
          <AlertTriangle size={16} className="mr-2" />
          Detect Anomalies
        </Button>
        <Button variant="outline" onClick={predictDelays} disabled={loading}>
          <TrendingUp size={16} className="mr-2" />
          Predict Delays
        </Button>
      </div>

      {/* Risk Score */}
      {riskScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Shield size={16} />
                Risk Analysis
              </span>
              <span className={`text-3xl font-bold ${getRiskColor(riskScore.overall_risk_score)}`}>
                {riskScore.overall_risk_score}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge className="capitalize">{riskScore.risk_level} Risk</Badge>
            {riskScore.top_concerns?.map((concern, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle size={14} className="mt-0.5 text-amber-500 flex-shrink-0" />
                <span>{concern}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-3">{riskScore.recommendation}</p>
          </CardContent>
        </Card>
      )}

      {/* Anomalies */}
      {anomalies && anomalies.anomalies?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle size={16} />
              Anomalies Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {anomalies.anomalies.map((anomaly, i) => (
              <div key={i} className="p-3 bg-secondary rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <Badge className={
                    anomaly.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                    anomaly.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }>
                    {anomaly.severity}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{anomaly.type}</span>
                </div>
                <p className="text-sm">{anomaly.description}</p>
                {anomaly.threshold_exceeded && (
                  <p className="text-xs text-muted-foreground mt-1">Threshold: {anomaly.threshold_exceeded}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Delay Predictions */}
      {delayPredictions && delayPredictions.high_risk_tasks?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp size={16} />
              Delay Predictions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {delayPredictions.high_risk_tasks.map((task, i) => (
              <div key={i} className="p-3 bg-secondary rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium">{task.task_name}</span>
                  <Badge>{task.delay_probability}% risk</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Est. delay: {task.estimated_delay_days}d</p>
                <p className="text-xs">{task.reason}</p>
              </div>
            ))}
            {delayPredictions.mitigation_actions?.length > 0 && (
              <div className="mt-3 p-3 bg-amber-500/10 rounded-lg">
                <p className="text-xs font-medium mb-2">Recommended Actions:</p>
                <ul className="space-y-1">
                  {delayPredictions.mitigation_actions.map((action, i) => (
                    <li key={i} className="text-xs">• {action}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}