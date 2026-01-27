import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X } from 'lucide-react';
import { addWeeks, format } from 'date-fns';

export default function LookAheadFilters({ filters, setFilters, users }) {
  const allPhases = ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'];
  const allActivityTypes = ['engineering', 'procurement', 'fabrication', 'delivery', 'erection', 'inspection', 'closeout'];
  const allStatuses = ['planned', 'in_progress', 'completed', 'delayed'];

  const togglePhase = (phase) => {
    setFilters(prev => ({
      ...prev,
      phases: prev.phases.includes(phase)
        ? prev.phases.filter(p => p !== phase)
        : [...prev.phases, phase]
    }));
  };

  const toggleActivityType = (type) => {
    setFilters(prev => ({
      ...prev,
      activityTypes: prev.activityTypes.includes(type)
        ? prev.activityTypes.filter(t => t !== type)
        : [...prev.activityTypes, type]
    }));
  };

  const toggleStatus = (status) => {
    setFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status]
    }));
  };

  const setDateRange = (weeks) => {
    const today = new Date();
    setFilters(prev => ({
      ...prev,
      dateFrom: format(today, 'yyyy-MM-dd'),
      dateTo: format(addWeeks(today, weeks), 'yyyy-MM-dd')
    }));
  };

  const clearFilters = () => {
    setFilters({
      phases: allPhases,
      activityTypes: [],
      statuses: ['planned', 'in_progress', 'delayed'],
      responsibleParty: 'all',
      showCriticalOnly: false,
      dateFrom: format(new Date(), 'yyyy-MM-dd'),
      dateTo: format(addWeeks(new Date(), 6), 'yyyy-MM-dd')
    });
  };

  return (
    <div className="space-y-4 sticky top-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter size={16} />
              Filters
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs text-zinc-500 hover:text-white"
            >
              <X size={14} className="mr-1" />
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range Quick Buttons */}
          <div>
            <Label className="text-xs text-zinc-400 mb-2 block">Planning Window</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange(2)}
                className="text-xs border-zinc-700"
              >
                2 Weeks
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange(4)}
                className="text-xs border-zinc-700"
              >
                4 Weeks
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange(6)}
                className="text-xs border-zinc-700"
              >
                6 Weeks
              </Button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-zinc-400">From</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">To</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-xs"
              />
            </div>
          </div>

          {/* Phases */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-xs text-zinc-400">Phases</Label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, phases: allPhases }))}
                  className="text-[10px] h-6 px-2 text-zinc-500"
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, phases: [] }))}
                  className="text-[10px] h-6 px-2 text-zinc-500"
                >
                  None
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {allPhases.map(phase => (
                <div key={phase} className="flex items-center gap-2">
                  <Checkbox
                    checked={filters.phases.includes(phase)}
                    onCheckedChange={() => togglePhase(phase)}
                  />
                  <span className="text-sm capitalize">{phase}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Types */}
          <div>
            <Label className="text-xs text-zinc-400 mb-2 block">Activity Type</Label>
            <div className="space-y-2">
              {allActivityTypes.map(type => (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox
                    checked={filters.activityTypes.includes(type)}
                    onCheckedChange={() => toggleActivityType(type)}
                  />
                  <span className="text-sm capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <Label className="text-xs text-zinc-400 mb-2 block">Status</Label>
            <div className="space-y-2">
              {allStatuses.map(status => (
                <div key={status} className="flex items-center gap-2">
                  <Checkbox
                    checked={filters.statuses.includes(status)}
                    onCheckedChange={() => toggleStatus(status)}
                  />
                  <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Responsible Party */}
          <div>
            <Label className="text-xs text-zinc-400 mb-2 block">Responsible Party</Label>
            <Select
              value={filters.responsibleParty}
              onValueChange={(v) => setFilters(prev => ({ ...prev, responsibleParty: v }))}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.email} value={u.email}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Critical Path Toggle */}
          <div className="pt-3 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filters.showCriticalOnly}
                onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showCriticalOnly: checked }))}
              />
              <span className="text-sm font-medium text-amber-400">Show Critical Path Only</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}