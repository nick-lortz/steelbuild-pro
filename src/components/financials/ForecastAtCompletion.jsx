import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, AlertTriangle } from 'lucide-react';

export default function ForecastAtCompletion({ financials, projects, changeOrders, expenses = [] }) {
  const projectForecasts = projects.map(project => {
    const projectFinancials = financials.filter(f => f.project_id === project.id);
    const budget = projectFinancials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
    
    // Calculate actual from financial records PLUS paid/approved expenses
    let actualFromFinancials = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const actualFromExpenses = expenses
      .filter(e => e.project_id === project.id && (e.payment_status === 'paid' || e.payment_status === 'approved'))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const actual = actualFromFinancials + actualFromExpenses;
    
    const committed = projectFinancials.reduce((sum, f) => sum + (f.committed_amount || 0), 0);
    const forecast = projectFinancials.reduce((sum, f) => sum + (f.forecast_amount || 0), 0);
    
    // Add approved change orders
    const approvedCOs = changeOrders
      .filter(co => co.project_id === project.id && co.status === 'approved')
      .reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    
    const revisedBudget = budget + approvedCOs;
    
    // Forecast at completion = actual costs + remaining committed + forecast overruns
    const forecastAtCompletion = actual + committed + (forecast - actual);
    
    const variance = revisedBudget - forecastAtCompletion;
    const variancePercent = revisedBudget > 0 ? ((variance / revisedBudget) * 100) : 0;
    const costPerformanceIndex = actual > 0 ? (budget / forecastAtCompletion) : 1;
    
    return {
      project,
      budget,
      revisedBudget,
      actual,
      committed,
      forecastAtCompletion,
      variance,
      variancePercent,
      costPerformanceIndex,
      status: variance >= 0 ? 'on_track' : variancePercent > -10 ? 'at_risk' : 'over_budget'
    };
  }).filter(f => f.budget > 0);

  const totalForecast = projectForecasts.reduce((sum, p) => sum + p.forecastAtCompletion, 0);
  const totalBudget = projectForecasts.reduce((sum, p) => sum + p.revisedBudget, 0);
  const overallVariance = totalBudget - totalForecast;

  return (
    <div className="space-y-4">
      {/* Overall Summary */}
      <Card className={`border ${overallVariance >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Forecast at Completion</p>
              <p className="text-2xl font-bold text-white">${totalForecast.toLocaleString()}</p>
              <p className={`text-sm mt-1 ${overallVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {overallVariance >= 0 ? 'Under' : 'Over'} budget by ${Math.abs(overallVariance).toLocaleString()}
              </p>
            </div>
            <Target className={overallVariance >= 0 ? 'text-green-500' : 'text-red-500'} size={32} />
          </div>
        </CardContent>
      </Card>

      {/* Project Breakdown */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">Project Forecasts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {projectForecasts.map(forecast => (
              <div key={forecast.project.id} className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-white">{forecast.project.name}</p>
                    <p className="text-xs text-zinc-500">{forecast.project.project_number}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={
                      forecast.status === 'on_track' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : forecast.status === 'at_risk'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }
                  >
                    {forecast.status === 'on_track' ? 'On Track' : forecast.status === 'at_risk' ? 'At Risk' : 'Over Budget'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-zinc-500">Budget</p>
                    <p className="font-medium text-white">${forecast.revisedBudget.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Actual</p>
                    <p className="font-medium text-purple-400">${forecast.actual.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Forecast</p>
                    <p className="font-medium text-amber-400">${forecast.forecastAtCompletion.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Variance</p>
                    <p className={`font-medium ${forecast.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {forecast.variance >= 0 ? '+' : ''}${forecast.variance.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-zinc-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        forecast.status === 'on_track' ? 'bg-green-500' :
                        forecast.status === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((forecast.actual / forecast.revisedBudget) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {((forecast.actual / forecast.revisedBudget) * 100).toFixed(1)}% spent • CPI: {forecast.costPerformanceIndex.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}