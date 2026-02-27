import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function DocumentVersionHistory({ documentId }) {
  const { data: document } = useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const docs = await base44.entities.Document.filter({ id: documentId });
      return docs[0];
    },
    enabled: !!documentId
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: async () => {
      if (!document) return [];
      const rootId = document.parent_document_id || document.id;
      const allVersions = await base44.entities.Document.filter({});
      return allVersions
        .filter(d => d.id === rootId || d.parent_document_id === rootId)
        .sort((a, b) => (b.version || 1) - (a.version || 1));
    },
    enabled: !!document
  });

  if (versions.length <= 1) {
    return (
      <Card className="bg-zinc-950 border-zinc-800">
        <CardContent className="p-4 text-center">
          <History size={24} className="mx-auto mb-2 text-zinc-700" />
          <p className="text-xs text-zinc-500">No previous versions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <History size={14} />
          Version History ({versions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {versions.map((ver) => (
          <div 
            key={ver.id} 
            className="p-3 bg-zinc-900 border border-zinc-800 rounded"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-amber-500">v{ver.version || 1}</span>
                {ver.is_current && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                    CURRENT
                  </Badge>
                )}
              </div>
              <Badge variant="outline" className="text-[10px]">
                {ver.status}
              </Badge>
            </div>
            
            <p className="text-xs text-zinc-500 mb-2">
              {format(new Date(ver.created_date), 'MMM d, yyyy h:mm a')} • {ver.created_by}
            </p>
            
            {ver.revision_notes && (
              <p className="text-xs text-zinc-400 italic mb-2">"{ver.revision_notes}"</p>
            )}

            {ver.file_url && (
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(ver.file_url, '_blank')}
                  className="h-7 text-xs text-zinc-400 hover:text-white"
                >
                  <Eye size={12} className="mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = ver.file_url;
                    a.download = ver.file_name || 'document';
                    a.click();
                  }}
                  className="h-7 text-xs text-zinc-400 hover:text-white"
                >
                  <Download size={12} className="mr-1" />
                  Download
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}