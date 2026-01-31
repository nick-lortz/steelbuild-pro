import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';
import { format, subDays, parseISO, startOfDay } from 'date-fns';

export default function TaskCompletionTrend({ tasks, projects }) {
  const [selectedDate, setSelectedDate] = useState(null);

  const trendData = useMemo(() => {
    const last30Days = [];
    const today = startOfDay(new Date());
    
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Count tasks completed by this date
      const completedByDate = tasks.filter(t => {
        if (t.status !== 'completed' || !t.updated_date) return false;
        try {
          const completedDate = startOfDay(parseISO(t.updated_date));
          return completedDate <= date;
        } catch {
          return false;
        }
      }).length;

      // Count total active tasks at this date
      const activeAtDate = tasks.filter(t => {
        try {
          const createdDate = startOfDay(parseISO(t.created_date));
          return createdDate <= date;
        } catch {
          return false;
        }
      }).length;

      const completionRate = activeAtDate > 0 ? (completedByDate / activeAtDate * 100) : 0;

      last30Days.push({
        date: dateStr,
        displayDate: format(date, 'MMM dd'),
        completed: completedByDate,
        total: activeAtDate,
        completionRate: parseFloat(completionRate.toFixed(1)),
        tasksData: tasks.filter(t => {
          try {
            const tDate = startOfDay(parseISO(t.updated_date || t.created_date));
            return format(tDate, 'yyyy-MM-dd') === dateStr;
          } catch {
            return false;
          }
        })
      });
    }

    return last30Days;
  }, [tasks]);

  const handlePointClick = (data) => {
    setSelectedDate(data);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-white mb-2">{data.displayDate}</p>
          <p className="text-xs text-green-400">
            Completed: {data.completed}
          </p>
          <p className="text-xs text-amber-400">
            Total: {data.total}
          </p>
          <p className="text-xs text-blue-400">
            Rate: {data.completionRate}%
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">Click for task details</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Task Completion Trend (30 Days)
          </CardTitle>
          <p className="text-xs text-zinc-500">Click any point for daily task breakdown</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis 
                dataKey="displayDate" 
                stroke="#a1a1aa" 
                tick={{ fill: '#a1a1aa', fontSize: 10 }}
                interval={4}
              />
              <YAxis 
                stroke="#a1a1aa" 
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                label={{ value: 'Completion Rate (%)', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line 
                type="monotone" 
                dataKey="completionRate" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Completion Rate %"
                dot={{ fill: '#10b981', r: 4, cursor: 'pointer' }}
                activeDot={{ r: 6, onClick: (e, payload) => handlePointClick(payload.payload) }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Drill-down Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 text-white max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tasks - {selectedDate?.displayDate}</DialogTitle>
          </DialogHeader>
          
          {selectedDate && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="p-4">
                    <p className="text-xs text-zinc-400 mb-1">Completed</p>
                    <p className="text-2xl font-bold text-green-400">{selectedDate.completed}</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardContent className="p-4">
                    <p className="text-xs text-zinc-400 mb-1">Total</p>
                    <p className="text-2xl font-bold text-amber-400">{selectedDate.total}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/10 border-blue-500/30">
                  <CardContent className="p-4">
                    <p className="text-xs text-zinc-400 mb-1">Rate</p>
                    <p className="text-2xl font-bold text-blue-400">{selectedDate.completionRate}%</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3">Tasks Active on This Day</h4>
                {selectedDate.tasksData.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedDate.tasksData.map(task => {
                      const project = projects.find(p => p.id === task.project_id);
                      return (
                        <div key={task.id} className="p-3 bg-zinc-800/50 rounded border border-zinc-700">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{task.name}</p>
                              {project && (
                                <p className="text-xs text-zinc-500 mt-1">
                                  {project.project_number} - {project.name}
                                </p>
                              )}
                            </div>
                            <Badge className={task.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}>
                              {task.status}
                            </Badge>
                          </div>
                          {task.end_date && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
                              <Clock size={12} />
                              Due: {format(parseISO(task.end_date), 'MMM dd, yyyy')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 text-center py-8">No tasks active on this day</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}