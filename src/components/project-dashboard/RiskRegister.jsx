import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, DollarSign, Clock, FileText, MessageSquareWarning } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SEVERITY_COLORS = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const RISK_ICONS = {
  budget: DollarSign,
  schedule: Clock,
  drawings: FileText,
  rfi: MessageSquareWarning,
  quality: AlertTriangle,
};

export default function RiskRegister({ 
  project, 
  financials, 
  tasks, 
  rfis, 
  drawings, 
  changeOrders,
  projectTotals,
  scheduleMetrics 
}) {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const risks = useMemo(() => {
    const riskList = [];

    // Budget Risks
    if (projectTotals.percentSpent >= 80) {
      riskList.push({
        id: 'budget-overrun',
        category: 'budget',
        severity: projectTotals.percentSpent >= 95 ? 'critical' : projectTotals.percentSpent >= 90 ? 'high' : 'medium',
        title: 'Budget Nearing Limit',
        description: `Project has spent ${projectTotals.percentSpent.toFixed(1)}% of budget with ${projectTotals.remaining < 0 ? 'over' : 'remaining'} $${Math.abs(projectTotals.remaining).toLocaleString()}`,
        impact: `$${Math.abs(projectTotals.remaining).toLocaleString()}`,
        probability: projectTotals.percentSpent >= 95 ? 'High' : 'Medium',
        mitigation: 'Review remaining scope, consider value engineering, monitor committed costs closely',
      });
    }

    // Cost Code Variance Risks
    financials.forEach(financial => {
      const budget = Number(financial.budget_amount) || 0;
      const actual = Number(financial.actual_amount) || 0;
      if (budget > 0 && actual > budget * 0.9) {
        riskList.push({
          id: `cost-code-${financial.id}`,
          category: 'budget',
          severity: actual > budget ? 'high' : 'medium',
          title: `Cost Code Over Budget`,
          description: `Cost code ${financial.cost_code_id} at ${((actual/budget)*100).toFixed(0)}% of budget`,
          impact: `$${(actual - budget).toLocaleString()}`,
          probability: 'High',
          mitigation: 'Review cost code allocations, verify expense accuracy',
        });
      }
    });

    // Schedule Risks
    if (scheduleMetrics.overdue > 0) {
      riskList.push({
        id: 'schedule-overdue',
        category: 'schedule',
        severity: scheduleMetrics.overdue >= 5 ? 'critical' : scheduleMetrics.overdue >= 3 ? 'high' : 'medium',
        title: 'Overdue Tasks',
        description: `${scheduleMetrics.overdue} tasks are past their due date`,
        impact: `${scheduleMetrics.overdue} tasks delayed`,
        probability: 'High',
        mitigation: 'Accelerate critical tasks, reassign resources, update schedule',
      });
    }

    if (scheduleMetrics.adherence < 70) {
      riskList.push({
        id: 'schedule-adherence',
        category: 'schedule',
        severity: 'high',
        title: 'Poor Schedule Adherence',
        description: `Only ${scheduleMetrics.adherence.toFixed(0)}% of tasks on track`,
        impact: 'Project delays, potential penalties',
        probability: 'Medium',
        mitigation: 'Review schedule baselines, identify bottlenecks, increase oversight',
      });
    }

    // Drawing Risks
    const pendingDrawings = drawings.filter(d => d.status !== 'FFF' && d.status !== 'As-Built');
    const overdueDrawings = pendingDrawings.filter(d => d.due_date && new Date(d.due_date) < new Date());
    
    if (overdueDrawings.length > 0) {
      riskList.push({
        id: 'drawings-overdue',
        category: 'drawings',
        severity: overdueDrawings.length >= 3 ? 'critical' : 'high',
        title: 'Overdue Drawing Sets',
        description: `${overdueDrawings.length} drawing sets past due date`,
        impact: 'Fabrication delays, schedule impact',
        probability: 'High',
        mitigation: 'Expedite approvals, follow up with engineer, consider partial releases',
      });
    }

    // RFI Risks
    const criticalRfis = rfis.filter(r => 
      r.priority === 'critical' && (r.status === 'pending' || r.status === 'submitted')
    );
    
    if (criticalRfis.length > 0) {
      riskList.push({
        id: 'rfis-critical',
        category: 'rfi',
        severity: 'critical',
        title: 'Critical RFIs Pending',
        description: `${criticalRfis.length} critical RFIs awaiting response`,
        impact: 'Work stoppage, schedule delays',
        probability: 'High',
        mitigation: 'Escalate to GC, consider proceeding with alternate detail if possible',
      });
    }

    const overdueRfis = rfis.filter(r => 
      r.due_date && 
      new Date(r.due_date) < new Date() && 
      (r.status === 'pending' || r.status === 'submitted')
    );
    
    if (overdueRfis.length > 2) {
      riskList.push({
        id: 'rfis-overdue',
        category: 'rfi',
        severity: 'high',
        title: 'Multiple Overdue RFIs',
        description: `${overdueRfis.length} RFIs overdue for response`,
        impact: 'Schedule delays, scope clarification issues',
        probability: 'Medium',
        mitigation: 'Weekly RFI status meetings, escalate to senior management',
      });
    }

    // Change Order Risks
    const pendingCOs = changeOrders.filter(co => co.status === 'pending' || co.status === 'submitted');
    const coValue = pendingCOs.reduce((sum, co) => sum + (Number(co.cost_impact) || 0), 0);
    
    if (coValue > projectTotals.remaining) {
      riskList.push({
        id: 'change-orders-exceed',
        category: 'budget',
        severity: 'high',
        title: 'Pending COs Exceed Budget',
        description: `Pending change orders total $${coValue.toLocaleString()}, exceeding remaining budget`,
        impact: `$${(coValue - projectTotals.remaining).toLocaleString()}`,
        probability: 'Medium',
        mitigation: 'Negotiate scope reductions, seek budget increase, prioritize critical COs',
      });
    }

    return riskList;
  }, [financials, tasks, rfis, drawings, changeOrders, projectTotals, scheduleMetrics]);

  const filteredRisks = risks.filter(risk => {
    if (severityFilter !== 'all' && risk.severity !== severityFilter) return false;
    if (categoryFilter !== 'all' && risk.category !== categoryFilter) return false;
    return true;
  });

  const riskCounts = useMemo(() => ({
    critical: risks.filter(r => r.severity === 'critical').length,
    high: risks.filter(r => r.severity === 'high').length,
    medium: risks.filter(r => r.severity === 'medium').length,
    low: risks.filter(r => r.severity === 'low').length,
  }), [risks]);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Risk Register ({risks.length} Risks Identified)
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
              {riskCounts.critical} Critical
            </Badge>
            <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              {riskCounts.high} High
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="budget">Budget</SelectItem>
              <SelectItem value="schedule">Schedule</SelectItem>
              <SelectItem value="drawings">Drawings</SelectItem>
              <SelectItem value="rfi">RFIs</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Risk List */}
        <div className="space-y-3">
          {filteredRisks.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
              <p>No risks found matching filters</p>
            </div>
          ) : (
            filteredRisks.map((risk) => {
              const Icon = RISK_ICONS[risk.category] || AlertTriangle;
              return (
                <div 
                  key={risk.id} 
                  className="p-4 bg-zinc-800 rounded-lg border-l-4"
                  style={{ 
                    borderLeftColor: 
                      risk.severity === 'critical' ? '#ef4444' :
                      risk.severity === 'high' ? '#f97316' :
                      risk.severity === 'medium' ? '#f59e0b' :
                      '#3b82f6'
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <Icon size={20} className="text-amber-500 mt-1" />
                      <div>
                        <h4 className="text-white font-medium">{risk.title}</h4>
                        <p className="text-sm text-zinc-400 mt-1">{risk.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={SEVERITY_COLORS[risk.severity]}>
                      {risk.severity}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-zinc-700">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Impact</p>
                      <p className="text-sm text-white font-medium">{risk.impact}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Probability</p>
                      <p className="text-sm text-white font-medium">{risk.probability}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Category</p>
                      <p className="text-sm text-white font-medium capitalize">{risk.category}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-zinc-700">
                    <p className="text-xs text-zinc-500 mb-1">Mitigation Strategy</p>
                    <p className="text-sm text-zinc-300">{risk.mitigation}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}