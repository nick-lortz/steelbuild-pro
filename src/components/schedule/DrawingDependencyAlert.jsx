import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, XCircle, Clock } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function DrawingDependencyAlert({ task, blockStatus, drawings }) {
  if (!blockStatus.blocked) return null;

  const linkedDrawings = drawings.filter(d => 
    task.linked_drawing_set_ids?.includes(d.id)
  );

  const notReleasedDrawings = linkedDrawings.filter(d => d.status !== 'FFF');

  return (
    <Alert className="border-red-500/50 bg-red-500/10 mb-4">
      <XCircle className="h-4 w-4 text-red-500" />
      <AlertTitle className="text-red-400">Task Blocked by Drawings</AlertTitle>
      <AlertDescription className="text-zinc-300">
        <p className="mb-2">{blockStatus.reason}</p>
        <div className="space-y-1">
          {notReleasedDrawings.map(drawing => (
            <div key={drawing.id} className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-zinc-800 border-zinc-700">
                {drawing.set_number}
              </Badge>
              <span className="text-zinc-400">{drawing.set_name}</span>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                {drawing.status}
              </Badge>
              {drawing.due_date && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Clock size={12} />
                  Due: {new Date(drawing.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          This task cannot proceed until all linked drawing sets are Released for Fabrication (FFF).
        </p>
      </AlertDescription>
    </Alert>
  );
}