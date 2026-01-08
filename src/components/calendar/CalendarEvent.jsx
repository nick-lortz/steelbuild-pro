import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { 
  CheckSquare, 
  Building2, 
  Users, 
  FileCheck, 
  FileText, 
  Calendar 
} from 'lucide-react';

const eventTypeConfig = {
  task: {
    icon: CheckSquare,
    colors: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
    label: 'Task',
  },
  project: {
    icon: Building2,
    colors: 'bg-purple-500/20 border-purple-500/40 text-purple-400',
    label: 'Project',
  },
  allocation: {
    icon: Users,
    colors: 'bg-green-500/20 border-green-500/40 text-green-400',
    label: 'Resource',
  },
  work_package: {
    icon: FileCheck,
    colors: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
    label: 'Work Package',
  },
  review: {
    icon: FileText,
    colors: 'bg-red-500/20 border-red-500/40 text-red-400',
    label: 'Review',
  },
  meeting: {
    icon: Calendar,
    colors: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400',
    label: 'Meeting',
  },
};

export default function CalendarEvent({ event, isCompact, isDragging }) {
  const config = eventTypeConfig[event.type] || eventTypeConfig.task;
  const Icon = config.icon;

  if (isCompact) {
    return (
      <div
        className={cn(
          'text-[11px] px-2 py-1 rounded border cursor-move',
          config.colors,
          isDragging && 'opacity-50',
          'hover:brightness-110 transition-all'
        )}
      >
        <div className="flex items-center gap-1 truncate">
          <Icon size={10} className="flex-shrink-0" />
          <span className="truncate font-medium">{event.title}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        config.colors,
        isDragging && 'opacity-50',
        'cursor-move hover:brightness-110 transition-all'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Icon size={16} />
          <Badge variant="outline" className="text-[10px] border-current">
            {config.label}
          </Badge>
        </div>
        {event.status && (
          <Badge variant="outline" className="text-[10px] capitalize border-zinc-600 text-zinc-300">
            {event.status.replace('_', ' ')}
          </Badge>
        )}
      </div>
      <p className="font-medium text-sm mb-1">{event.title}</p>
      {event.allocation_percentage && (
        <p className="text-xs opacity-80">{event.allocation_percentage}% allocated</p>
      )}
      {event.priority && (
        <Badge variant="outline" className="text-[10px] mt-1 capitalize">
          {event.priority} priority
        </Badge>
      )}
    </div>
  );
}