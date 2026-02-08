import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RFIRevisionBadge({ rfi, currentRevisionHash }) {
  if (!rfi.revision_hash) return null;

  const isSuperseded = rfi.requires_revalidation || 
                       (currentRevisionHash && rfi.revision_hash !== currentRevisionHash);

  if (isSuperseded) {
    return (
      <Badge className="bg-red-600 text-white text-xs flex items-center gap-1 w-fit">
        <AlertCircle size={12} />
        Superseded
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-600 text-white text-xs flex items-center gap-1 w-fit">
      <CheckCircle2 size={12} />
      Current
    </Badge>
  );
}