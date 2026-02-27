import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

export default function TrendChart({ data, timeframe, metrics }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500">
        <p>No trend data available</p>
      </div>
    );
  }

  const timeframeLabel = timeframe === 'daily' ? 'Daily' : timeframe === 'weekly' ? 'Weekly' : 'Monthly';

  return (
    <div className="space-y-4">
      {/* Cost Trend */}
      {metrics.includes('cost') && (
        <div>
          <h4 className="text-xs font-semibold text-zinc-300 mb-2">Budget Burn Rate ({timeframeLabel})</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="period" stroke="#71717a" style={{ fontSize: '10px' }} />
              <YAxis stroke="#71717a" style={{ fontSize: '10px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px' }}
                labelStyle={{ color: '#fafafa' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
              <Line type="monotone" dataKey="budget" stroke="#3b82f6" strokeWidth={2} dot={false} name="Budget Spent" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Schedule Trend */}
      {metrics.includes('schedule') && (
        <div>
          <h4 className="text-xs font-semibold text-zinc-300 mb-2">Schedule Progress ({timeframeLabel})</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="period" stroke="#71717a" style={{ fontSize: '10px' }} />
              <YAxis stroke="#71717a" style={{ fontSize: '10px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px' }}
                labelStyle={{ color: '#fafafa' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
              <Bar dataKey="schedule" fill="#10b981" name="Progress %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* RFI Risk Trend */}
      {metrics.includes('risk') && (
        <div>
          <h4 className="text-xs font-semibold text-zinc-300 mb-2">Open RFI Count ({timeframeLabel})</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="period" stroke="#71717a" style={{ fontSize: '10px' }} />
              <YAxis stroke="#71717a" style={{ fontSize: '10px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px' }}
                labelStyle={{ color: '#fafafa' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
              <Line type="monotone" dataKey="rfi" stroke="#ef4444" strokeWidth={2} dot={false} name="Open RFIs" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}