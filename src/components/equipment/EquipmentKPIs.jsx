import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity, DollarSign, Clock } from 'lucide-react';

export default function EquipmentKPIs({ bookings, equipment }) {
  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => b.status === 'in_use' || b.status === 'confirmed').length;
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_cost || 0), 0);
  
  // Calculate utilization rate (active days / total days in period)
  const daysInPeriod = 30;
  const activeDays = bookings.filter(b => b.status === 'in_use').reduce((sum, b) => {
    if (!b.start_date || !b.end_date) return sum;
    const days = Math.ceil((new Date(b.end_date) - new Date(b.start_date)) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);
  const utilizationRate = ((activeDays / daysInPeriod) * 100).toFixed(1);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Utilization</p>
              <p className="text-2xl font-bold text-white">{utilizationRate}%</p>
            </div>
            <Activity className="text-amber-500" size={20} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Active Bookings</p>
              <p className="text-2xl font-bold text-white">{activeBookings}</p>
            </div>
            <Clock className="text-blue-500" size={20} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Total Bookings</p>
              <p className="text-2xl font-bold text-white">{totalBookings}</p>
            </div>
            <TrendingUp className="text-green-500" size={20} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Revenue</p>
              <p className="text-2xl font-bold text-white">${totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="text-purple-500" size={20} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}