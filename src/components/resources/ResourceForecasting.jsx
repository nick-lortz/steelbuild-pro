import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, CheckCircle2, Calendar, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { format, addMonths, addWeeks, parseISO, isWithinInterval, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';

export default function ResourceForecasting({ projects, resources, allocations, tasks }) {
  const forecast = useMemo(() => {
    const today = new Date();
    const next3Months = addMonths(today, 3);
    const next6Months = addMonths(today, 6);

    // Get pipeline projects (bidding, awarded, in_progress)
    const pipelineProjects = projects.filter(p => 
      ['bidding', 'awarded', 'in_progress'].includes(p.status)
    );

    // Build monthly timeline forecast (next 6 months)
    const monthlyTimeline = [];
    for (let i = 0; i < 6; i++) {
      const monthStart = startOfMonth(addMonths(today, i));
      const monthEnd = endOfMonth(addMonths(today, i));
      
      const monthData = {
        month: format(monthStart, 'MMM yyyy'),
        start: monthStart,
        end: monthEnd,
        demandByType: {},
        projects: []
      };

      // Calculate demand per month based on task scheduling
      pipelineProjects.forEach(project => {
        const projectStart = project.start_date ? parseISO(project.start_date) : today;
        const projectEnd = project.target_completion ? parseISO(project.target_completion) : addMonths(projectStart, 6);
        
        // Check if project overlaps this month
        if (isWithinInterval(monthStart, { start: projectStart, end: projectEnd }) ||
            isWithinInterval(monthEnd, { start: projectStart, end: projectEnd }) ||
            isWithinInterval(projectStart, { start: monthStart, end: monthEnd })) {
          
          monthData.projects.push(project);
          
          const tonnage = project.rough_square_footage 
            ? Math.round(project.rough_square_footage * 0.012)
            : 100;
          
          const phase = project.phase || 'fabrication';
          const needsByPhase = {
            detailing: { labor: Math.ceil(tonnage / 500) },
            fabrication: { 
              labor: Math.ceil(tonnage / 50),
              equipment: Math.ceil(tonnage / 200)
            },
            erection: { 
              labor: Math.ceil(tonnage / 30),
              equipment: Math.ceil(tonnage / 300),
              subcontractor: Math.ceil(tonnage / 150)
            }
          };
          
          const phaseNeeds = needsByPhase[phase] || needsByPhase.fabrication;
          Object.entries(phaseNeeds).forEach(([type, count]) => {
            if (!monthData.demandByType[type]) monthData.demandByType[type] = 0;
            monthData.demandByType[type] += count;
          });
        }
      });
      
      monthlyTimeline.push(monthData);
    }

    // Calculate resource demand by type and phase
    const demandByType = {};
    const demandByPhase = {
      detailing: {},
      fabrication: {},
      erection: {}
    };

    pipelineProjects.forEach(project => {
      const startDate = project.start_date ? parseISO(project.start_date) : today;
      const isUpcoming = startDate <= next3Months;
      const phase = project.phase || 'fabrication';

      // Estimate resource needs based on project scope
      const tonnage = project.rough_square_footage 
        ? Math.round(project.rough_square_footage * 0.012) // ~12 lbs/sqft typical
        : 100;

      // Phase-specific crew needs
      const needsByPhase = {
        detailing: {
          labor: Math.ceil(tonnage / 500), // Detailer capacity
        },
        fabrication: {
          labor: Math.ceil(tonnage / 50), // Fab crew size
          equipment: Math.ceil(tonnage / 200), // Welding/cutting equipment
        },
        erection: {
          labor: Math.ceil(tonnage / 30), // Field crew size
          equipment: Math.ceil(tonnage / 300), // Crane needs
          subcontractor: Math.ceil(tonnage / 150), // Specialty subs
        }
      };

      const phaseNeeds = needsByPhase[phase] || needsByPhase.fabrication;

      Object.entries(phaseNeeds).forEach(([type, count]) => {
        if (!demandByType[type]) demandByType[type] = { current: 0, upcoming: 0, total: 0 };
        if (!demandByPhase[phase][type]) demandByPhase[phase][type] = 0;

        if (project.status === 'in_progress') {
          demandByType[type].current += count;
        } else if (isUpcoming) {
          demandByType[type].upcoming += count;
        }
        demandByType[type].total += count;
        demandByPhase[phase][type] += count;
      });
    });

    // Calculate current capacity
    const capacityByType = {};
    const availableCapacityByType = {};
    resources.forEach(r => {
      if (r.status === 'available' || r.status === 'assigned') {
        if (!capacityByType[r.type]) capacityByType[r.type] = 0;
        capacityByType[r.type]++;
        
        if (r.status === 'available') {
          if (!availableCapacityByType[r.type]) availableCapacityByType[r.type] = 0;
          availableCapacityByType[r.type]++;
        }
      }
    });

    // Identify gaps and surpluses
    const gaps = [];
    const surpluses = [];
    Object.entries(demandByType).forEach(([type, demand]) => {
      const capacity = capacityByType[type] || 0;
      const available = availableCapacityByType[type] || 0;
      const delta = capacity - demand.upcoming;
      
      if (delta < 0) {
        gaps.push({
          type,
          current_capacity: capacity,
          available_now: available,
          needed_next_3mo: demand.upcoming,
          shortfall: Math.abs(delta),
          severity: Math.abs(delta) > 5 ? 'critical' : Math.abs(delta) > 2 ? 'high' : 'moderate'
        });
      } else if (delta > 3 && demand.upcoming > 0) {
        surpluses.push({
          type,
          current_capacity: capacity,
          needed_next_3mo: demand.upcoming,
          surplus: delta
        });
      }
    });

    // Historical utilization analysis (last 90 days)
    const last90Days = addMonths(today, -3);
    const historicalAllocations = allocations.filter(a => {
      const endDate = a.end_date ? parseISO(a.end_date) : today;
      return endDate >= last90Days;
    });

    const utilizationByType = {};
    const utilizationTrend = {};
    resources.forEach(r => {
      const resourceAllocations = historicalAllocations.filter(ra => ra.resource_id === r.id);
      const avgAllocation = resourceAllocations.length > 0
        ? resourceAllocations.reduce((sum, ra) => sum + (ra.allocation_percentage || 100), 0) / resourceAllocations.length
        : 0;

      if (!utilizationByType[r.type]) {
        utilizationByType[r.type] = { total: 0, count: 0, peakDemand: 0 };
        utilizationTrend[r.type] = { recent: 0, historical: 0 };
      }
      utilizationByType[r.type].total += avgAllocation;
      utilizationByType[r.type].count++;
      
      // Track peak demand
      const recentTasks = tasks.filter(t => 
        (t.assigned_resources || []).includes(r.id) || 
        (t.assigned_equipment || []).includes(r.id)
      );
      utilizationByType[r.type].peakDemand = Math.max(
        utilizationByType[r.type].peakDemand,
        recentTasks.length
      );
    });

    // Calculate task-based demand forecast
    const upcomingTasks = tasks.filter(t => {
      if (!t.start_date || t.status === 'completed') return false;
      const startDate = parseISO(t.start_date);
      return startDate <= next3Months;
    });

    const taskBasedDemand = {};
    upcomingTasks.forEach(task => {
      ['assigned_resources', 'assigned_equipment'].forEach(field => {
        (task[field] || []).forEach(resourceId => {
          const resource = resources.find(r => r.id === resourceId);
          if (resource) {
            if (!taskBasedDemand[resource.type]) taskBasedDemand[resource.type] = 0;
            taskBasedDemand[resource.type]++;
          }
        });
      });
    });

    return {
      demandByType,
      demandByPhase,
      capacityByType,
      availableCapacityByType,
      gaps: gaps.sort((a, b) => b.shortfall - a.shortfall),
      surpluses: surpluses.sort((a, b) => b.surplus - a.surplus),
      monthlyTimeline,
      taskBasedDemand,
      utilizationByType: Object.entries(utilizationByType).map(([type, data]) => ({
        type,
        avg_utilization: Math.round(data.total / data.count),
        peak_concurrent: data.peakDemand
      }))
    };
  }, [projects, resources, allocations, tasks]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-amber-500 text-black';
      case 'moderate': return 'bg-yellow-500 text-black';
      default: return 'bg-zinc-600 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">Critical Gaps</p>
                <p className="text-2xl font-bold text-red-400 mt-1">
                  {forecast.gaps.filter(g => g.severity === 'critical').length}
                </p>
              </div>
              <AlertTriangle className="text-red-400" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">Total Shortfalls</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">
                  {forecast.gaps.reduce((sum, g) => sum + g.shortfall, 0)}
                </p>
              </div>
              <ArrowUp className="text-amber-400" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">Surplus Resources</p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {forecast.surpluses.reduce((sum, s) => sum + s.surplus, 0)}
                </p>
              </div>
              <ArrowDown className="text-green-400" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">Pipeline Projects</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">
                  {projects.filter(p => ['bidding', 'awarded', 'in_progress'].includes(p.status)).length}
                </p>
              </div>
              <Calendar className="text-blue-400" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Timeline Forecast */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar size={20} className="text-amber-500" />
            6-Month Resource Demand Forecast
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Projected demand by resource type across project pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {forecast.monthlyTimeline.map((month, idx) => (
              <div key={idx} className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">{month.month}</h4>
                    <p className="text-xs text-zinc-400">{month.projects.length} active projects</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {Object.values(month.demandByType).reduce((sum, val) => sum + val, 0)} total resources needed
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(month.demandByType).map(([type, demand]) => {
                    const capacity = forecast.capacityByType[type] || 0;
                    const isShort = demand > capacity;
                    return (
                      <div key={type} className={`p-2 rounded border ${isShort ? 'bg-red-950/30 border-red-900/50' : 'bg-zinc-900 border-zinc-700'}`}>
                        <p className="text-xs text-zinc-400 capitalize mb-1">{type}</p>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${isShort ? 'text-red-400' : 'text-white'}`}>
                            {demand}
                          </span>
                          <span className="text-xs text-zinc-500">/ {capacity}</span>
                        </div>
                        {isShort && (
                          <p className="text-xs text-red-400 mt-1">Short {demand - capacity}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resource Gaps */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" />
            Critical Resource Shortfalls (Next 3 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {forecast.gaps.length === 0 ? (
            <div className="flex items-center gap-2 text-green-400 text-sm p-4 bg-green-950/20 rounded border border-green-900/50">
              <CheckCircle2 size={16} />
              <span>Current capacity meets pipeline demand</span>
            </div>
          ) : (
            <div className="space-y-3">
              {forecast.gaps.map((gap, idx) => (
                <div key={idx} className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle size={18} className={gap.severity === 'critical' ? 'text-red-500' : 'text-amber-500'} />
                        <div>
                          <p className="text-sm font-bold text-white capitalize">{gap.type}</p>
                          <p className="text-xs text-zinc-400">
                            Available now: {gap.available_now} | Total capacity: {gap.current_capacity} | Pipeline need: {gap.needed_next_3mo}
                          </p>
                        </div>
                      </div>
                      <div className="ml-7 mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-3 bg-zinc-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500" 
                              style={{ width: `${Math.min((gap.current_capacity / gap.needed_next_3mo) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-400 whitespace-nowrap">
                            {Math.round((gap.current_capacity / gap.needed_next_3mo) * 100)}% covered
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge className={getSeverityColor(gap.severity)}>
                      Need {gap.shortfall} more
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resource Surpluses */}
      {forecast.surpluses.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ArrowDown size={20} className="text-green-500" />
              Resource Surpluses (Reallocation Opportunities)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {forecast.surpluses.map((surplus, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-800 rounded border border-zinc-700">
                  <div>
                    <p className="text-sm font-medium text-white capitalize">{surplus.type}</p>
                    <p className="text-xs text-zinc-400">
                      Capacity: {surplus.current_capacity} | Demand: {surplus.needed_next_3mo}
                    </p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    +{surplus.surplus} available
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase-Based Demand */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users size={20} className="text-amber-500" />
            Demand by Project Phase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(forecast.demandByPhase).map(([phase, types]) => (
              <div key={phase} className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                <h4 className="text-xs font-bold uppercase tracking-wide text-amber-500 mb-3">
                  {phase}
                </h4>
                <div className="space-y-2">
                  {Object.entries(types).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-xs text-zinc-300 capitalize">{type}</span>
                      <span className="text-sm font-bold text-white">{count}</span>
                    </div>
                  ))}
                  {Object.keys(types).length === 0 && (
                    <p className="text-xs text-zinc-500 italic">No demand</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Historical Utilization */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-amber-500" />
            Historical Utilization (Last 90 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {forecast.utilizationByType.map(({ type, avg_utilization, peak_concurrent }) => (
              <div key={type} className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                <p className="text-xs text-zinc-400 capitalize mb-2">{type}</p>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-500">Avg Utilization</span>
                      <span className="text-xs font-medium text-white">{avg_utilization}%</span>
                    </div>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          avg_utilization > 80 ? 'bg-red-500' :
                          avg_utilization > 60 ? 'bg-amber-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(avg_utilization, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Peak Tasks</span>
                    <span className="text-white font-medium">{peak_concurrent}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}