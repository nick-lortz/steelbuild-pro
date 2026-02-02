import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  Lock,
  Calendar,
  User,
  Pencil,
  Trash2
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

export default function RFIListCompact({ rfis, projects, onSelect, onEdit, onDelete }) {
  const projectMap = React.useMemo(() => {
    const map = {};
    projects.forEach(p => { map[p.id] = p; });
    return map;
  }, [projects]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-700';
      case 'high': return 'bg-orange-700';
      case 'medium': return 'bg-blue-700';
      case 'low': return 'bg-gray-700';
      default: return 'bg-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    if (['answered', 'closed'].includes(status)) return <CheckCircle2 size={16} className="text-green-500" />;
    if (status === 'submitted' || status === 'under_review') return <Clock size={16} className="text-blue-500" />;
    return <Clock size={16} className="text-gray-500" />;
  };

  const getAgeDays = (rfi) => {
    if (!rfi.submitted_date) return null;
    return differenceInDays(new Date(), parseISO(rfi.submitted_date));
  };

  const isOverdue = (rfi) => {
    if (!rfi.due_date) return false;
    return new Date(rfi.due_date) < new Date() && !['answered', 'closed'].includes(rfi.status);
  };

  if (rfis.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        No RFIs found
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {rfis.map(rfi => {
        const project = projectMap[rfi.project_id];
        const age = getAgeDays(rfi);
        const overdue = isOverdue(rfi);

        return (
          <Card 
            key={rfi.id} 
            className={`p-4 cursor-pointer hover:bg-accent transition-colors group ${overdue ? 'border-red-600' : ''}`}
            onClick={() => onSelect(rfi)}
          >
            <div className="flex items-start gap-4">
              {/* Status Icon */}
              <div className="mt-1">
                {getStatusIcon(rfi.status)}
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        RFI-{String(rfi.rfi_number).padStart(3, '0')}
                      </span>
                      {rfi.blocker_info?.is_blocker && (
                        <Badge className="bg-red-700">
                          <Lock size={10} className="mr-1" />
                          BLOCKER
                        </Badge>
                      )}
                      {overdue && (
                        <Badge className="bg-red-700">
                          <AlertTriangle size={10} className="mr-1" />
                          OVERDUE
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium text-sm line-clamp-1">
                      {rfi.subject}
                    </h3>
                  </div>

                  {/* Priority Badge */}
                  <Badge className={getPriorityColor(rfi.priority)}>
                    {rfi.priority || 'medium'}
                  </Badge>
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  {project && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{project.name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 capitalize">
                    {rfi.rfi_type?.replace(/_/g, ' ')}
                  </div>

                  {rfi.ball_in_court && (
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      <span className="capitalize">{rfi.ball_in_court}</span>
                    </div>
                  )}

                  {rfi.due_date && (
                    <div className={`flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : ''}`}>
                      <Calendar size={12} />
                      Due: {format(parseISO(rfi.due_date), 'MMM d')}
                    </div>
                  )}

                  {age !== null && (
                    <div className={`flex items-center gap-1 ${
                      age > 30 ? 'text-red-500 font-medium' :
                      age > 14 ? 'text-amber-500' : ''
                    }`}>
                      <Clock size={12} />
                      {age}d old
                    </div>
                  )}
                </div>

                {/* Tags Row */}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {rfi.status?.replace(/_/g, ' ')}
                  </Badge>
                  {rfi.category && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {rfi.category}
                    </Badge>
                  )}
                  {rfi.discipline && (
                    <Badge variant="outline" className="text-xs">
                      {rfi.discipline}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {(onEdit || onDelete) && (
                <div className="flex gap-1">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(rfi);
                      }}
                      className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                    >
                      <Pencil size={14} />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(rfi);
                      }}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}