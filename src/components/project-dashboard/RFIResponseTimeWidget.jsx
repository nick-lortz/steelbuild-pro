import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MessageSquareWarning, TrendingUp } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';

export default function RFIResponseTimeWidget({ rfis }) {
  const responseData = useMemo(() => {
    const answeredRfis = rfis.filter(r => 
      r.status === 'answered' && r.submitted_date && r.response_date
    );

    const responseTimes = answeredRfis.map(rfi => {
      const submitted = new Date(rfi.submitted_date);
      const responded = new Date(rfi.response_date);
      const days = differenceInDays(responded, submitted);
      
      return {
        rfi_number: rfi.rfi_number,
        days,
        submitted_date: rfi.submitted_date,
        priority: rfi.priority,
      };
    }).sort((a, b) => new Date(a.submitted_date) - new Date(b.submitted_date));

    // Group by month for trend
    const monthlyData = new Map();
    responseTimes.forEach(rt => {
      const month = format(new Date(rt.submitted_date), 'MMM yyyy');
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { month, times: [], count: 0 });
      }
      const data = monthlyData.get(month);
      data.times.push(rt.days);
      data.count++;
    });

    const trendData = Array.from(monthlyData.values()).map(item => ({
      month: item.month,
      avgDays: item.times.reduce((sum, t) => sum + t, 0) / item.times.length,
      count: item.count,
    }));

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, rt) => sum + rt.days, 0) / responseTimes.length
      : 0;

    const criticalRfis = rfis.filter(r => 
      r.priority === 'critical' && (r.status === 'pending' || r.status === 'submitted')
    );

    return {
      responseTimes,
      trendData,
      avgResponseTime,
      criticalRfis,
      totalAnswered: answeredRfis.length,
    };
  }, [rfis]);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <MessageSquareWarning size={18} className="text-purple-500" />
          RFI Response Times
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-zinc-800 rounded-lg">
            <p className="text-zinc-400 text-sm mb-1">Average Response Time</p>
            <p className="text-2xl font-bold text-white">
              {responseData.avgResponseTime.toFixed(1)} days
            </p>
          </div>
          <div className="p-4 bg-zinc-800 rounded-lg">
            <p className="text-zinc-400 text-sm mb-1">Total Answered</p>
            <p className="text-2xl font-bold text-green-400">
              {responseData.totalAnswered}
            </p>
          </div>
          <div className="p-4 bg-zinc-800 rounded-lg">
            <p className="text-zinc-400 text-sm mb-1">Critical Pending</p>
            <p className="text-2xl font-bold text-red-400">
              {responseData.criticalRfis.length}
            </p>
          </div>
        </div>

        {/* Trend Chart */}
        {responseData.trendData.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-zinc-400 mb-3">Response Time Trend</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={responseData.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="month" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                  formatter={(value) => `${value.toFixed(1)} days`}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgDays" 
                  stroke="#a855f7" 
                  strokeWidth={2}
                  dot={{ fill: '#a855f7', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Response Times */}
        <div>
          <p className="text-sm text-zinc-400 mb-3">Recent RFIs (Last 10)</p>
          <div className="space-y-2">
            {responseData.responseTimes.slice(-10).reverse().map((rt) => (
              <div 
                key={rt.rfi_number} 
                className="flex items-center justify-between p-2 bg-zinc-800 rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-amber-500 text-sm">
                    RFI-{String(rt.rfi_number).padStart(3, '0')}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    rt.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                    rt.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-zinc-700 text-zinc-400'
                  }`}>
                    {rt.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    rt.days <= 3 ? 'text-green-400' :
                    rt.days <= 7 ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {rt.days} days
                  </span>
                  {rt.days <= 3 && <TrendingUp size={14} className="text-green-400" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}