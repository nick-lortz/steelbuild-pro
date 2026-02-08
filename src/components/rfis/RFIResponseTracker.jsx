import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

export default function RFIResponseTracker({ rfi, onStatusChange, onEdit }) {
  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-600',
      submitted: 'bg-blue-600',
      assigned: 'bg-blue-700',
      in_review: 'bg-amber-600',
      answered: 'bg-green-600',
      implemented: 'bg-green-700',
      closed: 'bg-emerald-800',
      void: 'bg-gray-700'
    };
    return colors[status] || 'bg-gray-600';
  };

  const statusFlow = ['submitted', 'assigned', 'in_review', 'answered', 'implemented', 'closed'];
  const currentIndex = statusFlow.indexOf(rfi.status);

  const isOverdue = rfi.due_date && new Date() > parseISO(rfi.due_date) && !['closed', 'void'].includes(rfi.status);
  const daysRemaining = rfi.due_date ? differenceInDays(parseISO(rfi.due_date), new Date()) : null;

  return (
    <Card className={`${isOverdue ? 'border-red-800/50 bg-red-950/20' : 'bg-zinc-900 border-zinc-800'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Status & Response Tracking</CardTitle>
          {isOverdue && (
            <Badge className="bg-red-600 text-white">
              <AlertTriangle size={12} className="mr-1" />
              OVERDUE
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Flow */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-zinc-400">Workflow Progress</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {statusFlow.map((status, idx) => (
              <React.Fragment key={status}>
                <button
                  onClick={() => onStatusChange(status)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-all
                    ${currentIndex >= idx ? getStatusColor(status) + ' text-white' : 'bg-zinc-800 text-zinc-500'}
                  `}>
                  {status.replace('_', ' ')}
                </button>
                {idx < statusFlow.length - 1 && (
                  <div className={`h-0.5 w-4 ${currentIndex > idx ? 'bg-green-600' : 'bg-zinc-700'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Timeline Info */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-zinc-800/50 p-2 rounded">
            <p className="text-zinc-400 uppercase tracking-widest mb-1">Submitted</p>
            <p className="text-white font-semibold">
              {rfi.submitted_date ? format(parseISO(rfi.submitted_date), 'MMM d') : '—'}
            </p>
          </div>
          <div className={`p-2 rounded ${isOverdue ? 'bg-red-900/30 border border-red-800' : 'bg-zinc-800/50'}`}>
            <p className="text-zinc-400 uppercase tracking-widest mb-1">Due</p>
            <p className={`font-semibold ${isOverdue ? 'text-red-400' : 'text-white'}`}>
              {rfi.due_date ? format(parseISO(rfi.due_date), 'MMM d') : '—'}
            </p>
            {daysRemaining !== null && (
              <p className={`text-xs mt-1 ${isOverdue ? 'text-red-400' : 'text-zinc-400'}`}>
                {isOverdue ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
              </p>
            )}
          </div>
          <div className="bg-zinc-800/50 p-2 rounded">
            <p className="text-zinc-400 uppercase tracking-widest mb-1">Response</p>
            <p className="text-white font-semibold">
              {rfi.response_date ? format(parseISO(rfi.response_date), 'MMM d') : '—'}
            </p>
            {rfi.response_days_actual && (
              <p className="text-xs mt-1 text-zinc-400">
                {rfi.response_days_actual} days
              </p>
            )}
          </div>
        </div>

        {/* Impact Summary */}
        {(rfi.estimated_cost_impact || rfi.schedule_impact_days) && (
          <div className="bg-amber-950/30 border border-amber-800/50 p-3 rounded space-y-2">
            <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">Impact</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {rfi.estimated_cost_impact > 0 && (
                <div>
                  <p className="text-zinc-400">Cost</p>
                  <p className="text-white font-semibold">${rfi.estimated_cost_impact.toLocaleString()}</p>
                </div>
              )}
              {rfi.schedule_impact_days > 0 && (
                <div>
                  <p className="text-zinc-400">Schedule</p>
                  <p className="text-white font-semibold">{rfi.schedule_impact_days} days</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ownership */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-zinc-800/50 p-2 rounded">
            <p className="text-zinc-400 uppercase tracking-widest mb-1">Assigned To</p>
            <p className="text-white font-semibold truncate">{rfi.assigned_to || '—'}</p>
          </div>
          <div className="bg-zinc-800/50 p-2 rounded">
            <p className="text-zinc-400 uppercase tracking-widest mb-1">Response From</p>
            <p className="text-white font-semibold truncate">{rfi.response_owner || '—'}</p>
          </div>
        </div>

        <Button
          onClick={() => onEdit(rfi)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs uppercase tracking-widest"
          size="sm">
          Edit Details
        </Button>
      </CardContent>
    </Card>
  );
}