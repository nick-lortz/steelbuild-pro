import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import { apiClient } from '@/api/client';
import { toast } from 'sonner';

export default function AIImpactAnalysis({ changeOrderData, projectId, onAnalysisComplete }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await apiClient.functions.invoke('analyzeChangeOrderImpact', {
        changeOrderData,
        projectId
      });

      if (response.data.success) {
        setAnalysis(response.data);
        if (onAnalysisComplete) {
          onAnalysisComplete(response.data.analysis);
        }
        toast.success('AI analysis complete');
      } else {
        throw new Error(response.data.error || 'Analysis failed');
      }
    } catch (error) {
      toast.error('Analysis failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getConfidenceBadge = (level) => {
    const colors = {
      high: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      low: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[level] || colors.medium;
  };

  const getRecommendationColor = (rec) => {
    if (rec.toLowerCase().includes('approve')) return 'text-green-400';
    if (rec.toLowerCase().includes('reject')) return 'text-red-400';
    return 'text-amber-400';
  };

  return (
    <div className="space-y-4">
      {!analysis ? (
        <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
          <CardContent className="p-6 text-center">
            <Sparkles className="mx-auto mb-4 text-purple-400" size={48} />
            <h3 className="text-lg font-semibold mb-2">AI-Powered Impact Analysis</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Predict cost and schedule impacts based on historical data and current project status
            </p>
            <Button
              onClick={runAnalysis}
              disabled={analyzing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {analyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles size={16} className="mr-2" />
                  Run AI Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Prediction Summary */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="text-purple-400" size={18} />
                  AI Impact Prediction
                </CardTitle>
                <Badge variant="outline" className={getConfidenceBadge(analysis.analysis.confidence_level)}>
                  {analysis.analysis.confidence_level} confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="text-green-400" size={18} />
                    <span className="text-sm text-zinc-400">Predicted Cost Impact</span>
                  </div>
                  <p className="text-2xl font-bold text-green-400">
                    ${analysis.analysis.predicted_cost_impact?.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Original estimate: ${changeOrderData.cost_impact?.toLocaleString()}
                  </p>
                </div>

                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="text-amber-400" size={18} />
                    <span className="text-sm text-zinc-400">Predicted Schedule Impact</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-400">
                    {analysis.analysis.predicted_schedule_impact} days
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Original estimate: {changeOrderData.schedule_impact_days} days
                  </p>
                </div>
              </div>

              {/* Recommendation */}
              <Alert className="bg-zinc-800/50 border-zinc-700">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <p className={`font-semibold mb-1 ${getRecommendationColor(analysis.analysis.approval_recommendation)}`}>
                    Recommendation: {analysis.analysis.approval_recommendation}
                  </p>
                  <p className="text-sm text-zinc-400">{analysis.analysis.reasoning}</p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Risk Factors */}
          {analysis.analysis.risk_factors?.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="text-red-400" size={16} />
                  Risk Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.analysis.risk_factors.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-red-400 mt-1">•</span>
                      <span className="text-zinc-300">{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Affected Areas */}
          {analysis.analysis.affected_areas?.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="text-blue-400" size={16} />
                  Affected Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.analysis.affected_areas.map((area, idx) => (
                    <Badge key={idx} variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                      {area}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mitigation Strategies */}
          {analysis.analysis.mitigation_strategies?.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Recommended Mitigation Strategies</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {analysis.analysis.mitigation_strategies.map((strategy, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-amber-400 font-semibold">{idx + 1}.</span>
                      <span className="text-zinc-300">{strategy}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Historical Context */}
          {analysis.analysis.similar_historical_cos?.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Similar Historical Change Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.analysis.similar_historical_cos.map((co, idx) => (
                    <div key={idx} className="p-3 bg-zinc-800/50 rounded">
                      <p className="font-medium text-white mb-1">{co.title}</p>
                      <div className="flex items-center gap-4 text-xs text-zinc-400">
                        <span>Cost: ${co.actual_cost?.toLocaleString()}</span>
                        <span>Schedule: {co.actual_schedule} days</span>
                        <span className="text-zinc-500">• {co.outcome}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={runAnalysis}
            variant="outline"
            size="sm"
            disabled={analyzing}
            className="w-full"
          >
            Re-run Analysis
          </Button>
        </>
      )}
    </div>
  );
}