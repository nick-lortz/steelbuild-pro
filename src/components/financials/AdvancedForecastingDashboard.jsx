import React, { useState } from 'react';
import { apiClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { Sparkles, TrendingDown, TrendingUp, AlertTriangle, Target, Zap } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function AdvancedForecastingDashboard({ projectId }) {
  const [forecasting, setForecasting] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState('realistic');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiClient.entities.Project.filter({ id: projectId }).then(p => p[0]),
    enabled: !!projectId
  });

  const runForecast = async () => {
    setForecasting(true);
    try {
      const response = await apiClient.functions.invoke('advancedFinancialForecasting', {
        project_id: projectId,
        include_market_trends: true
      });
      setForecast(response.data);
      toast.success('Advanced forecast complete');
    } catch (error) {
      toast.error('Forecast failed: ' + error.message);
    } finally {
      setForecasting(false);
    }
  };

  if (!forecast) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" />
              Advanced Financial Forecasting
            </CardTitle>
            <Button
              onClick={runForecast}
              disabled={forecasting || !projectId}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {forecasting ? 'Analyzing...' : 'Generate Forecast'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-zinc-500">
            <Sparkles size={40} className="mx-auto mb-3 text-zinc-700" />
            <p className="text-sm">AI-powered multi-scenario cost forecast with market trends and variance analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const scenarios = forecast.forecast?.scenarios || [];
  const selectedScenarioData = scenarios.find(s => s.scenario === selectedScenario);
  const categoryForecasts = forecast.forecast?.category_forecasts || [];
  const historicalTrend = forecast.historical_trend || [];

  const scenarioColors = {
    optimistic: '#10b981',
    realistic: '#f59e0b',
    pessimistic: '#ef4444'
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400 uppercase mb-2">Current Budget</p>
            <p className="text-2xl font-bold text-white">
              ${(forecast.current_state.total_budget / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-zinc-500 mt-1">Total allocated</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400 uppercase mb-2">Actual to Date</p>
            <p className="text-2xl font-bold text-blue-400">
              ${(forecast.current_state.actual_cost / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {forecast.current_state.cost_complete_pct}% spent
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400 uppercase mb-2">Committed</p>
            <p className="text-2xl font-bold text-purple-400">
              ${(forecast.current_state.committed / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-zinc-500 mt-1">POs & contracts</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400 uppercase mb-2">Remaining</p>
            <p className="text-2xl font-bold text-amber-400">
              ${(forecast.current_state.remaining_unspent / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-zinc-500 mt-1">Unspent budget</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400 uppercase mb-2">Work Complete</p>
            <p className="text-2xl font-bold text-green-400">
              {forecast.current_state.work_complete_pct}%
            </p>
            <p className="text-xs text-zinc-500 mt-1">Progress pacing</p>
          </CardContent>
        </Card>
      </div>

      {/* Scenario Analysis */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target size={20} className="text-amber-500" />
            Multi-Scenario Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {scenarios.map(scenario => (
              <div
                key={scenario.scenario}
                onClick={() => setSelectedScenario(scenario.scenario)}
                className={`p-4 rounded border-2 cursor-pointer transition-all ${
                  selectedScenario === scenario.scenario
                    ? 'border-amber-500 bg-zinc-950'
                    : 'border-zinc-700 bg-zinc-950/50 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold uppercase text-white capitalize">
                    {scenario.scenario}
                  </p>
                  <Badge className="text-xs">{scenario.probability_pct}% likely</Badge>
                </div>
                <p className="text-xl font-bold text-white mb-1">
                  ${(scenario.final_cost / 1000000).toFixed(1)}M
                </p>
                <p className={`text-sm ${scenario.variance_from_budget >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {scenario.variance_from_budget >= 0 ? '+' : ''}
                  ${(scenario.variance_from_budget / 1000000).toFixed(1)}M ({scenario.variance_pct.toFixed(1)}%)
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Trend Chart */}
      {historicalTrend.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-500" />
              Historical Burn Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={historicalTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="month" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                <Legend />
                <Bar dataKey="amount" fill="#f59e0b" name="Monthly Expense" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Category Variances */}
      {forecast.category_variances && forecast.category_variances.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap size={20} className="text-purple-500" />
              Cost Driver Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {forecast.category_variances.map((cv, idx) => (
                <div key={idx} className="bg-zinc-950 p-3 rounded border border-zinc-800">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white capitalize">{cv.category}</p>
                      <p className="text-xs text-zinc-500">
                        Budget: ${(cv.budget / 1000000).toFixed(1)}M | Actual: ${(cv.actual / 1000000).toFixed(1)}M
                      </p>
                    </div>
                    <Badge className={cv.variance_pct > 0 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                      {cv.variance_pct > 0 ? '+' : ''}{cv.variance_pct.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="w-full bg-zinc-900 rounded h-2">
                    <div
                      className={`h-2 rounded ${cv.variance_pct > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(Math.abs(cv.spend_rate), 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{cv.spend_rate.toFixed(0)}% of budget spent</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Forecasts Table */}
      {categoryForecasts.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Category Forecast-at-Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-800">
                  <tr className="text-zinc-400 uppercase text-xs">
                    <th className="text-left p-3">Category</th>
                    <th className="text-right p-3">Budget</th>
                    <th className="text-right p-3">Actual</th>
                    <th className="text-right p-3">ETC</th>
                    <th className="text-right p-3">EAC</th>
                    <th className="text-right p-3">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryForecasts.map((cf, idx) => (
                    <tr key={idx} className="border-t border-zinc-800 hover:bg-zinc-950/50">
                      <td className="p-3 text-white capitalize">{cf.category}</td>
                      <td className="p-3 text-right text-zinc-300">${(cf.budget / 1000000).toFixed(1)}M</td>
                      <td className="p-3 text-right text-blue-400">${(cf.actual_to_date / 1000000).toFixed(1)}M</td>
                      <td className="p-3 text-right text-amber-400">${(cf.etc / 1000000).toFixed(1)}M</td>
                      <td className="p-3 text-right font-bold text-white">${(cf.eac / 1000000).toFixed(1)}M</td>
                      <td className={`p-3 text-right font-bold ${cf.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {cf.variance >= 0 ? '+' : ''}${(cf.variance / 1000000).toFixed(1)}M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Assessment */}
      {forecast.forecast?.key_risks && forecast.forecast.key_risks.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-500" />
              Key Risks & Mitigations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {forecast.forecast.key_risks.map((risk, idx) => (
                <div key={idx} className="bg-red-950/20 border border-red-500/30 p-3 rounded">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-300">{risk.risk}</p>
                      <p className="text-xs text-zinc-400 mt-1">Impact: ${(risk.impact_usd / 1000000).toFixed(1)}M</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-300 pl-6">Mitigation: {risk.mitigation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Burn Rate Analysis */}
      {forecast.forecast?.burn_rate_analysis && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Burn Rate & Acceleration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                <p className="text-xs text-zinc-400 uppercase mb-2">Current Monthly Burn</p>
                <p className="text-xl font-bold text-white">
                  ${(forecast.forecast.burn_rate_analysis.current_monthly_burn / 1000000).toFixed(2)}M
                </p>
              </div>
              <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                <p className="text-xs text-zinc-400 uppercase mb-2">Projected End-State Burn</p>
                <p className="text-xl font-bold text-white">
                  ${(forecast.forecast.burn_rate_analysis.projected_monthly_burn_end / 1000000).toFixed(2)}M
                </p>
              </div>
              <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                <p className="text-xs text-zinc-400 uppercase mb-2">Trend</p>
                <div className="flex items-center gap-2">
                  {forecast.forecast.burn_rate_analysis.acceleration_deceleration === 'accelerating' 
                    ? <TrendingUp className="text-red-500" size={20} />
                    : <TrendingDown className="text-green-500" size={20} />
                  }
                  <p className="text-sm font-bold text-white capitalize">
                    {forecast.forecast.burn_rate_analysis.acceleration_deceleration}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Actions */}
      {forecast.forecast?.recommended_actions && forecast.forecast.recommended_actions.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {forecast.forecast.recommended_actions.map((action, idx) => (
                <li key={idx} className="text-sm text-zinc-300 flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Confidence */}
      {forecast.forecast?.confidence && (
        <Alert className={`${
          forecast.forecast.confidence === 'high' 
            ? 'bg-green-950/20 border-green-500/30' 
            : forecast.forecast.confidence === 'medium'
            ? 'bg-amber-950/20 border-amber-500/30'
            : 'bg-red-950/20 border-red-500/30'
        }`}>
          <AlertDescription className="text-xs">
            <p className={`font-bold ${
              forecast.forecast.confidence === 'high' 
                ? 'text-green-400' 
                : forecast.forecast.confidence === 'medium'
                ? 'text-amber-400'
                : 'text-red-400'
            }`}>
              Confidence: {forecast.forecast.confidence.toUpperCase()}
            </p>
            <p className="text-zinc-300 mt-1">{forecast.forecast.confidence_reason}</p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}