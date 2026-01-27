import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

export default function DashboardCustomizer({ visibleMetrics, onChange, onClose }) {
  const metrics = [
    { key: 'gantt', label: 'Timeline (Gantt Chart)', description: 'Project schedule with task dependencies' },
    { key: 'resources', label: 'Resource Allocation', description: 'Team and equipment assignments' },
    { key: 'risks', label: 'Risk Management', description: 'Top 5 active risks and mitigation' },
    { key: 'communications', label: 'Stakeholder Communications', description: 'RFIs, meetings, decisions' },
    { key: 'health', label: 'Project Health Scorecard', description: 'Financial and performance metrics' }
  ];

  const handleToggle = (key) => {
    onChange({
      ...visibleMetrics,
      [key]: !visibleMetrics[key]
    });
  };

  return (
    <Card className="border-amber-500/50 bg-amber-50/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Dashboard Settings</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.map(metric => (
            <div key={metric.key} className="flex items-start space-x-3 p-3 rounded border border-border hover:bg-muted/50">
              <Checkbox
                id={metric.key}
                checked={visibleMetrics[metric.key]}
                onCheckedChange={() => handleToggle(metric.key)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor={metric.key} className="cursor-pointer font-medium">
                  {metric.label}
                </Label>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}