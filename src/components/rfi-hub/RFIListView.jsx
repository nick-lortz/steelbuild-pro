import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function RFIListView({ rfis, projects, onSelectRFI }) {
  if (rfis.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-12 text-center">
          <p className="text-zinc-500">No RFIs match the current filters</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {rfis.map(rfi => {
        const project = projects.find(p => p.id === rfi.project_id);
        const daysSinceSubmit = rfi.submitted_date 
          ? differenceInDays(new Date(), new Date(rfi.submitted_date))
          : null;
        
        const isOverdue = rfi.due_date && new Date(rfi.due_date) < new Date() && !['closed', 'answered'].includes(rfi.status);

        return (
          <Card 
            key={rfi.id} 
            className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
            onClick={() => onSelectRFI(rfi)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-zinc-600">RFI-{rfi.rfi_number}</span>
                    <Badge variant="outline" className="text-xs">
                      {project?.project_number || 'Unknown'}
                    </Badge>
                    <Badge className={getPriorityColor(rfi.priority)}>
                      {rfi.priority}
                    </Badge>
                    {rfi.blocker_info?.is_blocker && (
                      <Badge className="bg-red-700 text-red-100">
                        <AlertCircle size={12} className="mr-1" />
                        Blocker
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-white text-sm mb-1 truncate">
                    {rfi.subject}
                  </h3>
                  
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="capitalize">{rfi.status?.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>Ball: {rfi.ball_in_court}</span>
                    {daysSinceSubmit !== null && (
                      <>
                        <span>•</span>
                        <span className={daysSinceSubmit > 30 ? 'text-red-500' : daysSinceSubmit > 14 ? 'text-amber-500' : ''}>
                          {daysSinceSubmit}d old
                        </span>
                      </>
                    )}
                    {rfi.due_date && (
                      <>
                        <span>•</span>
                        <span className={isOverdue ? 'text-red-500 font-bold' : ''}>
                          Due: {format(new Date(rfi.due_date), 'MMM d')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  {getStatusIcon(rfi.status)}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function getPriorityColor(priority) {
  switch(priority) {
    case 'critical': return 'bg-red-700 text-red-100';
    case 'high': return 'bg-amber-700 text-amber-100';
    case 'medium': return 'bg-blue-700 text-blue-100';
    default: return 'bg-zinc-700 text-zinc-300';
  }
}

function getStatusIcon(status) {
  switch(status) {
    case 'closed':
    case 'answered':
      return <CheckCircle2 size={20} className="text-green-500" />;
    case 'submitted':
    case 'under_review':
      return <Clock size={20} className="text-yellow-500" />;
    default:
      return <AlertCircle size={20} className="text-blue-500" />;
  }
}