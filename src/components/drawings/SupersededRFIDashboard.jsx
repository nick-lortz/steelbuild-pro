import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SupersededRFIDashboard() {
  const { activeProjectId } = useActiveProject();

  const { data: supersededRFIs = [] } = useQuery({
    queryKey: ['supersededRFIs', activeProjectId],
    queryFn: () => base44.entities.RFI.filter({
      project_id: activeProjectId,
      requires_revalidation: true,
      status: { $in: ['answered', 'closed'] }
    }),
    enabled: !!activeProjectId
  });

  if (supersededRFIs.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-500">
          <AlertTriangle size={18} />
          Superseded RFIs ({supersededRFIs.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          These RFIs were answered against older drawing revisions and may need revalidation.
        </p>
        <div className="space-y-2">
          {supersededRFIs.slice(0, 5).map((rfi) => (
            <Link
              key={rfi.id}
              to={`${createPageUrl('RFIs')}?rfi=${rfi.id}`}
              className="block p-3 bg-card hover:bg-accent rounded-md border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">RFI-{rfi.rfi_number}: {rfi.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    Answered {rfi.response_date ? new Date(rfi.response_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <Badge variant="destructive">Superseded</Badge>
              </div>
            </Link>
          ))}
        </div>
        {supersededRFIs.length > 5 && (
          <Link
            to={createPageUrl('RFIs')}
            className="block mt-3 text-sm text-center text-amber-500 hover:underline"
          >
            View all {supersededRFIs.length} superseded RFIs →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}