import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, parseISO } from 'date-fns';

export default function RFIHubTrends({ rfis, viewMode, selectedProjectId }) {
  // RFI Volume Over Time (Weekly)
  const volumeData = useMemo(() => {
    const weekMap = new Map();
    
    rfis.forEach(rfi => {
      if (!rfi.created_date) return;
      try {
        const date = parseISO(rfi.created_date);
        const weekStart = startOfWeek(date);
        const weekKey = format(weekStart, 'MMM d');
        
        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, { week: weekKey, created: 0, closed: 0 });
        }
        
        const entry = weekMap.get(weekKey);
        entry.created++;
        
        if (['answered', 'closed'].includes(rfi.status)) {
          entry.closed++;
        }
      } catch (e) {
        // Skip invalid dates
      }
    });
    
    return Array.from(weekMap.values()).slice(-8);
  }, [rfis]);

  // RFIs by Type
  const typeData = useMemo(() => {
    const typeCounts = {};
    
    rfis.forEach(rfi => {
      const type = rfi.rfi_type || 'other';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    return Object.entries(typeCounts).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value
    }));
  }, [rfis]);

  // RFIs by Responsible Party
  const responsibleData = useMemo(() => {
    const partyCounts = {};
    
    rfis.forEach(rfi => {
      const party = rfi.ball_in_court || 'unknown';
      partyCounts[party] = (partyCounts[party] || 0) + 1;
    });
    
    return Object.entries(partyCounts).map(([name, value]) => ({
      name,
      value
    }));
  }, [rfis]);

  // Aging Buckets
  const agingData = useMemo(() => {
    const buckets = {
      '0-7 days': 0,
      '8-14 days': 0,
      '15-30 days': 0,
      '30+ days': 0
    };
    
    rfis.forEach(rfi => {
      if (rfi.aging_bucket && buckets.hasOwnProperty(rfi.aging_bucket)) {
        buckets[rfi.aging_bucket]++;
      }
    });
    
    return Object.entries(buckets).map(([name, value]) => ({
      name,
      value
    }));
  }, [rfis]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Volume Over Time */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base uppercase tracking-wider">RFI Volume (Last 8 Weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="week" stroke="#a1a1aa" style={{ fontSize: '10px' }} />
              <YAxis stroke="#a1a1aa" style={{ fontSize: '10px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', fontSize: '12px' }} 
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Line type="monotone" dataKey="created" stroke="#3b82f6" name="Created" strokeWidth={2} />
              <Line type="monotone" dataKey="closed" stroke="#10b981" name="Closed" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* RFIs by Type */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base uppercase tracking-wider">RFIs by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="name" stroke="#a1a1aa" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#a1a1aa" style={{ fontSize: '10px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', fontSize: '12px' }} 
              />
              <Bar dataKey="value" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* RFIs by Responsible Party */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base uppercase tracking-wider">RFIs by Responsible Party</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={responsibleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
              >
                {responsibleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', fontSize: '12px' }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Aging Buckets */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base uppercase tracking-wider">RFI Aging Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="name" stroke="#a1a1aa" style={{ fontSize: '10px' }} />
              <YAxis stroke="#a1a1aa" style={{ fontSize: '10px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', fontSize: '12px' }} 
              />
              <Bar dataKey="value" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}