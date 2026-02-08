import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function RFIRevisionBadge({ rfi, currentDrawingHash }) {
  if (!rfi.origin_drawing_id || !rfi.revision_hash) {
    return null;
  }

  const isSuperseded = rfi.requires_revalidation || 
    (currentDrawingHash && rfi.revision_hash !== currentDrawingHash);

  if (isSuperseded) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle size={14} />
        Superseded
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="bg-green-600 gap-1">
      <CheckCircle size={14} />
      Current
    </Badge>
  );
}