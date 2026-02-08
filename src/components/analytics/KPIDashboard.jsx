import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const KPI_OPTIONS = [
  { id: 'schedule', name: 'On-Time Delivery', icon: '📅', color: 'bg-blue-500' },
  { id: 'budget', name: 'Budget Variance', icon: '💰', color: 'bg-amber-500' },
  { id: 'safety', name: 'Safety Score', icon: '🛡️', color: 'bg-green-500' },
  { id: 'quality', name: 'Quality Index', icon: '✓', color: 'bg-purple-500' },
  { id: 'rfi_velocity', name: 'RFI Resolution', icon: '⚡', color: 'bg-orange-500' },
  { id: 'co_efficiency', name: 'CO Approval Rate', icon: '✔️', color: 'bg-indigo-500' },
  { id: 'resource_util', name: 'Resource Utilization', icon: '👥', color: 'bg-pink-500' },
  { id: 'delivery_ontime', name: 'Delivery Performance', icon: '🚚', color: 'bg-teal-500' }
];

export default function KPIDashboard({ metrics = {} }) {
  const [visibleKPIs, setVisibleKPIs] = useState(['schedule', 'budget', 'safety', 'quality']);
  const [showConfig, setShowConfig] = useState(false);

  const calculateKPI = (kpiId) => {
    switch(kpiId) {
      case 'schedule':
        return { value: 87, unit: '%', trend: 2 };
      case 'budget':
        return { value: -3.2, unit: '%', trend: -1.5 };
      case 'safety':
        return { value: 98, unit: '%', trend: 1 };
      case 'quality':
        return { value: 94, unit: '%', trend: 0.5 };
      case 'rfi_velocity':
        return { value: 4.2, unit: 'days', trend: -0.8 };
      case 'co_efficiency':
        return { value: 76, unit: '%', trend: 3 };
      case 'resource_util':
        return { value: 82, unit: '%', trend: 2.5 };
      case 'delivery_ontime':
        return { value: 91, unit: '%', trend: 1.2 };
      default:
        return { value: 0, unit: '', trend: 0 };
    }
  };

  const getKPIColor = (value, kpiId) => {
    if (kpiId === 'budget') {
      return value > -5 && value < 5 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20';
    }
    if (kpiId === 'rfi_velocity') {
      return value < 7 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20';
    }
    return value >= 90 ? 'bg-green-500/10 border-green-500/20' : value >= 80 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';
  };

  const getTextColor = (value, kpiId) => {
    if (kpiId === 'budget') {
      return value > -5 && value < 5 ? 'text-green-400' : 'text-red-400';
    }
    if (kpiId === 'rfi_velocity') {
      return value < 7 ? 'text-green-400' : 'text-red-400';
    }
    return value >= 90 ? 'text-green-400' : value >= 80 ? 'text-amber-400' : 'text-red-400';
  };

  const visibleKPIData = visibleKPIs.map(id => {
    const option = KPI_OPTIONS.find(o => o.id === id);
    const kpiValue = calculateKPI(id);
    return { ...option, ...kpiValue };
  });

  return (
    <div className="space-y-4">
      {/* Header with Config */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Key Performance Indicators</h3>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => setShowConfig(true)}
          className="border-zinc-700 text-zinc-300"
        >
          <Settings size={14} className="mr-1" />
          Customize
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {visibleKPIData.map((kpi) => (
          <Card key={kpi.id} className={`border ${getKPIColor(kpi.value, kpi.id)}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{kpi.icon}</span>
                <Badge variant="outline" className={`text-[10px] ${kpi.trend > 0 ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'}`}>
                  {kpi.trend > 0 ? '↑' : '↓'} {Math.abs(kpi.trend).toFixed(1)}
                </Badge>
              </div>
              <div className="mb-1">
                <p className={`text-2xl font-bold ${getTextColor(kpi.value, kpi.id)}`}>
                  {kpi.value > 100 ? kpi.value.toFixed(1) : Math.abs(kpi.value).toFixed(1)}{kpi.unit}
                </p>
              </div>
              <p className="text-xs text-zinc-400">{kpi.name}</p>
              <div className="mt-2 w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full ${getTextColor(kpi.value, kpi.id).replace('text-', 'bg-')}`}
                  style={{ width: `${Math.min(100, Math.max(0, kpi.value))}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Customize Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {KPI_OPTIONS.map(option => (
              <label key={option.id} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded cursor-pointer hover:bg-zinc-800">
                <Checkbox 
                  checked={visibleKPIs.includes(option.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setVisibleKPIs([...visibleKPIs, option.id]);
                    } else {
                      setVisibleKPIs(visibleKPIs.filter(id => id !== option.id));
                    }
                  }}
                />
                <span className="text-2xl">{option.icon}</span>
                <span className="text-sm">{option.name}</span>
              </label>
            ))}
          </div>
          <Button 
            onClick={() => setShowConfig(false)}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black mt-4"
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}