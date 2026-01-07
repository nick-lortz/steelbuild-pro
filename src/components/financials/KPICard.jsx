import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KPICard({ title, value, trend, trendValue, icon: Icon, variant = "default" }) {
  const bgColors = {
    default: "bg-zinc-900 border-zinc-800",
    green: "bg-green-500/5 border-green-500/20",
    red: "bg-red-500/5 border-red-500/20",
    amber: "bg-amber-500/5 border-amber-500/20",
    blue: "bg-blue-500/5 border-blue-500/20",
  };

  return (
    <Card className={`${bgColors[variant]} border`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-zinc-400 text-sm mb-1">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                trend === 'up' ? 'text-green-400' : 'text-red-400'
              }`}>
                {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="p-2 bg-zinc-800 rounded-lg">
              <Icon size={20} className="text-amber-500" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}