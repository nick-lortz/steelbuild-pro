import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, MessageSquareWarning, FileCheck, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function RecentActivity({ drawings, rfis, changeOrders, tasks }) {
  // Combine recent activities
  const activities = [
    ...drawings.slice(0, 5).map(d => ({
      type: 'drawing',
      icon: FileText,
      title: d.set_name,
      subtitle: d.status,
      date: d.updated_date || d.created_date,
      color: 'text-blue-400',
    })),
    ...rfis.slice(0, 5).map(r => ({
      type: 'rfi',
      icon: MessageSquareWarning,
      title: `RFI-${String(r.rfi_number).padStart(3, '0')}: ${r.subject}`,
      subtitle: r.status,
      date: r.updated_date || r.created_date,
      color: 'text-purple-400',
    })),
    ...changeOrders.slice(0, 5).map(co => ({
      type: 'change_order',
      icon: FileCheck,
      title: `CO-${String(co.co_number).padStart(3, '0')}: ${co.title}`,
      subtitle: co.status,
      date: co.updated_date || co.created_date,
      color: 'text-green-400',
    })),
    ...tasks.filter(t => t.status === 'completed').slice(0, 5).map(t => ({
      type: 'task',
      icon: Calendar,
      title: t.name,
      subtitle: 'Completed',
      date: t.updated_date || t.created_date,
      color: 'text-emerald-400',
    })),
  ]
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, 10);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity, idx) => {
            const Icon = activity.icon;
            return (
              <div key={idx} className="flex items-start gap-3 p-2 rounded hover:bg-zinc-800/50 transition-colors">
                <div className="p-2 bg-zinc-800 rounded">
                  <Icon size={14} className={activity.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{activity.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs capitalize">
                      {activity.subtitle}
                    </Badge>
                    <span className="text-xs text-zinc-500">
                      {format(new Date(activity.date), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}