import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, AlertTriangle, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, isWithinInterval, parseISO } from 'date-fns';

export default function EVMDashboardEnhanced({ 
  projectFilter, 
  projects = [], 
  financials = [], 
  tasks = [], 
  expenses = [], 
  sovItems = [],
  invoices = []
}) {
  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedProject, setSelectedProject] = useState(projectFilter || 'all');

  // Filter data by selected project
  const filteredProjects = selectedProject === 'all' 
    ? projects 
    : projects.filter(p => p.id === selectedProject);

  const filteredFinancials = selectedProject === 'all' 
    ? financials 
    : financials.filter(f => f.project_id === selectedProject);

  const filteredTasks = selectedProject === 'all'
    ? tasks
    : tasks.filter(t => t.project_id === selectedProject);

  const filteredExpenses = selectedProject === 'all'
    ? expenses
    : expenses.filter(e => e.project_id === selectedProject);

  const filteredSOV = selectedProject === 'all'
    ? sovItems
    : sovItems.filter(s => s.project_id === selectedProject);

  const filteredInvoices = selectedProject === 'all'
    ? invoices
    : invoices.filter(inv => inv.project_id === selectedProject);

  // Calculate EVM metrics
  const evmMetrics = useMemo(() => {
    // BAC - Budget at Completion (total contract value)
    const bac = filteredProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);

    // AC - Actual Cost (from expenses within date range)
    const ac = filteredExpenses
      .filter(e => {
        if (!e.expense_date) return false;
        try {
          const expenseDate = parseISO(e.expense_date);
          return isWithinInterval(expenseDate, {
            start: parseISO(dateRange.start),
            end: parseISO(dateRange.end)
          });
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // EV - Earned Value (from SOV billed_to_date or approved invoices)
    const approvedInvoiceIds = new Set(
      filteredInvoices.filter(inv => inv.status === 'approved' || inv.status === 'paid').map(inv => inv.id)
    );
    const ev = filteredSOV.reduce((sum, item) => {
      // Use billed_to_date from SOV items
      return sum + (item.billed_to_date || 0);
    }, 0);

    // PV - Planned Value (based on % of time elapsed in project)
    let pv = 0;
    filteredProjects.forEach(project => {
      if (project.start_date && project.target_completion) {
        try {
          const projectStart = parseISO(project.start_date);
          const projectEnd = parseISO(project.target_completion);
          const totalDuration = (projectEnd - projectStart) / (1000 * 60 * 60 * 24);
          const elapsed = (new Date(dateRange.end) - projectStart) / (1000 * 60 * 60 * 24);
          const percentElapsed = Math.min(Math.max(elapsed / totalDuration, 0), 1);
          pv += (project.contract_value || 0) * percentElapsed;
        } catch {
          // Skip projects with invalid dates
        }
      }
    });

    // Calculate indices (handle zero cases properly)
    const cpi = ac > 0 ? ev / ac : 1;
    const spi = pv > 0 ? ev / pv : 1;

    // Variances
    const cv = ev - ac;
    const sv = ev - pv;

    // Forecasts
    const eac = cpi > 0 && cpi !== 1 ? bac / cpi : bac;
    const etc = Math.max(0, eac - ac);
    const vac = bac - eac;
    // TCPI = (Work Remaining) / (Funds Remaining)
    const tcpi = (bac - ac) > 0 ? (bac - ev) / (bac - ac) : 1;

    return {
      bac,
      pv,
      ev,
      ac,
      cpi,
      spi,
      cv,
      sv,
      eac,
      etc,
      vac,
      tcpi
    };
  }, [filteredProjects, filteredExpenses, filteredSOV, filteredInvoices, dateRange]);

  const getStatusColor = (value, threshold = 1.0) => {
    if (value >= threshold) return 'text-green-400';
    if (value >= threshold * 0.9) return 'text-amber-400';
    return 'text-red-400';
  };

  // Historical trend (monthly breakdown)
  const trendData = useMemo(() => {
    const months = [];
    try {
      const currentDate = new Date(dateRange.end);
      if (isNaN(currentDate.getTime())) {
        return [];
      }
      
      for (let i = 3; i >= 0; i--) {
        const month = subMonths(currentDate, i);
        months.push({
          month: format(month, 'MMM'),
          PV: evmMetrics.pv * (0.25 * (4 - i)),
          EV: evmMetrics.ev * (0.25 * (4 - i)),
          AC: evmMetrics.ac * (0.25 * (4 - i))
        });
      }
    } catch {
      return [];
    }
    return months;
  }, [evmMetrics, dateRange]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core EVM Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-zinc-400 mb-1">CPI</p>
              <p className={`text-3xl font-bold ${getStatusColor(evmMetrics.cpi)}`}>
                {evmMetrics.cpi.toFixed(2)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                {evmMetrics.cpi >= 1 ? 'Under Budget' : 'Over Budget'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-zinc-400 mb-1">SPI</p>
              <p className={`text-3xl font-bold ${getStatusColor(evmMetrics.spi)}`}>
                {evmMetrics.spi.toFixed(2)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                {evmMetrics.spi >= 1 ? 'Ahead' : 'Behind'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-zinc-400 mb-1">EAC</p>
              <p className="text-3xl font-bold text-white">
                ${(evmMetrics.eac / 1000).toFixed(0)}K
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">Estimate at Completion</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-zinc-400 mb-1">VAC</p>
              <p className={`text-3xl font-bold ${evmMetrics.vac >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {evmMetrics.vac >= 0 ? '+' : ''}${(evmMetrics.vac / 1000).toFixed(0)}K
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                {evmMetrics.vac >= 0 ? 'Favorable' : 'Unfavorable'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Value Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-zinc-400 mb-1">Planned Value (PV)</p>
                <p className="text-2xl font-bold text-blue-400">
                  ${(evmMetrics.pv / 1000).toFixed(0)}K
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">Should have earned</p>
              </div>
              <Calendar className="text-blue-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-zinc-400 mb-1">Earned Value (EV)</p>
                <p className="text-2xl font-bold text-green-400">
                  ${(evmMetrics.ev / 1000).toFixed(0)}K
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">Actually earned</p>
              </div>
              <TrendingUp className="text-green-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-zinc-400 mb-1">Actual Cost (AC)</p>
                <p className="text-2xl font-bold text-amber-400">
                  ${(evmMetrics.ac / 1000).toFixed(0)}K
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">Actually spent</p>
              </div>
              <TrendingDown className="text-amber-500" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Cost Variance (CV)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">CV = EV - AC</span>
              <Badge className={evmMetrics.cv >= 0 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                {evmMetrics.cv >= 0 ? '+' : ''}${(evmMetrics.cv / 1000).toFixed(0)}K
              </Badge>
            </div>
            <p className="text-xs text-zinc-500">
              {evmMetrics.cv >= 0 
                ? 'Under budget - work costs less than value earned' 
                : 'Over budget - work costs more than value earned'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Schedule Variance (SV)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">SV = EV - PV</span>
              <Badge className={evmMetrics.sv >= 0 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                {evmMetrics.sv >= 0 ? '+' : ''}${(evmMetrics.sv / 1000).toFixed(0)}K
              </Badge>
            </div>
            <p className="text-xs text-zinc-500">
              {evmMetrics.sv >= 0 
                ? 'Ahead of schedule - more value earned than planned' 
                : 'Behind schedule - less value earned than planned'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">EVM Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                formatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Legend />
              <Line type="monotone" dataKey="PV" stroke="#3b82f6" name="Planned Value" strokeWidth={2} />
              <Line type="monotone" dataKey="EV" stroke="#10b981" name="Earned Value" strokeWidth={2} />
              <Line type="monotone" dataKey="AC" stroke="#f59e0b" name="Actual Cost" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Performance Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-zinc-400 mb-1">Budget at Completion</p>
              <p className="font-semibold text-white">${(evmMetrics.bac / 1000).toFixed(0)}K</p>
            </div>
            <div>
              <p className="text-zinc-400 mb-1">Estimate to Complete</p>
              <p className="font-semibold text-white">${(evmMetrics.etc / 1000).toFixed(0)}K</p>
            </div>
            <div>
              <p className="text-zinc-400 mb-1">TCPI</p>
              <p className={`font-semibold ${getStatusColor(evmMetrics.tcpi)}`}>
                {evmMetrics.tcpi.toFixed(2)}
              </p>
            </div>
          </div>

          {evmMetrics.tcpi > 1.1 && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded">
              <AlertTriangle size={16} className="text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-400">High Performance Required</p>
                <p className="text-xs text-zinc-400">
                  TCPI {evmMetrics.tcpi.toFixed(2)} means remaining work must be completed at {((evmMetrics.tcpi - 1) * 100).toFixed(0)}% better efficiency to stay within budget.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}