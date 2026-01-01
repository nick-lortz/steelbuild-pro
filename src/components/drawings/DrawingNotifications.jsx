import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, Clock, CheckCircle, Calendar } from 'lucide-react';
import { differenceInDays, format, addDays, isAfter } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DrawingNotifications({ drawingSets, projects }) {
  const today = new Date();

  // Overdue drawings (past due date, not released)
  const overdueDrawings = drawingSets.filter((d) => {
    if (!d.due_date || d.status === 'FFF' || d.status === 'As-Built') return false;
    return isAfter(today, new Date(d.due_date));
  });

  // Due soon (within 7 days)
  const dueSoon = drawingSets.filter((d) => {
    if (!d.due_date || d.status === 'FFF' || d.status === 'As-Built') return false;
    const daysUntil = differenceInDays(new Date(d.due_date), today);
    return daysUntil >= 0 && daysUntil <= 7;
  });

  // Ready for release (BFS status but not released)
  const readyForRelease = drawingSets.filter((d) =>
  d.status === 'BFS' && !d.released_for_fab_date
  );

  // Pending approval (IFA status for more than 14 days)
  const pendingApproval = drawingSets.filter((d) => {
    if (d.status !== 'IFA' || !d.ifa_date) return false;
    const daysInReview = differenceInDays(today, new Date(d.ifa_date));
    return daysInReview > 14;
  });

  // AI review completed but not reviewed by human
  const aiReviewCompleted = drawingSets.filter((d) =>
  d.ai_review_status === 'completed' && d.ai_summary && !d.reviewer
  );

  const notifications = [
  {
    type: 'critical',
    count: overdueDrawings.length,
    title: 'Overdue Drawings',
    description: 'Past due date and not released',
    icon: AlertTriangle,
    color: 'red',
    items: overdueDrawings
  },
  {
    type: 'warning',
    count: dueSoon.length,
    title: 'Due Within 7 Days',
    description: 'Approaching deadline',
    icon: Clock,
    color: 'amber',
    items: dueSoon
  },
  {
    type: 'action',
    count: readyForRelease.length,
    title: 'Ready for Release',
    description: 'Back from scrub, pending release',
    icon: CheckCircle,
    color: 'green',
    items: readyForRelease
  },
  {
    type: 'info',
    count: pendingApproval.length,
    title: 'Long Pending Approval',
    description: 'In review for 14+ days',
    icon: Calendar,
    color: 'blue',
    items: pendingApproval
  },
  {
    type: 'info',
    count: aiReviewCompleted.length,
    title: 'AI Review Complete',
    description: 'Awaiting human review',
    icon: Bell,
    color: 'purple',
    items: aiReviewCompleted
  }].
  filter((n) => n.count > 0);

  if (notifications.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6 text-center">
          <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
          <p className="text-zinc-400">All drawings are on track!</p>
        </CardContent>
      </Card>);

  }

  const colorStyles = {
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400'
  };

  return (
    <div className="space-y-4">
      {notifications.map((notification, idx) => {
        const Icon = notification.icon;
        return (
          <Card key={idx} className={`border ${colorStyles[notification.color]}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon size={20} />
                  <div>
                    <CardTitle className="text-base">{notification.title}</CardTitle>
                    <p className="text-xs text-zinc-500 mt-0.5">{notification.description}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-slate-50 px-2.5 py-0.5 text-lg font-bold rounded-md inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  {notification.count}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {notification.items.slice(0, 5).map((drawing) => {
                  const project = projects.find((p) => p.id === drawing.project_id);
                  return (
                    <div key={drawing.id} className="flex items-center justify-between text-sm p-2 bg-zinc-800/30 rounded">
                      <div className="flex-1">
                        <p className="font-medium text-white">{drawing.set_name}</p>
                        <p className="text-xs text-zinc-500">
                          {project?.project_number} • Rev {drawing.current_revision || 'N/A'}
                        </p>
                      </div>
                      {drawing.due_date &&
                      <p className="text-xs text-zinc-400">
                          {notification.type === 'critical' ?
                        `${Math.abs(differenceInDays(new Date(drawing.due_date), today))}d overdue` :
                        `Due ${format(new Date(drawing.due_date), 'MMM d')}`
                        }
                        </p>
                      }
                    </div>);

                })}
                {notification.items.length > 5 &&
                <p className="text-xs text-zinc-500 text-center pt-1">
                    + {notification.items.length - 5} more
                  </p>
                }
              </div>
            </CardContent>
          </Card>);

      })}
    </div>);

}