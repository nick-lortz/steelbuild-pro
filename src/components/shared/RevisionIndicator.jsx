import React from 'react';
import { Badge } from '@/components/ui/badge';
import { GitBranch, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RevisionIndicator({ 
  revisionNumber, 
  hasPendingChanges = false,
  className 
}) {
  if (!revisionNumber && !hasPendingChanges) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {revisionNumber && (
        <Badge variant="outline" className="flex items-center gap-1">
          <GitBranch size={12} />
          {revisionNumber}
        </Badge>
      )}
      
      {hasPendingChanges && (
        <Badge variant="warning" className="flex items-center gap-1">
          <AlertCircle size={12} />
          Pending
        </Badge>
      )}
    </div>
  );
}