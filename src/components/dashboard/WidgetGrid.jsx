import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function DraggableWidget({ id, children, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative bg-zinc-900 border border-zinc-800 rounded-lg",
        isDragging && "opacity-50 z-50"
      )}
    >
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-zinc-600 hover:text-white cursor-move"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="h-6 w-6 p-0 text-zinc-600 hover:text-red-500"
        >
          <X size={14} />
        </Button>
      </div>
      {children}
    </div>
  );
}

export function WidgetContainer({ children, className }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {children}
    </div>
  );
}