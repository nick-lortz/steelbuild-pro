import React, { useState } from 'react';
import { useMutation } from 'react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function AIImpactAnalysis({ changeOrderData, projectId, onAnalysisComplete }) {
  const [analysis, setAnalysis] = useState(changeOrderData.ai_analysis || null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('analyzeChangeOrderImpact', {
        change_order_id: changeOrderData.id,
        project_id: projectId
      });
      return data.analysis;
    },
    onSuccess: (result) => {
      setAnalysis(result);
      onAnalysisComplete(result);
      toast.success('AI analysis complete');
    },
    onError: () => {
      toast.error('Analysis failed');
    }
  });

  if (analyzeMutation.isPending) {
    return (
      <Card className="bg-zinc-950 border-zinc-800">
        <CardContent className="p-12 text-center">
          <Loader2 size={48} className="mx-auto mb-4 animate-spin text-amber-500" />
          <p className="text-zinc-400">Analyzing impact...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="bg-zinc-950 border-zinc-800">
        <CardContent className="p-12 text-center">
          <Sparkles size={48} className="mx-auto mb-4 text-amber-500" />
          <p className="text-zinc-400 mb-4">Run AI analysis to predict cost and schedule impact</p>
          <Button
            onClick={() => analyzeMutation.mutate()}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            <Sparkles size={16} className="mr-2" />
            Analyze Impact
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-amber-500/10 to-zinc-950 border-amber-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              AI Impact Analysis
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => analyzeMutation.mutate()}
              className="border-zinc-700"
            >
              Re-analyze
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Predicted Impacts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-zinc-900/50 rounded">
              <p className="text-xs text-zinc-500 mb-1">Predicted Cost</p>
              <p className="text-xl font-bold text-amber-400">
                ${(analysis.predicted_cost_impact || 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">
                Confidence: {analysis.confidence_level || 'Medium'}
              </p>
            </div>
            <div className="p-3 bg-zinc-900/50 rounded">
              <p className="text-xs text-zinc-500 mb-1">Predicted Schedule</p>
              <p className="text-xl font-bold text-red-400">
                +{analysis.predicted_schedule_impact || 0} days
              </p>
            </div>
          </div>

          {/* Risk Factors */}
          {analysis.risk_factors?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-400 uppercase mb-2">Risk Factors</p>
              <div className="space-y-1">
                {analysis.risk_factors.map((risk, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
                    <AlertTriangle size={12} className="text-red-400 mt-0.5" />
                    <p className="text-xs text-zinc-300">{risk}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mitigation */}
          {analysis.mitigation_strategies?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-400 uppercase mb-2">Mitigation Strategies</p>
              <div className="space-y-1">
                {analysis.mitigation_strategies.map((strategy, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded">
                    <CheckCircle size={12} className="text-green-400 mt-0.5" />
                    <p className="text-xs text-zinc-300">{strategy}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          {analysis.approval_recommendation && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded">
              <p className="text-xs font-semibold text-blue-400 uppercase mb-2">Recommendation</p>
              <p className="text-sm text-zinc-300">{analysis.approval_recommendation}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}