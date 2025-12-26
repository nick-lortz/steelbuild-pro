import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function TaskFinancialImpact({ tasks, changeOrders }) {
  // Calculate financial impacts from tasks
  const taskMetrics = tasks.reduce((acc, task) => {
    const costVariance = (task.actual_cost || 0) - (task.estimated_cost || 0);
    const hoursVariance = (task.actual_hours || 0) - (task.estimated_hours || 0);
    
    return {
      totalEstimatedCost: acc.totalEstimatedCost + (task.estimated_cost || 0),
      totalActualCost: acc.totalActualCost + (task.actual_cost || 0),
      totalEstimatedHours: acc.totalEstimatedHours + (task.estimated_hours || 0),
      totalActualHours: acc.totalActualHours + (task.actual_hours || 0),
      overBudgetTasks: costVariance > 0 ? acc.overBudgetTasks + 1 : acc.overBudgetTasks,
      underBudgetTasks: costVariance < 0 ? acc.underBudgetTasks + 1 : acc.underBudgetTasks,
      tasksWithCO: task.linked_co_ids?.length > 0 ? acc.tasksWithCO + 1 : acc.tasksWithCO,
    };
  }, {
    totalEstimatedCost: 0,
    totalActualCost: 0,
    totalEstimatedHours: 0,
    totalActualHours: 0,
    overBudgetTasks: 0,
    underBudgetTasks: 0,
    tasksWithCO: 0,
  });

  const costVariance = taskMetrics.totalActualCost - taskMetrics.totalEstimatedCost;
  const costVariancePercent = taskMetrics.totalEstimatedCost > 0 
    ? (costVariance / taskMetrics.totalEstimatedCost) * 100 
    : 0;

  const hoursVariance = taskMetrics.totalActualHours - taskMetrics.totalEstimatedHours;
  const hoursVariancePercent = taskMetrics.totalEstimatedHours > 0 
    ? (hoursVariance / taskMetrics.totalEstimatedHours) * 100 
    : 0;

  // Calculate CPI (Cost Performance Index)
  const cpi = taskMetrics.totalActualCost > 0 
    ? taskMetrics.totalEstimatedCost / taskMetrics.totalActualCost 
    : 1;

  const cpiStatus = cpi >= 1 ? 'On Budget' : cpi >= 0.9 ? 'At Risk' : 'Over Budget';
  const cpiColor = cpi >= 1 ? 'text-green-400' : cpi >= 0.9 ? 'text-amber-400' : 'text-red-400';

  // Calculate change order impacts on tasks
  const coImpacts = tasks.reduce((total, task) => {
    if (task.linked_co_ids?.length > 0) {
      const taskCOs = changeOrders.filter(co => task.linked_co_ids.includes(co.id));
      return total + taskCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    }
    return total;
  }, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Cost Variance */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400">Cost Variance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${costVariance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                {costVariance >= 0 ? '+' : ''}${Math.abs(costVariance).toLocaleString()}
              </span>
              {costVariance >= 0 ? <TrendingUp className="text-red-400" /> : <TrendingDown className="text-green-400" />}
            </div>
            <p className="text-xs text-zinc-500">
              {Math.abs(costVariancePercent).toFixed(1)}% {costVariance >= 0 ? 'over' : 'under'} estimate
            </p>
            <div className="text-xs text-zinc-600">
              Actual: ${taskMetrics.totalActualCost.toLocaleString()} / Est: ${taskMetrics.totalEstimatedCost.toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hours Variance */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400">Hours Variance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${hoursVariance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                {hoursVariance >= 0 ? '+' : ''}{Math.abs(hoursVariance).toLocaleString()}h
              </span>
              <Clock className={hoursVariance >= 0 ? 'text-red-400' : 'text-green-400'} />
            </div>
            <p className="text-xs text-zinc-500">
              {Math.abs(hoursVariancePercent).toFixed(1)}% {hoursVariance >= 0 ? 'over' : 'under'} estimate
            </p>
            <div className="text-xs text-zinc-600">
              Actual: {taskMetrics.totalActualHours.toLocaleString()}h / Est: {taskMetrics.totalEstimatedHours.toLocaleString()}h
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CPI */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400">Cost Performance Index</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${cpiColor}`}>
                {cpi.toFixed(2)}
              </span>
              <DollarSign className={cpiColor} />
            </div>
            <Badge variant="outline" className={`${cpiColor} border-current`}>
              {cpiStatus}
            </Badge>
            <p className="text-xs text-zinc-500">
              {taskMetrics.overBudgetTasks} over, {taskMetrics.underBudgetTasks} under budget
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Change Order Impact */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400">Change Order Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${coImpacts >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {coImpacts >= 0 ? '+' : ''}${Math.abs(coImpacts).toLocaleString()}
              </span>
              <AlertTriangle className="text-amber-500" />
            </div>
            <p className="text-xs text-zinc-500">
              {taskMetrics.tasksWithCO} tasks affected by COs
            </p>
            <div className="text-xs text-zinc-600">
              Linked to {taskMetrics.tasksWithCO} tasks
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}