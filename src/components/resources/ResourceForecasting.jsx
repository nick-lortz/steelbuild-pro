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
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp size={20} className="text-amber-500" />
          Resource Forecasting
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Pipeline demand vs current capacity (next 3 months)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resource Gaps */}
        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Resource Shortfalls</h3>
          {forecast.gaps.length === 0 ? (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle2 size={16} />
              <span>Current capacity meets pipeline demand</span>
            </div>
          ) : (
            <div className="space-y-2">
              {forecast.gaps.map((gap, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-800 rounded border border-zinc-700">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-white capitalize">{gap.type}</p>
                      <p className="text-xs text-zinc-400">
                        Current: {gap.current_capacity} | Needed: {gap.needed_next_3mo}
                      </p>
                    </div>
                  </div>
                  <Badge className={getSeverityColor(gap.severity)}>
                    Short {gap.shortfall} {gap.type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phase-Based Demand */}
        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Demand by Phase</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(forecast.demandByPhase).map(([phase, types]) => (
              <div key={phase} className="p-3 bg-zinc-800 rounded border border-zinc-700">
                <h4 className="text-xs font-bold uppercase tracking-wide text-amber-500 mb-2">
                  {phase}
                </h4>
                <div className="space-y-1">
                  {Object.entries(types).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-xs">
                      <span className="text-zinc-300 capitalize">{type}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                  ))}
                  {Object.keys(types).length === 0 && (
                    <p className="text-xs text-zinc-500">No demand</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Utilization Trends */}
        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Avg Utilization (Last 30 Days)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {forecast.utilizationByType.map(({ type, avg_utilization }) => (
              <div key={type} className="p-3 bg-zinc-800 rounded border border-zinc-700">
                <p className="text-xs text-zinc-400 capitalize mb-1">{type}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        avg_utilization > 80 ? 'bg-red-500' :
                        avg_utilization > 60 ? 'bg-amber-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(avg_utilization, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-white">{avg_utilization}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}