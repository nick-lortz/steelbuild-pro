import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { differenceInDays } from 'date-fns';

export default function RFIKPIDashboard({ rfis = [] }) {
  const totalRFIs = rfis.length;
  const openRFIs = rfis.filter(r => r.status === 'pending' || r.status === 'submitted').length;
  const answeredRFIs = rfis.filter(r => r.status === 'answered' || r.status === 'closed').length;
  
  // Calculate average response time
  const answeredWithDates = rfis.filter(r => 
    (r.status === 'answered' || r.status === 'closed') && 
    r.submitted_date && 
    r.response_date
  );
  const avgResponseTime = answeredWithDates.length > 0
    ? answeredWithDates.reduce((sum, r) => {
        return sum + differenceInDays(new Date(r.response_date), new Date(r.submitted_date));
      }, 0) / answeredWithDates.length
    : 0;

  // Overdue RFIs
  const overdueRFIs = rfis.filter(r => {
    if (!r.due_date || r.status === 'answered' || r.status === 'closed') return false;
    return new Date(r.due_date) < new Date();
  }).length;

  // Critical RFIs
  const criticalRFIs = rfis.filter(r => 
    r.priority === 'critical' && (r.status === 'pending' || r.status === 'submitted')
  ).length;

  const responseRate = totalRFIs > 0 ? ((answeredRFIs / totalRFIs) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Total RFIs</p>
              <p className="text-2xl font-bold text-white">{totalRFIs}</p>
            </div>
            <TrendingUp className="text-zinc-500" size={20} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Open</p>
              <p className="text-2xl font-bold text-amber-400">{openRFIs}</p>
            </div>
            <Clock className="text-amber-500" size={20} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-500/5 border-green-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Answered</p>
              <p className="text-2xl font-bold text-green-400">{answeredRFIs}</p>
            </div>
            <CheckCircle className="text-green-500" size={20} />
          </div>
        </CardContent>
      </Card>

      <Card className={overdueRFIs > 0 ? "bg-red-500/5 border-red-500/20" : "bg-zinc-900 border-zinc-800"}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Overdue</p>
              <p className={`text-2xl font-bold ${overdueRFIs > 0 ? 'text-red-400' : 'text-white'}`}>
                {overdueRFIs}
              </p>
            </div>
            <AlertTriangle className={overdueRFIs > 0 ? "text-red-500" : "text-zinc-500"} size={20} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div>
            <p className="text-zinc-400 text-sm">Avg Response</p>
            <p className="text-2xl font-bold text-white">{avgResponseTime.toFixed(1)}d</p>
            <p className="text-xs text-zinc-500 mt-1">{responseRate.toFixed(0)}% response rate</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}