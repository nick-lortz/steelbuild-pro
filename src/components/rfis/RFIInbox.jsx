import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, MessageSquare, TrendingUp } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';

export default function RFIInbox({ rfis, onSelectRFI, onQuickAction }) {
  const categorizeRFIs = () => {
    const today = new Date();
    return {
      overdue: rfis.filter(r => 
        r.due_date && 
        !['answered', 'closed'].includes(r.status) &&
        differenceInDays(today, parseISO(r.due_date)) > 0
      ),
      dueThisWeek: rfis.filter(r => 
        r.due_date &&
        !['answered', 'closed'].includes(r.status) &&
        differenceInDays(parseISO(r.due_date), today) >= 0 &&
        differenceInDays(parseISO(r.due_date), today) <= 7
      ),
      awaitingOurAction: rfis.filter(r => 
        r.ball_in_court === 'internal' && 
        !['answered', 'closed'].includes(r.status)
      ),
      awaitingExternal: rfis.filter(r => 
        ['external', 'gc', 'architect', 'engineer'].includes(r.ball_in_court) &&
        !['answered', 'closed'].includes(r.status)
      )
    };
  };

  const categories = categorizeRFIs();

  const InboxSection = ({ title, icon: Icon, count, rfis, color, emptyText }) => (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon size={16} className={color} />
            <h3 className="font-bold text-sm uppercase tracking-wider">{title}</h3>
          </div>
          <Badge className={color === 'text-red-500' ? 'bg-red-500' : 'bg-zinc-700'}>{count}</Badge>
        </div>

        {rfis.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-4">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            {rfis.slice(0, 5).map(rfi => {
              const daysUntilDue = rfi.due_date ? differenceInDays(parseISO(rfi.due_date), new Date()) : null;
              return (
                <div 
                  key={rfi.id}
                  onClick={() => onSelectRFI(rfi)}
                  className="p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-amber-400">
                          RFI-{String(rfi.rfi_number).padStart(3, '0')}
                        </span>
                        <StatusBadge status={rfi.priority} />
                      </div>
                      <p className="text-sm font-medium line-clamp-1">{rfi.subject}</p>
                    </div>
                    {daysUntilDue !== null && (
                      <span className={`text-xs font-bold ${
                        daysUntilDue < 0 ? 'text-red-400' : daysUntilDue <= 3 ? 'text-amber-400' : 'text-zinc-500'
                      }`}>
                        {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d left`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>{rfi.assigned_to || 'Unassigned'}</span>
                    <span>•</span>
                    <StatusBadge status={rfi.ball_in_court} />
                  </div>
                </div>
              );
            })}
            {rfis.length > 5 && (
              <p className="text-xs text-zinc-500 text-center pt-2">
                +{rfis.length - 5} more
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <InboxSection
        title="Overdue"
        icon={AlertTriangle}
        count={categories.overdue.length}
        rfis={categories.overdue}
        color="text-red-500"
        emptyText="No overdue RFIs"
      />
      <InboxSection
        title="Due This Week"
        icon={Clock}
        count={categories.dueThisWeek.length}
        rfis={categories.dueThisWeek}
        color="text-amber-500"
        emptyText="No RFIs due this week"
      />
      <InboxSection
        title="Awaiting Our Action"
        icon={TrendingUp}
        count={categories.awaitingOurAction.length}
        rfis={categories.awaitingOurAction}
        color="text-blue-500"
        emptyText="No RFIs waiting for us"
      />
      <InboxSection
        title="Awaiting External Response"
        icon={MessageSquare}
        count={categories.awaitingExternal.length}
        rfis={categories.awaitingExternal}
        color="text-purple-500"
        emptyText="No RFIs waiting externally"
      />
    </div>
  );
}