import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

const formatCurrency = (value) => {
  if (value == null) return '$0.00';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  return value < 0 ? `( $${formatted} )` : `$${formatted}`;
};

const formatPercent = (value) => {
  if (value == null) return '0.0%';
  return `${value.toFixed(1)}%`;
};

export default function FinancialKPIStrip({ 
  totalContract,
  earnedValue,
  actualCost,
  billed,
  etc,
  denominator,
  denominatorMode 
}) {
  const cv = earnedValue - actualCost;
  const readyToBill = Math.max(0, earnedValue - billed);
  const eac = actualCost + etc;
  const projectedProfit = totalContract - eac;
  const marginPercent = totalContract > 0 ? (projectedProfit / totalContract) * 100 : 0;
  const percentEarned = denominator > 0 ? (earnedValue / denominator) * 100 : 0;
  const percentBilled = denominator > 0 ? (billed / denominator) * 100 : 0;
  const cpi = actualCost > 0 ? earnedValue / actualCost : 0;

  const getCPIColor = (cpi) => {
    if (cpi < 0.90) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (cpi <= 1.00) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-green-400 bg-green-500/10 border-green-500/30';
  };

  const kpis = [
    { label: 'Total Contract', value: formatCurrency(totalContract), subtext: denominatorMode === 'base' ? 'Base' : 'w/ Approved COs' },
    { label: 'Earned Value', value: formatCurrency(earnedValue), subtext: `${formatPercent(percentEarned)} Earned` },
    { label: 'Actual Cost', value: formatCurrency(actualCost), subtext: 'To Date' },
    { label: 'Cost Variance', value: formatCurrency(cv), subtext: cv >= 0 ? 'Under' : 'Over', trend: cv >= 0 },
    { label: '% Earned', value: formatPercent(percentEarned), subtext: `of ${denominatorMode === 'base' ? 'Base' : 'Total'}` },
    { label: '% Billed', value: formatPercent(percentBilled), subtext: formatCurrency(billed) },
    { label: 'Ready to Bill', value: formatCurrency(readyToBill), subtext: 'Unbilled EV' },
    { label: 'EAC', value: formatCurrency(eac), subtext: `AC + ETC (${formatCurrency(etc)})` },
    { label: 'Projected Profit', value: formatCurrency(projectedProfit), subtext: `${formatPercent(marginPercent)} Margin`, trend: projectedProfit >= 0 },
    { label: 'CPI', value: cpi.toFixed(2), subtext: cpi >= 1 ? 'Good' : 'At Risk', colorClass: getCPIColor(cpi) }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-3">
      {kpis.map((kpi, idx) => (
        <Card key={idx} className={`bg-zinc-900 border-zinc-800 ${kpi.colorClass || ''}`}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-1">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                {kpi.label}
              </p>
              {kpi.trend !== undefined && (
                kpi.trend ? <TrendingUp size={12} className="text-green-400" /> : <TrendingDown size={12} className="text-red-400" />
              )}
            </div>
            <p className="text-lg font-bold text-white mb-0.5">{kpi.value}</p>
            <p className="text-[10px] text-zinc-500">{kpi.subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}