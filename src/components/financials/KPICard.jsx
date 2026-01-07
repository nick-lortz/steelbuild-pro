import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KPICard({ title, value, trend, trendValue, icon: Icon, variant = "default" }) {
  const bgColors = {
    default: "bg-white border-slate-200",
    green: "bg-emerald-50 border-emerald-200",
    red: "bg-red-50 border-red-200",
    amber: "bg-amber-50 border-amber-200",
    blue: "bg-blue-50 border-blue-200",
  };

  return (
    <Card className={`${bgColors[variant]} border`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-slate-500 text-sm mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                trend === 'up' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="p-2 bg-slate-100 rounded-lg">
              <Icon size={20} className="text-amber-500" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}