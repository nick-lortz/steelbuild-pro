import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { MessageSquareWarning, Users, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function CommunicationLog({ projectId }) {
  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', projectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: projectId })
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings', projectId],
    queryFn: () => base44.entities.Meeting.filter({ project_id: projectId })
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => base44.entities.Document.filter({ project_id: projectId })
  });

  // Combine and sort all communications
  const communications = useMemo(() => {
    const items = [
      ...rfis.map(r => ({
        id: r.id,
        type: 'RFI',
        title: r.subject,
        date: r.submitted_date || r.created_date,
        icon: MessageSquareWarning,
        status: r.status,
        details: `Status: ${r.status} | Priority: ${r.priority}`
      })),
      ...meetings.map(m => ({
        id: m.id,
        type: 'Meeting',
        title: m.title,
        date: m.meeting_date,
        icon: Users,
        details: `${m.attendees?.length || 0} attendees`
      })),
      ...documents.filter(d => ['decision', 'approval', 'correspondence'].includes(d.category)).map(d => ({
        id: d.id,
        type: 'Document',
        title: d.title,
        date: d.created_date,
        icon: FileText,
        status: d.status,
        details: d.category
      }))
    ];

    return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);
  }, [rfis, meetings, documents]);

  const getStatusColor = (type, status) => {
    if (type === 'RFI') {
      if (['answered', 'implemented', 'closed'].includes(status)) return 'bg-green-100 text-green-800';
      if (status === 'void') return 'bg-gray-100 text-gray-800';
      return 'bg-amber-100 text-amber-800';
    }
    if (status === 'approved') return 'bg-green-100 text-green-800';
    if (status === 'rejected') return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="space-y-2">
      {communications.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No communications recorded</p>
      ) : (
        communications.map((item) => {
          const Icon = item.icon;
          return (
            <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 p-3 rounded border border-border hover:bg-muted/50">
              <Icon className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.details}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">{item.type}</Badge>
                    {item.status && (
                      <Badge className={`text-xs ${getStatusColor(item.type, item.status)}`}>
                        {item.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(item.date), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}