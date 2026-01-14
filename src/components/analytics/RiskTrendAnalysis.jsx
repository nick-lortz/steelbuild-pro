import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { AlertTriangle, TrendingUp, FileText, DollarSign } from 'lucide-react';
import { format, eachMonthOfInterval, subMonths, startOfMonth } from 'date-fns';

export default function RiskTrendAnalysis({ projects, rfis, changeOrders, drawings, tasks, scopeGaps, financials, laborBreakdowns }) {
  // RFI trends over time
  const rfiTrends = useMemo(() => {
    if (!Array.isArray(rfis)) return [];
    
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 11),
      end: now
    });

    return months.map(month => {
      const monthStr = format(month, 'yyyy-MM');
      
      const monthRfis = rfis.filter(r => {
        if (!r.submitted_date) return false;
        try {
          return format(new Date(r.submitted_date), 'yyyy-MM') === monthStr;
        } catch {
          return false;
        }
      });

      const open = monthRfis.filter(r => r.status === 'pending' || r.status === 'submitted').length;
      const resolved = monthRfis.filter(r => r.status === 'answered' || r.status === 'closed').length;
      const critical = monthRfis.filter(r => r.priority === 'critical' || r.priority === 'high').length;

      return {
        month: format(month, 'MMM'),
        open,
        resolved,
        critical,
        total: monthRfis.length
      };
    });
  }, [rfis]);

  // Change order impact trends
  const coTrends = useMemo(() => {
    if (!Array.isArray(changeOrders)) return [];
    
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 11),
      end: now
    });

    return months.map(month => {
      const monthStr = format(month, 'yyyy-MM');
      
      const monthCOs = changeOrders.filter(co => {
        if (!co.submitted_date) return false;
        try {
          return format(new Date(co.submitted_date), 'yyyy-MM') === monthStr;
        } catch {
          return false;
        }
      });

      const costImpact = monthCOs.reduce((sum, co) => sum + (Number(co.cost_impact) || 0), 0);
      const scheduleImpact = monthCOs.reduce((sum, co) => sum + (Number(co.schedule_impact_days) || 0), 0);
      const approved = monthCOs.filter(co => co.status === 'approved').length;
      const pending = monthCOs.filter(co => co.status === 'pending' || co.status === 'submitted').length;

      return {
        month: format(month, 'MMM'),
        costImpact: costImpact / 1000,
        scheduleImpact,
        approved,
        pending
      };
    });
  }, [changeOrders]);

  // Drawing risk trends
  const drawingRisks = useMemo(() => {
    if (!Array.isArray(drawings)) return [];
    
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 5),
      end: now
    });

    return months.map(month => {
      const monthEnd = new Date(month);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      // Count drawings that were overdue at month end
      const overdue = drawings.filter(d => {
        if (!d.due_date) return false;
        const dueDate = new Date(d.due_date);
        return dueDate <= monthEnd && d.status !== 'FFF' && d.status !== 'As-Built';
      }).length;

      const released = drawings.filter(d => {
        if (!d.released_for_fab_date) return false;
        try {
          return format(new Date(d.released_for_fab_date), 'yyyy-MM') === format(month, 'yyyy-MM');
        } catch {
          return false;
        }
      }).length;

      return {
        month: format(month, 'MMM'),
        overdue,
        released
      };
    });
  }, [drawings]);

  // Schedule risk evolution
  const scheduleRisks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 11),
      end: now
    });

    return months.map(month => {
      const monthEnd = new Date(month);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const overdueTasks = tasks.filter(t => {
        if (t.status === 'completed') return false;
        if (!t.end_date) return false;
        const endDate = new Date(t.end_date);
        return endDate <= monthEnd && endDate >= startOfMonth(month);
      }).length;

      const critical = tasks.filter(t => t.is_critical).length;

      return {
        month: format(month, 'MMM'),
        overdue: overdueTasks,
        critical
      };
    });
  }, [tasks]);

  // Scope gap evolution
  const scopeGapTrends = useMemo(() => {
    if (!Array.isArray(scopeGaps)) return [];
    
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 5),
      end: now
    });

    return months.map(month => {
      const monthStr = format(month, 'yyyy-MM');
      
      const openGaps = scopeGaps.filter(g => {
        if (!g.created_date) return g.status === 'open';
        try {
          return format(new Date(g.created_date), 'yyyy-MM') <= monthStr && g.status === 'open';
        } catch {
          return g.status === 'open';
        }
      });

      const totalCost = openGaps.reduce((sum, g) => sum + (Number(g.rough_cost) || 0), 0);

      return {
        month: format(month, 'MMM'),
        count: openGaps.length,
        cost: totalCost / 1000
      };
    });
  }, [scopeGaps]);

  // Current risk summary
  const riskSummary = useMemo(() => {
    const openRfis = (rfis || []).filter(r => r.status === 'pending' || r.status === 'submitted').length;
    const overdueRfis = (rfis || []).filter(r => {
      if (r.status === 'closed' || r.status === 'answered') return false;
      if (!r.due_date) return false;
      return new Date(r.due_date) < new Date();
    }).length;

    const pendingCOs = (changeOrders || []).filter(co => co.status === 'pending' || co.status === 'submitted').length;
    const coValue = (changeOrders || [])
      .filter(co => co.status === 'pending' || co.status === 'submitted')
      .reduce((sum, co) => sum + (Number(co.cost_impact) || 0), 0);

    const overdueDrawings = (drawings || []).filter(d => {
      if (!d.due_date) return false;
      return new Date(d.due_date) < new Date() && d.status !== 'FFF' && d.status !== 'As-Built';
    }).length;

    const overdueTasks = (tasks || []).filter(t => {
      if (t.status === 'completed') return false;
      if (!t.end_date) return false;
      return new Date(t.end_date) < new Date();
    }).length;

    const openGaps = (scopeGaps || []).filter(g => g.status === 'open').length;
    const gapValue = (scopeGaps || [])
      .filter(g => g.status === 'open')
      .reduce((sum, g) => sum + (Number(g.rough_cost) || 0), 0);

    return {
      openRfis,
      overdueRfis,
      pendingCOs,
      coValue,
      overdueDrawings,
      overdueTasks,
      openGaps,
      gapValue
    };
  }, [rfis, changeOrders, drawings, tasks, scopeGaps]);

  // Early return if no data
  if (!rfis || !changeOrders || !drawings || !tasks || !scopeGaps) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-zinc-500">
          <AlertTriangle size={40} className="mx-auto mb-3 opacity-50" />
          <p>Loading risk analysis data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Open RFIs</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{riskSummary.openRfis}</p>
                <p className="text-xs text-red-400 mt-1">{riskSummary.overdueRfis} overdue</p>
              </div>
              <FileText className="text-amber-500" size={18} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Pending COs</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{riskSummary.pendingCOs}</p>
                <p className="text-xs text-muted-foreground mt-1">${(riskSummary.coValue / 1000).toFixed(0)}K</p>
              </div>
              <DollarSign className="text-blue-500" size={18} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Overdue Items</p>
                <p className="text-2xl font-bold text-red-400 mt-1">
                  {riskSummary.overdueDrawings + riskSummary.overdueTasks}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {riskSummary.overdueDrawings} dwgs, {riskSummary.overdueTasks} tasks
                </p>
              </div>
              <AlertTriangle className="text-red-500" size={18} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Scope Gaps</p>
                <p className="text-2xl font-bold text-purple-400 mt-1">{riskSummary.openGaps}</p>
                <p className="text-xs text-muted-foreground mt-1">${(riskSummary.gapValue / 1000).toFixed(0)}K</p>
              </div>
              <TrendingUp className="text-purple-500" size={18} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RFI Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText size={16} className="text-amber-500" />
            RFI Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={rfiTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="month" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
              <Legend />
              <Area type="monotone" dataKey="total" fill="#f59e0b" fillOpacity={0.2} stroke="#f59e0b" name="Total RFIs" />
              <Line type="monotone" dataKey="open" stroke="#ef4444" strokeWidth={2} name="Open" />
              <Line type="monotone" dataKey="critical" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 5" name="Critical" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change Order Impact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign size={16} className="text-blue-500" />
              Change Order Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={coTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="month" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                <Legend />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                <Bar dataKey="approved" fill="#10b981" name="Approved" />
                <Line type="monotone" dataKey="costImpact" stroke="#60a5fa" strokeWidth={2} name="Cost Impact ($K)" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Scope Gap Evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle size={16} className="text-purple-500" />
              Scope Gap Evolution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={scopeGapTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="month" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                <Legend />
                <Area type="monotone" dataKey="cost" fill="#a855f7" fillOpacity={0.3} stroke="#a855f7" name="Cost ($K)" />
                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} name="Open Gaps" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Schedule Risk */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-red-500" />
              Schedule Risk Evolution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={scheduleRisks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="month" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                <Legend />
                <Line type="monotone" dataKey="overdue" stroke="#ef4444" strokeWidth={2} name="Overdue Tasks" />
                <Line type="monotone" dataKey="critical" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Critical Path" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Drawing Risk */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText size={16} className="text-green-500" />
              Drawing Release Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={drawingRisks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="month" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                <Legend />
                <Bar dataKey="released" fill="#10b981" name="Released" />
                <Line type="monotone" dataKey="overdue" stroke="#ef4444" strokeWidth={2} name="Overdue" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}