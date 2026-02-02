import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, subWeeks } from 'date-fns';

export default function RFITrendChart({ rfis }) {
  const chartData = useMemo(() => {
    const weeks = [];
    const now = new Date();
    
    // Last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i));
      weeks.push({
        week: format(weekStart, 'MMM d'),
        created: 0,
        closed: 0
      });
    }
    
    rfis.forEach(rfi => {
      const createdDate = new Date(rfi.created_date);
      const weekIndex = weeks.findIndex(w => {
        const weekStart = new Date(w.week + ', ' + createdDate.getFullYear());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return createdDate >= weekStart && createdDate < weekEnd;
      });
      
      if (weekIndex >= 0) {
        weeks[weekIndex].created++;
      }
      
      if (rfi.closed_date) {
        const closedDate = new Date(rfi.closed_date);
        const closedWeekIndex = weeks.findIndex(w => {
          const weekStart = new Date(w.week + ', ' + closedDate.getFullYear());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          return closedDate >= weekStart && closedDate < weekEnd;
        });
        
        if (closedWeekIndex >= 0) {
          weeks[closedWeekIndex].closed++;
        }
      }
    });
    
    return weeks;
  }, [rfis]);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base uppercase tracking-wider">8-Week Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis 
              dataKey="week" 
              stroke="#a1a1aa" 
              tick={{ fontSize: 11 }}
            />
            <YAxis stroke="#a1a1aa" tick={{ fontSize: 11 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#18181b', 
                border: '1px solid #3f3f46',
                borderRadius: '6px'
              }}
            />
            <Bar dataKey="created" fill="#3b82f6" name="Created" />
            <Bar dataKey="closed" fill="#10b981" name="Closed" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}