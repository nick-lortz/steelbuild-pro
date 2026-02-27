import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Wrench, Package, Truck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const PHASE_OPTIONS = [
  { value: 'all', label: 'All Phases', icon: null },
  { value: 'fabrication', label: 'Fabrication', icon: Wrench },
  { value: 'delivery', label: 'Delivery', icon: Truck },
  { value: 'erection', label: 'Erection', icon: Package }
];

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All Severity' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

const METRICS = [
  { id: 'cost', label: 'Cost' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'risk', label: 'Risk Mitigation' }
];

export default function DashboardFilters({ filters, setFilters }) {
  const toggleMetric = (id) => {
    const updated = filters.metricsFocus.includes(id)
      ? filters.metricsFocus.filter(m => m !== id)
      : [...filters.metricsFocus, id];
    setFilters({ ...filters, metricsFocus: updated });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Phase Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase">Phase</span>
        <Select value={filters.phase} onValueChange={(v) => setFilters({ ...filters, phase: v })}>
          <SelectTrigger className="h-8 w-32 bg-zinc-900 border-zinc-700 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {PHASE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Schedule Impact Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase">Schedule Impact</span>
        <Select value={filters.scheduleImpact} onValueChange={(v) => setFilters({ ...filters, scheduleImpact: v })}>
          <SelectTrigger className="h-8 w-36 bg-zinc-900 border-zinc-700 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {SEVERITY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase">Show</span>
        {METRICS.map(metric => (
          <Button
            key={metric.id}
            size="sm"
            variant={filters.metricsFocus.includes(metric.id) ? 'default' : 'outline'}
            onClick={() => toggleMetric(metric.id)}
            className="h-7 px-2 text-xs"
          >
            {metric.label}
          </Button>
        ))}
      </div>

      {/* Alerts Toggle */}
      <Button
        size="sm"
        variant={filters.showAlerts ? 'default' : 'outline'}
        onClick={() => setFilters({ ...filters, showAlerts: !filters.showAlerts })}
        className="h-7 px-2 text-xs"
      >
        <AlertTriangle className="w-3 h-3 mr-1.5" />
        Alerts
      </Button>
    </div>
  );
}