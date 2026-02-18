import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

export default function RFILagTimeline({ rfi }) {
  const { data: lagEvent } = useQuery({
    queryKey: ['rfi-lag', rfi.id],
    queryFn: async () => {
      const events = await base44.entities.ResponseLagEvent.filter({
        entity_type: 'RFI',
        entity_id: rfi.id
      });
      return events[0] || null;
    },
    enabled: !!rfi.id
  });

  if (!lagEvent) {
    return null;
  }

  const isOverdue = lagEvent.is_overdue;
  const hasResponse = !!lagEvent.responded_at;
  const progress = Math.min(100, (lagEvent.lag_days / lagEvent.sla_days) * 100);

  return (
    <Card className={cn(
      "border-l-4",
      isOverdue ? "border-l-red-500" : hasResponse ? "border-l-green-500" : "border-l-amber-500"
    )}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {hasResponse ? (
            <CheckCircle size={16} className="text-green-400" />
          ) : isOverdue ? (
            <AlertTriangle size={16} className="text-red-400" />
          ) : (
            <Clock size={16} className="text-amber-400" />
          )}
          Response Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-zinc-500 mb-2">
            <span>SLA Target: {lagEvent.sla_days} days</span>
            <span>Elapsed: {lagEvent.lag_days} days</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all",
                isOverdue ? "bg-red-500" : hasResponse ? "bg-green-500" : "bg-amber-500"
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-zinc-500 mb-1">Business Days</div>
            <div className="text-lg font-bold text-white">{lagEvent.business_days}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">Float Consumed</div>
            <div className={cn(
              "text-lg font-bold",
              lagEvent.float_consumed_days > 0 ? "text-red-400" : "text-green-400"
            )}>
              {lagEvent.float_consumed_days}d
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">Cost Exposure</div>
            <div className={cn(
              "text-lg font-bold",
              lagEvent.cost_exposure > 0 ? "text-red-400" : "text-zinc-400"
            )}>
              ${lagEvent.cost_exposure.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Timeline Events */}
        <div className="space-y-2 pt-4 border-t border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-white">Submitted</div>
              <div className="text-xs text-zinc-500">
                {format(new Date(lagEvent.requested_at), 'MMM d, yyyy h:mm a')}
              </div>
            </div>
          </div>

          {lagEvent.responded_at && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-white">Responded</div>
                <div className="text-xs text-zinc-500">
                  {format(new Date(lagEvent.responded_at), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
            </div>
          )}

          {!lagEvent.responded_at && isOverdue && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-400">Overdue</div>
                <div className="text-xs text-zinc-500">
                  {lagEvent.lag_days - lagEvent.sla_days}d past SLA
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Responsible Party */}
        <div className="pt-3 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 mb-1">Responsible Party</div>
          <Badge variant="outline">{lagEvent.responsible_party}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}