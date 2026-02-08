import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Repeat, Calendar, AlertCircle } from 'lucide-react';
import { safeFormat } from '@/components/shared/dateUtilsSafe';

export default function RecurringTaskConfig({ task, onChange }) {
  const [config, setConfig] = useState({
    is_recurring: task?.is_recurring || false,
    recurrence_pattern: task?.recurrence_pattern || 'weekly',
    recurrence_interval: task?.recurrence_interval || 1,
    recurrence_end_date: task?.recurrence_end_date || ''
  });

  const handleChange = (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    onChange(newConfig);
  };

  const getNextOccurrence = () => {
    if (!task?.start_date || !config.is_recurring) return null;

    const start = new Date(task.start_date);
    const interval = config.recurrence_interval || 1;

    switch (config.recurrence_pattern) {
      case 'daily':
        start.setDate(start.getDate() + interval);
        break;
      case 'weekly':
        start.setDate(start.getDate() + (7 * interval));
        break;
      case 'biweekly':
        start.setDate(start.getDate() + 14);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() + interval);
        break;
      default:
        return null;
    }

    return start;
  };

  const nextOccurrence = getNextOccurrence();

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Repeat size={14} className="text-amber-500" />
          Recurring Task
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Enable Recurrence</Label>
          <Switch
            checked={config.is_recurring}
            onCheckedChange={(checked) => handleChange('is_recurring', checked)}
          />
        </div>

        {config.is_recurring && (
          <>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Frequency</Label>
              <Select
                value={config.recurrence_pattern}
                onValueChange={(val) => handleChange('recurrence_pattern', val)}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Repeat Every</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={config.recurrence_interval}
                  onChange={(e) => handleChange('recurrence_interval', parseInt(e.target.value))}
                  className="bg-zinc-800 border-zinc-700 w-20"
                />
                <span className="text-sm text-zinc-400 capitalize">
                  {config.recurrence_pattern === 'daily' ? 'day(s)' :
                   config.recurrence_pattern === 'weekly' ? 'week(s)' :
                   config.recurrence_pattern === 'biweekly' ? 'weeks' :
                   'month(s)'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">End Date (optional)</Label>
              <Input
                type="date"
                value={config.recurrence_end_date}
                onChange={(e) => handleChange('recurrence_end_date', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
              <p className="text-xs text-zinc-500">Leave blank to recur indefinitely</p>
            </div>

            {nextOccurrence && (
              <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-xs">
                  <Calendar size={12} className="text-blue-400" />
                  <span className="text-blue-400 font-medium">Next occurrence:</span>
                  <span className="text-white">{safeFormat(nextOccurrence, 'MMM d, yyyy')}</span>
                </div>
              </div>
            )}

            <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-2 text-xs text-amber-400">
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                <p>
                  New task instances will be auto-created based on this schedule.
                  Each instance can be edited independently.
                </p>
              </div>
            </div>
          </>
        )}

        {!config.is_recurring && (
          <p className="text-xs text-zinc-500 text-center py-4">
            Enable to automatically create recurring task instances
          </p>
        )}
      </CardContent>
    </Card>
  );
}