import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, AlertCircle, Users, Clock, Target, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, differenceInDays, addWeeks } from 'date-fns';
import { Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function ResourceForecast({ tasks, resources, projects, allocations, workPackages }) {
  const [forecastPeriod, setForecastPeriod] = useState('6month'); // 3month, 6month, 12month
  const [forecastGranularity, setForecastGranularity] = useState('month'); // week, month
  // Calculate resource demand forecast with dependency-based projections
  const forecastData = useMemo(() => {
    const periods = [];
    const today = new Date();
    const monthCount = forecastPeriod === '3month' ? 3 : forecastPeriod === '6month' ? 6 : 12;
    const isWeekly = forecastGranularity === 'week';
    const periodCount = isWeekly ? monthCount * 4 : monthCount;

    for (let i = 0; i < periodCount; i++) {
      const periodDate = isWeekly ? addWeeks(today, i) : addMonths(today, i);
      const periodStart = isWeekly ? periodDate : startOfMonth(periodDate);
      const periodEnd = isWeekly ? addWeeks(periodDate, 1) : endOfMonth(periodDate);

      // Count resources needed in this month
      const activeTasks = tasks.filter((task) => {
        if (!task.start_date || !task.end_date) return false;
        if (task.status === 'completed' || task.status === 'cancelled') return false;

        const taskStart = parseISO(task.start_date);
        const taskEnd = parseISO(task.end_date);

        return (
          isWithinInterval(taskStart, { start: monthStart, end: monthEnd }) ||
          isWithinInterval(taskEnd, { start: monthStart, end: monthEnd }) ||
          taskStart <= monthStart && taskEnd >= monthEnd);

      });

      // Calculate resource demand by type with dependency projections
      const laborNeeded = new Set();
      const equipmentNeeded = new Set();
      const subcontractorNeeded = new Set();
      const laborHoursNeeded = new Map();

      activeTasks.forEach((task) => {
        const taskPhase = task.phase || 'fabrication';
        const hoursMultiplier = taskPhase === 'fabrication' ? 1.2 : taskPhase === 'erection' ? 1.5 : 1.0;

        (task.assigned_resources || []).forEach((resId) => {
          const resource = resources.find((r) => r.id === resId);
          if (resource) {
            if (resource.type === 'labor') {
              laborNeeded.add(resId);
              const hours = (task.planned_shop_hours || task.planned_field_hours || task.estimated_hours || 40) * hoursMultiplier;
              laborHoursNeeded.set(resId, (laborHoursNeeded.get(resId) || 0) + hours);
            }
            if (resource.type === 'equipment') equipmentNeeded.add(resId);
            if (resource.type === 'subcontractor') subcontractorNeeded.add(resId);
          }
        });

        (task.assigned_equipment || []).forEach((resId) => {
          equipmentNeeded.add(resId);
        });
      });

      // Calculate critical path tasks
      const criticalTasks = activeTasks.filter(t => t.is_critical || t.priority === 'critical').length;
      
      // Estimate labor demand based on task volume and hours
      const totalLaborHours = Array.from(laborHoursNeeded.values()).reduce((sum, h) => sum + h, 0);
      const avgHoursPerResource = totalLaborHours / (laborNeeded.size || 1);
      const demandScore = Math.min(Math.ceil(avgHoursPerResource / 160), 5); // 160 hrs = 1 month full-time

      periods.push({
        period: format(periodDate, isWeekly ? 'MMM d' : 'MMM yyyy'),
        labor: laborNeeded.size,
        equipment: equipmentNeeded.size,
        subcontractor: subcontractorNeeded.size,
        total: laborNeeded.size + equipmentNeeded.size + subcontractorNeeded.size,
        tasks: activeTasks.length,
        criticalTasks,
        totalLaborHours: Math.round(totalLaborHours),
        demandScore,
        avgUtilization: laborNeeded.size > 0 ? Math.round((avgHoursPerResource / 160) * 100) : 0
      });
    }

    return periods;
  }, [tasks, resources, forecastPeriod, forecastGranularity]);

  // Calculate resource gaps
  const resourceGaps = useMemo(() => {
    const currentResources = {
      labor: resources.filter((r) => r.type === 'labor' && r.status !== 'unavailable').length,
      equipment: resources.filter((r) => r.type === 'equipment' && r.status !== 'unavailable').length,
      subcontractor: resources.filter((r) => r.type === 'subcontractor' && r.status !== 'unavailable').length
    };

    const peakDemand = {
      labor: Math.max(...forecastData.map((m) => m.labor)),
      equipment: Math.max(...forecastData.map((m) => m.equipment)),
      subcontractor: Math.max(...forecastData.map((m) => m.subcontractor))
    };

    return [
    {
      type: 'Labor',
      current: currentResources.labor,
      peak: peakDemand.labor,
      gap: Math.max(0, peakDemand.labor - currentResources.labor),
      status: peakDemand.labor > currentResources.labor ? 'shortage' : 'adequate'
    },
    {
      type: 'Equipment',
      current: currentResources.equipment,
      peak: peakDemand.equipment,
      gap: Math.max(0, peakDemand.equipment - currentResources.equipment),
      status: peakDemand.equipment > currentResources.equipment ? 'shortage' : 'adequate'
    },
    {
      type: 'Subcontractor',
      current: currentResources.subcontractor,
      peak: peakDemand.subcontractor,
      gap: Math.max(0, peakDemand.subcontractor - currentResources.subcontractor),
      status: peakDemand.subcontractor > currentResources.subcontractor ? 'shortage' : 'adequate'
    }];

  }, [forecastData, resources]);

  // Project pipeline analysis
  const pipelineAnalysis = useMemo(() => {
    const activeProjects = projects.filter((p) =>
    p.status === 'in_progress' || p.status === 'awarded'
    ).length;

    const biddingProjects = projects.filter((p) => p.status === 'bidding').length;

    const upcomingProjects = projects.filter((p) => {
      if (p.status !== 'awarded' || !p.start_date) return false;
      const startDate = parseISO(p.start_date);
      return startDate > new Date() && startDate <= addMonths(new Date(), 3);
    }).length;

    return {
      active: activeProjects,
      bidding: biddingProjects,
      upcoming: upcomingProjects
    };
  }, [projects]);

  // Dependency-based demand prediction
  const dependencyAnalysis = useMemo(() => {
    const upcomingDeadlines = workPackages?.filter(wp => {
      if (!wp.target_delivery) return false;
      const deliveryDate = parseISO(wp.target_delivery);
      const daysUntil = differenceInDays(deliveryDate, new Date());
      return daysUntil > 0 && daysUntil <= 60 && wp.status !== 'completed';
    }).sort((a, b) => new Date(a.target_delivery) - new Date(b.target_delivery)) || [];

    const upcomingTasks = tasks.filter(t => {
      if (t.status === 'completed' || !t.start_date) return false;
      const startDate = parseISO(t.start_date);
      const daysUntil = differenceInDays(startDate, new Date());
      return daysUntil > 0 && daysUntil <= 30;
    });

    // Calculate resource needs for upcoming critical work
    const criticalWorkload = upcomingDeadlines.slice(0, 3).map(wp => {
      const wpTasks = tasks.filter(t => t.work_package_id === wp.id && t.status !== 'completed');
      const resourceIds = new Set();
      wpTasks.forEach(t => {
        (t.assigned_resources || []).forEach(r => resourceIds.add(r));
      });
      
      return {
        workPackage: wp.name,
        deadline: wp.target_delivery,
        daysUntil: differenceInDays(parseISO(wp.target_delivery), new Date()),
        tasksRemaining: wpTasks.length,
        resourcesNeeded: resourceIds.size,
        phase: wp.phase
      };
    });

    return {
      upcomingDeadlines: upcomingDeadlines.length,
      upcomingTasks: upcomingTasks.length,
      criticalWorkload
    };
  }, [workPackages, tasks]);

  return (
    <div className="space-y-6">
      {/* Dependency-Based Alerts */}
      {dependencyAnalysis.criticalWorkload.length > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Target className="text-amber-400 mt-1" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-400 mb-3">Upcoming Critical Deliveries</h3>
                <div className="space-y-2">
                  {dependencyAnalysis.criticalWorkload.map((cw, idx) => (
                    <div key={idx} className="p-2 bg-zinc-900/50 rounded text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white">{cw.workPackage}</span>
                        <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                          {cw.daysUntil} days
                        </Badge>
                      </div>
                      <div className="text-xs text-zinc-400">
                        {cw.tasksRemaining} tasks • {cw.resourcesNeeded} resources needed • {cw.phase} phase
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecast Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="text-slate-50 text-lg font-semibold tracking-tight flex items-center gap-2">
              <TrendingUp size={18} className="text-amber-500" />
              Resource Demand Forecast
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={forecastGranularity} onValueChange={setForecastGranularity}>
                <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
                  <CalendarIcon size={14} className="mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
                <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="3month">3 Months</SelectItem>
                  <SelectItem value="6month">6 Months</SelectItem>
                  <SelectItem value="12month">12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="colorLabor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorEquipment" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="period" stroke="#a1a1aa" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#a1a1aa" />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value, name) => {
                  if (name === 'demandScore') return [`${value}/5`, 'Demand Level'];
                  if (name === 'avgUtilization') return [`${value}%`, 'Avg Utilization'];
                  if (name === 'totalLaborHours') return [`${value} hrs`, 'Labor Hours'];
                  return [value, name];
                }} />
              <Legend />
              <Area type="monotone" dataKey="labor" stroke="#3b82f6" strokeWidth={2} fill="url(#colorLabor)" name="Labor" />
              <Area type="monotone" dataKey="equipment" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorEquipment)" name="Equipment" />
              <Area type="monotone" dataKey="subcontractor" stroke="#10b981" strokeWidth={2} fill="url(#colorSub)" name="Subcontractor" />
              <Line type="monotone" dataKey="criticalTasks" stroke="#ef4444" strokeWidth={2} name="Critical Tasks" dot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
          
          {/* Peak demand indicator */}
          {forecastData.length > 0 && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} />
                <span className="font-semibold">Peak Demand Analysis</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-zinc-300">
                <div>
                  <span className="opacity-70">Labor: </span>
                  <span className="font-semibold">{Math.max(...forecastData.map(d => d.labor))} resources</span>
                </div>
                <div>
                  <span className="opacity-70">Equipment: </span>
                  <span className="font-semibold">{Math.max(...forecastData.map(d => d.equipment))} units</span>
                </div>
                <div>
                  <span className="opacity-70">Hours: </span>
                  <span className="font-semibold">{Math.max(...forecastData.map(d => d.totalLaborHours)).toLocaleString()} hrs</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resource Gap Analysis */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-slate-50 text-lg font-semibold tracking-tight flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-500" />
            Resource Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {resourceGaps.map((gap) =>
            <div key={gap.type} className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-zinc-400" />
                    <span className="font-medium text-white">{gap.type}</span>
                  </div>
                  <Badge
                  variant="outline"
                  className={
                  gap.status === 'shortage' ?
                  'bg-red-500/20 text-red-400 border-red-500/30' :
                  'bg-green-500/20 text-green-400 border-green-500/30'
                  }>

                    {gap.status === 'shortage' ? 'Shortage Expected' : 'Adequate'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500 mb-1">Current</p>
                    <p className="text-2xl font-bold text-white">{gap.current}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 mb-1">Peak Demand</p>
                    <p className="text-2xl font-bold text-white">{gap.peak}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 mb-1">Gap</p>
                    <p className={`text-2xl font-bold ${gap.gap > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {gap.gap > 0 ? `+${gap.gap}` : gap.gap}
                    </p>
                  </div>
                </div>

                {gap.gap > 0 &&
              <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                    Recommend hiring or contracting {gap.gap} additional {gap.type.toLowerCase()} resource{gap.gap !== 1 ? 's' : ''}
                  </div>
              }
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Analysis */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-slate-50 text-lg font-semibold tracking-tight flex items-center gap-2">
            <Clock size={18} className="text-amber-500" />
            Project Pipeline Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
              <p className="text-zinc-400 text-sm mb-2">Active Projects</p>
              <p className="text-3xl font-bold text-blue-400">{pipelineAnalysis.active}</p>
            </div>
            <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
              <p className="text-zinc-400 text-sm mb-2">Upcoming (3 months)</p>
              <p className="text-3xl font-bold text-amber-400">{pipelineAnalysis.upcoming}</p>
            </div>
            <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
              <p className="text-zinc-400 text-sm mb-2">In Bidding</p>
              <p className="text-3xl font-bold text-green-400">{pipelineAnalysis.bidding}</p>
            </div>
          </div>
          
          {pipelineAnalysis.upcoming > 0 &&
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-400">
              <AlertCircle size={14} className="inline mr-2" />
              {pipelineAnalysis.upcoming} project{pipelineAnalysis.upcoming !== 1 ? 's' : ''} starting in next 3 months - ensure adequate resource planning
            </div>
          }
        </CardContent>
      </Card>

      {/* Task Distribution Forecast */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-slate-50 text-lg font-semibold tracking-tight">Task Volume Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="month" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                labelStyle={{ color: '#fff' }} />

              <Bar dataKey="tasks" fill="#f59e0b" name="Active Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>);

}