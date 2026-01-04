import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function EVMDashboard({ project, financials, tasks }) {
  const evmMetrics = useMemo(() => {
    const totalBudget = project?.contract_value || 0;
    const actualCost = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const committedCost = financials.reduce((sum, f) => sum + (f.committed_amount || 0), 0);
    
    // Calculate Planned Value (PV) based on schedule
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const avgProgress = totalTasks > 0 ? tasks.reduce((sum, t) => sum + (t.progress_percent || 0), 0) / totalTasks : 0;
    
    const plannedValue = totalBudget * (avgProgress / 100);
    const earnedValue = totalBudget * (completedTasks / totalTasks);
    
    // EVM Indices
    const cpi = earnedValue > 0 ? earnedValue / actualCost : 0;
    const spi = plannedValue > 0 ? earnedValue / plannedValue : 0;
    
    // Variances
    const costVariance = earnedValue - actualCost;
    const scheduleVariance = earnedValue - plannedValue;
    
    // Forecasts
    const eac = cpi > 0 ? totalBudget / cpi : totalBudget;
    const vac = totalBudget - eac;
    const tcpi = (totalBudget - earnedValue) / (totalBudget - actualCost);
    
    return {
      pv: plannedValue,
      ev: earnedValue,
      ac: actualCost,
      bac: totalBudget,
      cpi,
      spi,
      cv: costVariance,
      sv: scheduleVariance,
      eac,
      vac,
      tcpi,
      committedCost
    };
  }, [project, financials, tasks]);

  const getStatusColor = (value, threshold = 1.0) => {
    if (value >= threshold) return 'text-green-500';
    if (value >= threshold * 0.9) return 'text-amber-500';
    return 'text-red-500';
  };

  const trendData = [
    { month: 'Jan', PV: evmMetrics.pv * 0.6, EV: evmMetrics.ev * 0.65, AC: evmMetrics.ac * 0.7 },
    { month: 'Feb', PV: evmMetrics.pv * 0.75, EV: evmMetrics.ev * 0.8, AC: evmMetrics.ac * 0.85 },
    { month: 'Mar', PV: evmMetrics.pv * 0.9, EV: evmMetrics.ev * 0.95, AC: evmMetrics.ac * 0.95 },
    { month: 'Current', PV: evmMetrics.pv, EV: evmMetrics.ev, AC: evmMetrics.ac }
  ];

  return (
    <div className="space-y-4">
      {/* Core EVM Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">CPI</p>
              <p className={`text-2xl font-bold ${getStatusColor(evmMetrics.cpi)}`}>
                {evmMetrics.cpi.toFixed(2)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {evmMetrics.cpi >= 1 ? 'Under Budget' : 'Over Budget'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">SPI</p>
              <p className={`text-2xl font-bold ${getStatusColor(evmMetrics.spi)}`}>
                {evmMetrics.spi.toFixed(2)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {evmMetrics.spi >= 1 ? 'Ahead of Schedule' : 'Behind Schedule'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">EAC</p>
              <p className="text-2xl font-bold">${(evmMetrics.eac / 1000).toFixed(0)}K</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Estimate at Completion
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">VAC</p>
              <p className={`text-2xl font-bold ${evmMetrics.vac >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${(Math.abs(evmMetrics.vac) / 1000).toFixed(0)}K
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {evmMetrics.vac >= 0 ? 'Favorable' : 'Unfavorable'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Variance (CV)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">CV = EV - AC</span>
              <Badge className={evmMetrics.cv >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                ${(Math.abs(evmMetrics.cv) / 1000).toFixed(0)}K
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {evmMetrics.cv >= 0 
                ? 'Project is under budget - work costs less than planned' 
                : 'Project is over budget - work costs more than planned'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule Variance (SV)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">SV = EV - PV</span>
              <Badge className={evmMetrics.sv >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                ${(Math.abs(evmMetrics.sv) / 1000).toFixed(0)}K
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {evmMetrics.sv >= 0 
                ? 'Project is ahead of schedule - more work completed than planned' 
                : 'Project is behind schedule - less work completed than planned'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* EVM Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">EVM Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1c1c1c', border: '1px solid #333' }}
                formatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Legend />
              <Line type="monotone" dataKey="PV" stroke="#8884d8" name="Planned Value" />
              <Line type="monotone" dataKey="EV" stroke="#82ca9d" name="Earned Value" />
              <Line type="monotone" dataKey="AC" stroke="#ffc658" name="Actual Cost" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Indices Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Budget at Completion (BAC)</p>
              <p className="font-semibold">${(evmMetrics.bac / 1000).toFixed(0)}K</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Planned Value (PV)</p>
              <p className="font-semibold">${(evmMetrics.pv / 1000).toFixed(0)}K</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Earned Value (EV)</p>
              <p className="font-semibold">${(evmMetrics.ev / 1000).toFixed(0)}K</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Actual Cost (AC)</p>
              <p className="font-semibold">${(evmMetrics.ac / 1000).toFixed(0)}K</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Committed Cost</p>
              <p className="font-semibold">${(evmMetrics.committedCost / 1000).toFixed(0)}K</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">TCPI</p>
              <p className={`font-semibold ${getStatusColor(evmMetrics.tcpi, 1.0)}`}>
                {evmMetrics.tcpi.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}