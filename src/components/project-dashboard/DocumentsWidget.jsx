import React from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { File } from 'lucide-react';
import SecureDocumentManager from '@/components/documents/SecureDocumentManager';

export default function DocumentsWidget({ projectId }) {
  return (
    <div>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <File size={16} className="text-blue-400" />
          Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SecureDocumentManager projectId={projectId} />
      </CardContent>
    </div>
  );
}