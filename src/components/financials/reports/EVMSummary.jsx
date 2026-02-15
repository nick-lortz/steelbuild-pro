import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, AlertCircle, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const formatCurrency = (value) => {
  if (value == null) return '$0.00';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  return value < 0 ? `( $${formatted} )` : `$${formatted}`;
};

export default function EVMSummary({ 
  earnedValue, 
  actualCost, 
  plannedValue = null,
  totalContract,
  onExport 
}) {
  const sv = plannedValue !== null ? earnedValue - plannedValue : null;
  const cv = earnedValue - actualCost;
  const spi = plannedValue > 0 ? earnedValue / plannedValue : null;
  const cpi = actualCost > 0 ? earnedValue / actualCost : 0;

  const metrics = [
    { 
      label: 'EV (Earned Value)', 
      value: formatCurrency(earnedValue), 
      color: 'text-blue-400',
      description: 'Value of work completed'
    },
    { 
      label: 'AC (Actual Cost)', 
      value: formatCurrency(actualCost), 
      color: 'text-amber-400',
      description: 'Cost incurred to date'
    },
    ...(plannedValue !== null ? [{
      label: 'PV (Planned Value)', 
      value: formatCurrency(plannedValue), 
      color: 'text-purple-400',
      description: 'Planned value from baseline'
    }] : []),
    { 
      label: 'CV (Cost Variance)', 
      value: formatCurrency(cv), 
      color: cv >= 0 ? 'text-green-400' : 'text-red-400',
      trend: cv >= 0,
      description: 'EV - AC (positive = under budget)'
    },
    ...(sv !== null ? [{
      label: 'SV (Schedule Variance)', 
      value: formatCurrency(sv), 
      color: sv >= 0 ? 'text-green-400' : 'text-red-400',
      trend: sv >= 0,
      description: 'EV - PV (positive = ahead of schedule)'
    }] : []),
    { 
      label: 'CPI (Cost Performance)', 
      value: cpi.toFixed(3), 
      color: cpi >= 1 ? 'text-green-400' : cpi >= 0.9 ? 'text-amber-400' : 'text-red-400',
      description: 'EV / AC (>1.0 = efficient, <1.0 = over budget)'
    },
    ...(spi !== null ? [{
      label: 'SPI (Schedule Performance)', 
      value: spi.toFixed(3), 
      color: spi >= 1 ? 'text-green-400' : spi >= 0.9 ? 'text-amber-400' : 'text-red-400',
      description: 'EV / PV (>1.0 = ahead, <1.0 = behind)'
    }] : [])
  ];

  const chartData = useMemo(() => {
    // Generate cumulative data points
    const points = [];
    const months = 6;
    for (let i = 0; i <= months; i++) {
      const progress = i / months;
      points.push({
        month: `M${i}`,
        EV: earnedValue * progress,
        AC: actualCost * progress,
        ...(plannedValue !== null ? { PV: plannedValue * progress } : {})
      });
    }
    return points;
  }, [earnedValue, actualCost, plannedValue]);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Earned Value Management (EVM) Summary</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={onExport}
            className="border-zinc-700 text-xs"
          >
            <Download size={12} className="mr-1" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {metrics.map((metric, idx) => (
            <div key={idx} className="p-4 bg-zinc-950 border border-zinc-800 rounded">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  {metric.label}
                </p>
                {metric.trend !== undefined && (
                  metric.trend ? 
                    <TrendingUp size={14} className="text-green-400" /> : 
                    <TrendingDown size={14} className="text-red-400" />
                )}
              </div>
              <p className={`text-2xl font-bold mb-1 ${metric.color}`}>
                {metric.value}
              </p>
              <p className="text-[10px] text-zinc-600">{metric.description}</p>
            </div>
          ))}
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded border-2 ${
            cpi >= 1 ? 'bg-green-500/5 border-green-500/30' : 
            cpi >= 0.9 ? 'bg-amber-500/5 border-amber-500/30' : 
            'bg-red-500/5 border-red-500/30'
          }`}>
            <p className="text-xs text-zinc-400 mb-2">Cost Performance Status</p>
            <div className="flex items-center gap-2">
              <Badge className={
                cpi >= 1 ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                cpi >= 0.9 ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' :
                'bg-red-500/20 text-red-400 border-red-500/50'
              }>
                CPI: {cpi.toFixed(3)}
              </Badge>
              <span className={`text-sm ${
                cpi >= 1 ? 'text-green-400' :
                cpi >= 0.9 ? 'text-amber-400' :
                'text-red-400'
              }`}>
                {cpi >= 1 ? 'Under Budget' : cpi >= 0.9 ? 'Near Budget' : 'Over Budget'}
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-2">
              {cpi >= 1 
                ? `Earning $${cpi.toFixed(2)} per $1 spent` 
                : `Only earning $${cpi.toFixed(2)} per $1 spent`}
            </p>
          </div>

          {spi !== null && (
            <div className={`p-4 rounded border-2 ${
              spi >= 1 ? 'bg-green-500/5 border-green-500/30' : 
              spi >= 0.9 ? 'bg-amber-500/5 border-amber-500/30' : 
              'bg-red-500/5 border-red-500/30'
            }`}>
              <p className="text-xs text-zinc-400 mb-2">Schedule Performance Status</p>
              <div className="flex items-center gap-2">
                <Badge className={
                  spi >= 1 ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                  spi >= 0.9 ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' :
                  'bg-red-500/20 text-red-400 border-red-500/50'
                }>
                  SPI: {spi.toFixed(3)}
                </Badge>
                <span className={`text-sm ${
                  spi >= 1 ? 'text-green-400' :
                  spi >= 0.9 ? 'text-amber-400' :
                  'text-red-400'
                }`}>
                  {spi >= 1 ? 'Ahead of Schedule' : spi >= 0.9 ? 'Near Schedule' : 'Behind Schedule'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* EVM Trend Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#71717a" style={{ fontSize: 11 }} />
              <YAxis stroke="#71717a" style={{ fontSize: 11 }} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                formatter={(val) => formatCurrency(val)}
              />
              <Legend />
              <Area type="monotone" dataKey="EV" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Earned Value" />
              <Area type="monotone" dataKey="AC" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} name="Actual Cost" />
              {plannedValue !== null && (
                <Area type="monotone" dataKey="PV" stroke="#a855f7" fill="#a855f7" fillOpacity={0.1} name="Planned Value" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}