import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';

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

export default function ExecutiveSummary({
  project,
  totalContract,
  baseContract,
  approvedChanges,
  earnedValue,
  actualCost,
  billed,
  etc,
  denominator,
  denominatorMode,
  costCoverage,
  onExportPDF,
  onExportCSV
}) {
  const eac = actualCost + etc;
  const projectedProfit = totalContract - eac;
  const marginPercent = totalContract > 0 ? (projectedProfit / totalContract) * 100 : 0;
  const cv = earnedValue - actualCost;
  const cpi = actualCost > 0 ? earnedValue / actualCost : 0;
  const percentEarned = denominator > 0 ? (earnedValue / denominator) * 100 : 0;
  const percentBilled = denominator > 0 ? (billed / denominator) * 100 : 0;
  const readyToBill = Math.max(0, earnedValue - billed);

  // Risk assessment
  const risks = [];
  if (cpi < 0.9) risks.push({ severity: 'high', text: `CPI ${cpi.toFixed(2)} - Over budget risk` });
  if (costCoverage < 95) risks.push({ severity: 'high', text: `${costCoverage.toFixed(0)}% cost coverage - Map costs` });
  if (marginPercent < 5) risks.push({ severity: 'medium', text: `${marginPercent.toFixed(1)}% margin - Thin profit` });
  if (cv < 0) risks.push({ severity: 'medium', text: `Negative CV ${formatCurrency(cv)}` });

  const status = risks.filter(r => r.severity === 'high').length > 0 ? 'At Risk' : 
                 risks.length > 0 ? 'Caution' : 'On Track';

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-white">Executive Summary</CardTitle>
            <Badge className={
              status === 'On Track' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
              status === 'Caution' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' :
              'bg-red-500/20 text-red-400 border-red-500/50'
            }>
              {status}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onExportPDF} className="border-zinc-700 text-xs">
              <Download size={12} className="mr-1" />
              PDF
            </Button>
            <Button size="sm" variant="outline" onClick={onExportCSV} className="border-zinc-700 text-xs">
              <Download size={12} className="mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Project Header */}
        <div className="pb-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white mb-1">
            {project?.project_number} - {project?.name}
          </h2>
          <p className="text-sm text-zinc-400">
            {project?.client} • {project?.location}
          </p>
        </div>

        {/* Financial Snapshot */}
        <div>
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Financial Snapshot</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded">
              <p className="text-[10px] text-zinc-500 uppercase mb-1">Contract Value</p>
              <p className="text-lg font-bold text-white">{formatCurrency(totalContract)}</p>
              <p className="text-[10px] text-zinc-600">
                {denominatorMode === 'base' ? 'Base' : `Base + ${formatCurrency(approvedChanges)} COs`}
              </p>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded">
              <p className="text-[10px] text-zinc-500 uppercase mb-1">Earned Value</p>
              <p className="text-lg font-bold text-blue-400">{formatCurrency(earnedValue)}</p>
              <p className="text-[10px] text-zinc-600">{formatPercent(percentEarned)} complete</p>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded">
              <p className="text-[10px] text-zinc-500 uppercase mb-1">Actual Cost</p>
              <p className="text-lg font-bold text-amber-400">{formatCurrency(actualCost)}</p>
              <p className="text-[10px] text-zinc-600">To date</p>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded">
              <p className="text-[10px] text-zinc-500 uppercase mb-1">Projected Profit</p>
              <p className={`text-lg font-bold ${projectedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(projectedProfit)}
              </p>
              <p className="text-[10px] text-zinc-600">{formatPercent(marginPercent)} margin</p>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div>
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Performance</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-4 rounded border-2 ${
              cpi >= 1 ? 'bg-green-500/5 border-green-500/30' :
              cpi >= 0.9 ? 'bg-amber-500/5 border-amber-500/30' :
              'bg-red-500/5 border-red-500/30'
            }`}>
              <p className="text-xs text-zinc-400 mb-2">Cost Performance</p>
              <p className={`text-2xl font-bold ${
                cpi >= 1 ? 'text-green-400' :
                cpi >= 0.9 ? 'text-amber-400' :
                'text-red-400'
              }`}>
                {cpi.toFixed(3)}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">CPI</p>
            </div>
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
              <p className="text-xs text-zinc-400 mb-2">Cost Variance</p>
              <p className={`text-2xl font-bold ${cv >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(cv)}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">EV - AC</p>
            </div>
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
              <p className="text-xs text-zinc-400 mb-2">Ready to Bill</p>
              <p className="text-2xl font-bold text-blue-400">
                {formatCurrency(readyToBill)}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">Unbilled EV</p>
            </div>
          </div>
        </div>

        {/* Forecast Summary */}
        <div>
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Forecast at Completion</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
              <p className="text-xs text-zinc-400 mb-3">Revenue (FAC)</p>
              <p className="text-2xl font-bold text-white mb-1">{formatCurrency(totalContract)}</p>
              <p className="text-[10px] text-zinc-600">
                {denominatorMode === 'total' ? 'Total Contract' : 'Base Contract'}
              </p>
            </div>
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
              <p className="text-xs text-zinc-400 mb-3">Cost (EAC)</p>
              <p className="text-2xl font-bold text-amber-400 mb-1">{formatCurrency(eac)}</p>
              <p className="text-[10px] text-zinc-600">
                AC {formatCurrency(actualCost)} + ETC {formatCurrency(etc)}
              </p>
            </div>
          </div>
        </div>

        {/* Risks & Issues */}
        {risks.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400" />
              Key Risks
            </h3>
            <div className="space-y-2">
              {risks.map((risk, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded border ${
                    risk.severity === 'high'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Badge className={
                      risk.severity === 'high'
                        ? 'bg-red-500/20 text-red-400 border-red-500/50'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    }>
                      {risk.severity.toUpperCase()}
                    </Badge>
                    <p className="text-xs text-white">{risk.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {risks.length === 0 && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded flex items-center gap-2">
            <CheckCircle size={16} className="text-green-400" />
            <p className="text-sm text-green-400 font-medium">No critical financial risks identified</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}