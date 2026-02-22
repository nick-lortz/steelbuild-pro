import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function MarginAtRiskWidget({ projectId }) {
  const { data: marginData, isLoading } = useQuery({
    queryKey: ['marginAtRisk', projectId],
    queryFn: async () => {
      const response = await base44.functions.invoke('computeMarginAtRisk', {
        projectId
      });
      return response.data;
    },
    enabled: !!projectId,
    refetchInterval: 300000 // 5-min refresh
  });

  if (isLoading) return <div className="text-gray-400 text-sm">Analyzing margin risk...</div>;
  if (!marginData) return null;

  const { high_risk_count, medium_risk_count, total_cost_at_risk, margin_analysis } = marginData;
  const highRiskWps = margin_analysis.filter(m => m.risk_severity === 'HIGH');
  const mediumRiskWps = margin_analysis.filter(m => m.risk_severity === 'MEDIUM');

  return (
    <div className="space-y-3">
      <Card className="bg-gradient-to-r from-orange-950 to-red-950 border-red-900/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              Margin at Risk
            </span>
            <TrendingDown className="w-5 h-5 text-red-400" />
          </CardTitle>
          <CardDescription>Coordination + Sequencing Risk Exposure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-2xl font-bold text-red-400">${parseFloat(total_cost_at_risk).toLocaleString()}</div>
              <div className="text-xs text-red-600">Cost at Risk</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">{high_risk_count}</div>
              <div className="text-xs text-orange-600">High Risk WPs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{medium_risk_count}</div>
              <div className="text-xs text-yellow-600">Medium Risk</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* High Risk WPs */}
      {highRiskWps.length > 0 && (
        <Card className="border-red-900/30 bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-red-400">🔴 Critical</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {highRiskWps.slice(0, 3).map((wp) => (
              <div key={wp.wp_id} className="border-l-2 border-red-700/50 pl-2 py-1">
                <div className="flex justify-between items-start mb-1">
                  <div className="text-xs font-semibold text-red-300">{wp.wpid}</div>
                  <Badge className="bg-red-900 text-red-200 text-xs">
                    ${parseFloat(wp.cost_at_risk).toLocaleString()}
                  </Badge>
                </div>
                <div className="text-xs text-red-500 line-clamp-2">
                  {wp.risk_reasons.join('; ')}
                </div>
                <Progress 
                  value={(parseFloat(wp.risk_factors_normalized.coordination) + 
                          parseFloat(wp.risk_factors_normalized.sequencing)) / 2 * 100} 
                  className="mt-1 h-1"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Medium Risk WPs */}
      {mediumRiskWps.length > 0 && (
        <Card className="border-amber-900/30 bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-amber-400">⚠️ Elevated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mediumRiskWps.slice(0, 2).map((wp) => (
              <div key={wp.wp_id} className="border-l-2 border-amber-700/50 pl-2 py-1">
                <div className="flex justify-between items-start mb-1">
                  <div className="text-xs font-semibold text-amber-300">{wp.wpid}</div>
                  <Badge className="bg-amber-900 text-amber-200 text-xs">
                    ${parseFloat(wp.cost_at_risk).toLocaleString()}
                  </Badge>
                </div>
                <div className="text-xs text-amber-600 line-clamp-1">
                  {wp.risk_reasons[0]}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}