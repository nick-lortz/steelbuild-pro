import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { addDays, isWithinInterval, format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ResourceForecast() {
  const { data: allocations = [] } = useQuery({
    queryKey: ['resourceAllocations'],
    queryFn: () => base44.entities.ResourceAllocation.list(),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list(),
  });

  // Forecast next 4 weeks
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const weekStart = addDays(new Date(), i * 7);
    const weekEnd = addDays(weekStart, 6);
    return { weekStart, weekEnd, label: format(weekStart, 'MMM d') };
  });

  const forecastData = weeks.map(week => {
    const activeAllocations = allocations.filter(a => {
      try {
        return isWithinInterval(week.weekStart, {
          start: new Date(a.start_date),
          end: new Date(a.end_date)
        });
      } catch {
        return false;
      }
    });

    const totalAllocated = activeAllocations.length;
    const laborAllocated = activeAllocations.filter(a => {
      const resource = resources.find(r => r.id === a.resource_id);
      return resource?.type === 'labor';
    }).length;
    const equipmentAllocated = activeAllocations.filter(a => {
      const resource = resources.find(r => r.id === a.resource_id);
      return resource?.type === 'equipment';
    }).length;

    return {
      week: week.label,
      labor: laborAllocated,
      equipment: equipmentAllocated,
      total: totalAllocated
    };
  });

  const avgAllocation = forecastData.reduce((sum, d) => sum + d.total, 0) / forecastData.length;
  const peakWeek = forecastData.reduce((max, d) => d.total > max.total ? d : max, forecastData[0]);

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={18} />
            Resource Demand Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="week" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
              />
              <Bar dataKey="labor" fill="#3b82f6" name="Labor" />
              <Bar dataKey="equipment" fill="#8b5cf6" name="Equipment" />
            </BarChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 bg-zinc-800/50 rounded">
              <p className="text-xs text-zinc-500">Avg Weekly Allocation</p>
              <p className="text-xl font-bold text-white">{avgAllocation.toFixed(1)}</p>
            </div>
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded">
              <p className="text-xs text-zinc-500">Peak Week</p>
              <p className="text-xl font-bold text-amber-400">{peakWeek.week}</p>
              <p className="text-xs text-zinc-500">{peakWeek.total} resources</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}