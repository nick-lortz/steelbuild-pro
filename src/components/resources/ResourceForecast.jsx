import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, Users, Clock } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ResourceForecast({ tasks, resources, projects }) {
  // Calculate resource demand forecast for next 6 months
  const forecastData = useMemo(() => {
    const months = [];
    const today = new Date();

    // Generate 6 months of data
    for (let i = 0; i < 6; i++) {
      const monthDate = addMonths(today, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // Count resources needed in this month
      const activeTasks = tasks.filter(task => {
        if (!task.start_date || !task.end_date) return false;
        if (task.status === 'completed' || task.status === 'cancelled') return false;

        const taskStart = parseISO(task.start_date);
        const taskEnd = parseISO(task.end_date);

        return (
          isWithinInterval(taskStart, { start: monthStart, end: monthEnd }) ||
          isWithinInterval(taskEnd, { start: monthStart, end: monthEnd }) ||
          (taskStart <= monthStart && taskEnd >= monthEnd)
        );
      });

      // Calculate resource demand by type
      const laborNeeded = new Set();
      const equipmentNeeded = new Set();
      const subcontractorNeeded = new Set();

      activeTasks.forEach(task => {
        (task.assigned_resources || []).forEach(resId => {
          const resource = resources.find(r => r.id === resId);
          if (resource) {
            if (resource.type === 'labor') laborNeeded.add(resId);
            if (resource.type === 'equipment') equipmentNeeded.add(resId);
            if (resource.type === 'subcontractor') subcontractorNeeded.add(resId);
          }
        });

        (task.assigned_equipment || []).forEach(resId => {
          equipmentNeeded.add(resId);
        });
      });

      months.push({
        month: format(monthDate, 'MMM yyyy'),
        labor: laborNeeded.size,
        equipment: equipmentNeeded.size,
        subcontractor: subcontractorNeeded.size,
        total: laborNeeded.size + equipmentNeeded.size + subcontractorNeeded.size,
        tasks: activeTasks.length,
      });
    }

    return months;
  }, [tasks, resources]);

  // Calculate resource gaps
  const resourceGaps = useMemo(() => {
    const currentResources = {
      labor: resources.filter(r => r.type === 'labor' && r.status !== 'unavailable').length,
      equipment: resources.filter(r => r.type === 'equipment' && r.status !== 'unavailable').length,
      subcontractor: resources.filter(r => r.type === 'subcontractor' && r.status !== 'unavailable').length,
    };

    const peakDemand = {
      labor: Math.max(...forecastData.map(m => m.labor)),
      equipment: Math.max(...forecastData.map(m => m.equipment)),
      subcontractor: Math.max(...forecastData.map(m => m.subcontractor)),
    };

    return [
      {
        type: 'Labor',
        current: currentResources.labor,
        peak: peakDemand.labor,
        gap: Math.max(0, peakDemand.labor - currentResources.labor),
        status: peakDemand.labor > currentResources.labor ? 'shortage' : 'adequate',
      },
      {
        type: 'Equipment',
        current: currentResources.equipment,
        peak: peakDemand.equipment,
        gap: Math.max(0, peakDemand.equipment - currentResources.equipment),
        status: peakDemand.equipment > currentResources.equipment ? 'shortage' : 'adequate',
      },
      {
        type: 'Subcontractor',
        current: currentResources.subcontractor,
        peak: peakDemand.subcontractor,
        gap: Math.max(0, peakDemand.subcontractor - currentResources.subcontractor),
        status: peakDemand.subcontractor > currentResources.subcontractor ? 'shortage' : 'adequate',
      },
    ];
  }, [forecastData, resources]);

  // Project pipeline analysis
  const pipelineAnalysis = useMemo(() => {
    const activeProjects = projects.filter(p => 
      p.status === 'in_progress' || p.status === 'awarded'
    ).length;

    const biddingProjects = projects.filter(p => p.status === 'bidding').length;

    const upcomingProjects = projects.filter(p => {
      if (p.status !== 'awarded' || !p.start_date) return false;
      const startDate = parseISO(p.start_date);
      return startDate > new Date() && startDate <= addMonths(new Date(), 3);
    }).length;

    return {
      active: activeProjects,
      bidding: biddingProjects,
      upcoming: upcomingProjects,
    };
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* Forecast Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp size={18} className="text-amber-500" />
            6-Month Resource Demand Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="month" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="labor" stroke="#3b82f6" strokeWidth={2} name="Labor" />
              <Line type="monotone" dataKey="equipment" stroke="#8b5cf6" strokeWidth={2} name="Equipment" />
              <Line type="monotone" dataKey="subcontractor" stroke="#10b981" strokeWidth={2} name="Subcontractor" />
              <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={3} name="Total" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Resource Gap Analysis */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-500" />
            Resource Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {resourceGaps.map(gap => (
              <div key={gap.type} className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-zinc-400" />
                    <span className="font-medium text-white">{gap.type}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      gap.status === 'shortage'
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : 'bg-green-500/20 text-green-400 border-green-500/30'
                    }
                  >
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

                {gap.gap > 0 && (
                  <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                    Recommend hiring or contracting {gap.gap} additional {gap.type.toLowerCase()} resource{gap.gap !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Analysis */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
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
          
          {pipelineAnalysis.upcoming > 0 && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-400">
              <AlertCircle size={14} className="inline mr-2" />
              {pipelineAnalysis.upcoming} project{pipelineAnalysis.upcoming !== 1 ? 's' : ''} starting in next 3 months - ensure adequate resource planning
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Distribution Forecast */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">Task Volume Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="month" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="tasks" fill="#f59e0b" name="Active Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}