import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/api/client';
import { toast } from '@/components/ui/notifications';

export default function AIForecastETC({ projectId }) {
  const [forecasting, setForecasting] = useState(false);
  const [forecast, setForecast] = useState(null);

  const runForecast = async () => {
    setForecasting(true);
    try {
      const response = await apiClient.functions.invoke('forecastETC', {
        project_id: projectId
      });

      setForecast(response.data);
      toast.success('AI forecast complete');
    } catch (error) {
      toast.error('Forecast failed');
    } finally {
      setForecasting(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={20} className="text-amber-500" />
            AI-Powered ETC Forecast
          </CardTitle>
          <Button 
            onClick={runForecast}
            disabled={forecasting || !projectId}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {forecasting ? 'Forecasting...' : 'Run Forecast'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!forecast ? (
          <div className="text-center py-8 text-zinc-500">
            <Sparkles size={40} className="mx-auto mb-3 text-zinc-700" />
            <p className="text-sm">Click "Run Forecast" to generate AI-powered cost predictions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase mb-1">Total Budget</p>
                <p className="text-xl font-bold text-white">
                  ${(forecast.summary.total_budget / 1000).toFixed(0)}k
                </p>
              </div>

              <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase mb-1">Actual</p>
                <p className="text-xl font-bold text-blue-500">
                  ${(forecast.summary.total_actual / 1000).toFixed(0)}k
                </p>
              </div>

              <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase mb-1">Forecast ETC</p>
                <p className="text-xl font-bold text-amber-500">
                  ${(forecast.summary.total_etc / 1000).toFixed(0)}k
                </p>
              </div>

              <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase mb-1">EAC</p>
                <p className={`text-xl font-bold ${forecast.summary.total_variance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  ${(forecast.summary.total_eac / 1000).toFixed(0)}k
                </p>
                <p className="text-xs text-zinc-500">
                  {forecast.summary.total_variance >= 0 ? '+' : ''}
                  ${(forecast.summary.total_variance / 1000).toFixed(0)}k var
                </p>
              </div>
            </div>

            {/* Forecast Details */}
            <div className="border border-zinc-800 rounded overflow-hidden">
              <table className="w-full">
                <thead className="bg-zinc-950">
                  <tr className="text-xs text-zinc-400 uppercase">
                    <th className="text-left p-3">Category</th>
                    <th className="text-right p-3">Budget</th>
                    <th className="text-right p-3">Actual</th>
                    <th className="text-right p-3">% Done</th>
                    <th className="text-right p-3">ETC</th>
                    <th className="text-right p-3">EAC</th>
                    <th className="text-right p-3">Variance</th>
                    <th className="text-center p-3">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.forecasts.map((f, idx) => {
                    const variance = f.current_budget - f.eac;
                    return (
                      <tr key={idx} className="border-t border-zinc-800 hover:bg-zinc-950/50">
                        <td className="p-3 text-sm text-white capitalize">{f.category}</td>
                        <td className="p-3 text-sm text-right text-zinc-300">
                          ${(f.current_budget / 1000).toFixed(0)}k
                        </td>
                        <td className="p-3 text-sm text-right text-blue-400">
                          ${(f.actual_cost / 1000).toFixed(0)}k
                        </td>
                        <td className="p-3 text-sm text-right text-zinc-400">
                          {f.work_complete_pct}%
                        </td>
                        <td className="p-3 text-sm text-right text-amber-400">
                          ${(f.etc / 1000).toFixed(0)}k
                        </td>
                        <td className="p-3 text-sm text-right font-medium text-white">
                          ${(f.eac / 1000).toFixed(0)}k
                        </td>
                        <td className={`p-3 text-sm text-right font-bold ${variance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {variance >= 0 ? '+' : ''}${(variance / 1000).toFixed(0)}k
                        </td>
                        <td className="p-3 text-center">
                          <Badge 
                            variant="outline"
                            className={
                              f.confidence === 'high' ? 'border-green-500 text-green-400' :
                              f.confidence === 'medium' ? 'border-amber-500 text-amber-400' :
                              'border-red-500 text-red-400'
                            }
                          >
                            {f.confidence}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Alerts */}
            {forecast.forecasts.some(f => f.variance_at_completion < 0) && (
              <div className="bg-red-950/20 border border-red-500/30 p-3 rounded flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm text-red-400 font-bold">Overrun Alert</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {forecast.forecasts.filter(f => f.variance_at_completion < 0).length} categories 
                    forecast to exceed budget. Review ETC estimates and adjust scope or budget.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}