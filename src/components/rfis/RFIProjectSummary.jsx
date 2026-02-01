import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { differenceInDays, parseISO } from 'date-fns';

export default function RFIProjectSummary({ rfis, projects }) {
  const projectStats = React.useMemo(() => {
    const stats = {};
    
    projects.forEach(project => {
      const projectRFIs = rfis.filter(r => r.project_id === project.id);
      const total = projectRFIs.length;
      const open = projectRFIs.filter(r => !['answered', 'closed'].includes(r.status)).length;
      const closed = projectRFIs.filter(r => r.status === 'closed').length;
      const blockers = projectRFIs.filter(r => r.blocker_info?.is_blocker && !['answered', 'closed'].includes(r.status)).length;
      
      const now = new Date();
      const overdue = projectRFIs.filter(r => {
        if (['answered', 'closed'].includes(r.status)) return false;
        if (!r.due_date) return false;
        return new Date(r.due_date) < now;
      }).length;
      
      // Avg age of open RFIs
      const openAges = projectRFIs
        .filter(r => !['answered', 'closed'].includes(r.status) && r.submitted_date)
        .map(r => differenceInDays(now, parseISO(r.submitted_date)));
      const avgAge = openAges.length > 0 
        ? Math.round(openAges.reduce((a, b) => a + b, 0) / openAges.length)
        : 0;
      
      stats[project.id] = {
        project,
        total,
        open,
        closed,
        blockers,
        overdue,
        avgAge
      };
    });
    
    return stats;
  }, [rfis, projects]);

  return (
    <div className="grid grid-cols-1 gap-3">
      {projects.map(project => {
        const stat = projectStats[project.id];
        if (stat.total === 0) return null;

        return (
          <Card key={project.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{project.name}</span>
                <Badge variant="outline">{stat.total} RFIs</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3 text-center">
                <div>
                  <div className="text-xl font-bold text-blue-500">{stat.open}</div>
                  <div className="text-xs text-muted-foreground">Open</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-500">{stat.closed}</div>
                  <div className="text-xs text-muted-foreground">Closed</div>
                </div>
                {stat.overdue > 0 && (
                  <div>
                    <div className="text-xl font-bold text-red-500">{stat.overdue}</div>
                    <div className="text-xs text-muted-foreground">Overdue</div>
                  </div>
                )}
                {stat.blockers > 0 && (
                  <div>
                    <div className="text-xl font-bold text-orange-500">{stat.blockers}</div>
                    <div className="text-xs text-muted-foreground">Blockers</div>
                  </div>
                )}
                <div>
                  <div className="text-xl font-bold">{stat.avgAge}</div>
                  <div className="text-xs text-muted-foreground">Avg Age</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}