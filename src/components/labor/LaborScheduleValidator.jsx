import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function LaborScheduleValidator({ 
  projectId, 
  breakdowns = [], 
  specialtyItems = [], 
  tasks = [], 
  categories = [],
  scopeGaps = []
}) {
  const validation = useMemo(() => {
    const results = [];

    categories.forEach(category => {
      const breakdown = breakdowns.find(b => b.labor_category_id === category.id);
      if (!breakdown) return;

      const plannedShop = breakdown.shop_hours || 0;
      const plannedField = breakdown.field_hours || 0;
      const total = plannedShop + plannedField;

      if (total === 0) return;

      // Sum scheduled hours for this category
      const categoryTasks = tasks.filter(t => t.labor_category_id === category.id);
      const scheduledShop = categoryTasks.reduce((sum, t) => sum + (t.planned_shop_hours || 0), 0);
      const scheduledField = categoryTasks.reduce((sum, t) => sum + (t.planned_field_hours || 0), 0);
      const scheduledTotal = scheduledShop + scheduledField;

      const variance = scheduledTotal - total;
      const variancePercent = total > 0 ? Math.round((variance / total) * 100) : 0;

      // Check if there are scope gaps for this category
      const relatedGaps = scopeGaps.filter(g => 
        g.status === 'open' && 
        g.location_description?.toLowerCase().includes(category.name.toLowerCase())
      );

      const status = Math.abs(variancePercent) <= 5 ? 'match' : 
                     variance > 0 ? 'over' : 'under';

      results.push({
        category: category.name,
        plannedShop,
        plannedField,
        plannedTotal: total,
        scheduledShop,
        scheduledField,
        scheduledTotal,
        variance,
        variancePercent,
        status,
        hasGaps: relatedGaps.length > 0,
        gapCost: relatedGaps.reduce((sum, g) => sum + (g.rough_cost || 0), 0),
        taskCount: categoryTasks.length
      });
    });

    // Add specialty items summary
    const specialtyShop = specialtyItems.reduce((sum, s) => sum + (s.shop_hours || 0), 0);
    const specialtyField = specialtyItems.reduce((sum, s) => sum + (s.field_hours || 0), 0);
    const specialtyTotal = specialtyShop + specialtyField;

    if (specialtyTotal > 0) {
      const specialtyTasks = tasks.filter(t => !t.labor_category_id);
      const scheduledShop = specialtyTasks.reduce((sum, t) => sum + (t.planned_shop_hours || 0), 0);
      const scheduledField = specialtyTasks.reduce((sum, t) => sum + (t.planned_field_hours || 0), 0);
      const scheduledTotal = scheduledShop + scheduledField;
      const variance = scheduledTotal - specialtyTotal;
      const variancePercent = specialtyTotal > 0 ? Math.round((variance / specialtyTotal) * 100) : 0;

      results.push({
        category: 'Specialty Items',
        plannedShop: specialtyShop,
        plannedField: specialtyField,
        plannedTotal: specialtyTotal,
        scheduledShop,
        scheduledField,
        scheduledTotal,
        variance,
        variancePercent,
        status: Math.abs(variancePercent) <= 5 ? 'match' : variance > 0 ? 'over' : 'under',
        hasGaps: false,
        gapCost: 0,
        taskCount: specialtyTasks.length
      });
    }

    return results.filter(r => r.plannedTotal > 0);
  }, [breakdowns, specialtyItems, tasks, categories, scopeGaps]);

  const summary = useMemo(() => {
    const totalPlanned = validation.reduce((sum, v) => sum + v.plannedTotal, 0);
    const totalScheduled = validation.reduce((sum, v) => sum + v.scheduledTotal, 0);
    const variance = totalScheduled - totalPlanned;
    const variancePercent = totalPlanned > 0 ? Math.round((variance / totalPlanned) * 100) : 0;
    
    const atRisk = validation.filter(v => Math.abs(v.variancePercent) > 10);
    const withGaps = validation.filter(v => v.hasGaps);
    const totalGapCost = validation.reduce((sum, v) => sum + v.gapCost, 0);

    return {
      totalPlanned,
      totalScheduled,
      variance,
      variancePercent,
      atRiskCount: atRisk.length,
      gapsCount: withGaps.length,
      totalGapCost,
      hasIssues: Math.abs(variancePercent) > 5 || atRisk.length > 0
    };
  }, [validation]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'match': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'over': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'under': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default: return 'text-zinc-400 bg-zinc-800';
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Labor vs Schedule Validation</CardTitle>
          {summary.hasIssues ? (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              <AlertTriangle size={14} className="mr-1" />
              Mismatches Detected
            </Badge>
          ) : (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle size={14} className="mr-1" />
              Aligned
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-zinc-800/50 rounded border border-zinc-700">
            <p className="text-xs text-zinc-400 mb-1">Total Planned</p>
            <p className="text-xl font-bold text-white">{summary.totalPlanned.toLocaleString()} hrs</p>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded border border-zinc-700">
            <p className="text-xs text-zinc-400 mb-1">Total Scheduled</p>
            <p className="text-xl font-bold text-amber-400">{summary.totalScheduled.toLocaleString()} hrs</p>
          </div>
          <div className={`p-3 rounded border ${
            Math.abs(summary.variancePercent) <= 5 ? 'bg-green-500/10 border-green-500/30' :
            'bg-red-500/10 border-red-500/30'
          }`}>
            <p className="text-xs text-zinc-400 mb-1">Variance</p>
            <p className={`text-xl font-bold ${
              Math.abs(summary.variancePercent) <= 5 ? 'text-green-400' : 'text-red-400'
            }`}>
              {summary.variance > 0 ? '+' : ''}{summary.variance.toLocaleString()} hrs
            </p>
            <p className="text-xs text-zinc-500 mt-1">{summary.variancePercent > 0 ? '+' : ''}{summary.variancePercent}%</p>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded border border-zinc-700">
            <p className="text-xs text-zinc-400 mb-1">At Risk / Gaps</p>
            <p className="text-xl font-bold text-white">{summary.atRiskCount} / {summary.gapsCount}</p>
            {summary.totalGapCost > 0 && (
              <p className="text-xs text-red-400 mt-1">${summary.totalGapCost.toLocaleString()}</p>
            )}
          </div>
        </div>

        {/* Category Details */}
        <div className="space-y-2">
          {validation.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded border ${getStatusColor(item.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{item.category}</span>
                  <span className="text-xs text-zinc-400">({item.taskCount} tasks)</span>
                  {item.hasGaps && (
                    <Badge variant="outline" className="text-xs bg-red-500/10 border-red-500/30 text-red-400">
                      Scope Gap: ${item.gapCost.toLocaleString()}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    item.status === 'match' ? 'text-green-400' :
                    item.status === 'over' ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {item.variance > 0 ? '+' : ''}{item.variance} hrs ({item.variancePercent > 0 ? '+' : ''}{item.variancePercent}%)
                  </span>
                  {item.status === 'over' && item.hasGaps && (
                    <TrendingUp size={16} className="text-red-400" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-zinc-500 mb-1">Planned</p>
                  <p className="text-white">
                    Shop: {item.plannedShop} • Field: {item.plannedField}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 mb-1">Scheduled</p>
                  <p className="text-white">
                    Shop: {item.scheduledShop} • Field: {item.scheduledField}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 mb-1">Status</p>
                  <p className="text-white">
                    {item.status === 'match' ? '✓ Aligned' :
                     item.status === 'over' ? '⚠ Over-scheduled' :
                     '⚠ Under-scheduled'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}