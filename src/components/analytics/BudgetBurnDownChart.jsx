import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { CHART, rechartsProps, CustomTooltip, CustomLegend, SBPChartGradients } from '@/components/shared/chartTheme';

export default function BudgetBurnDownChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Budget Burn-Down Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">No budget data available for selected filters.</p>
        </CardContent>
      </Card>
    );
  }

  const last = data[data.length - 1] || {};
  const variance = last.variance || 0;

  return (
    <Card className="bg-[#14181E] border border-[rgba(255,255,255,0.06)] rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-[0.875rem] font-bold text-[rgba(255,255,255,0.88)]">Budget Burn-Down Analysis</CardTitle>
        <p className="text-[0.65rem] text-[rgba(255,255,255,0.35)] mt-0.5">Planned vs. actual spending over time</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <SBPChartGradients />
            <CartesianGrid {...rechartsProps.cartesianGrid} />
            <XAxis dataKey="date" {...rechartsProps.xAxis} />
            <YAxis {...rechartsProps.yAxis} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip formatter={v => `$${v.toLocaleString()}`} />} />
            <Legend content={<CustomLegend />} />
            <Area type="monotone" dataKey="planned_cumulative" name="Planned Budget"
              stroke={CHART.semantic.planned} fill="url(#sbp-grad-blue)" strokeWidth={2}
              dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area type="monotone" dataKey="actual_cumulative" name="Actual Spend"
              stroke={CHART.semantic.actual} fill="url(#sbp-grad-orange)" strokeWidth={2}
              dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Line type="monotone" dataKey="forecast" name="Forecast"
              stroke={CHART.semantic.forecast} strokeDasharray="4 3" strokeWidth={2}
              dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 gap-0 mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
          {[
            { label: 'Total Budget',   value: `$${(last.total_budget||0).toLocaleString()}`,           color: 'rgba(255,255,255,0.88)' },
            { label: 'Spent to Date',  value: `$${(last.actual_cumulative||0).toLocaleString()}`,      color: CHART.semantic.actual },
            { label: 'Variance',       value: `${variance > 0 ? '+' : ''}$${Math.abs(variance).toLocaleString()}`, color: variance > 0 ? CHART.semantic.variance : CHART.semantic.complete },
          ].map((kpi, i) => (
            <div key={i} className="px-3 first:pl-0">
              <p className="text-[0.6rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,255,255,0.35)]">{kpi.label}</p>
              <p className="text-[1.125rem] font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}