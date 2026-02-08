import React from 'react';
import { File, Download, Trash2, Eye, History, FileImage } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { apiClient } from '@/api/client';
import { toast } from 'sonner';

export default function DocumentCard({ doc, onDelete, onViewVersions, onPreview }) {
  const isImage = doc.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-amber-500/50 transition-all group">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="flex-shrink-0">
            {isImage && doc.file_url ? (
              <img
                src={doc.file_url}
                alt={doc.title}
                className="w-16 h-16 object-cover rounded border border-zinc-700"
              />
            ) : (
              <div className="w-16 h-16 bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center">
                <File size={24} className="text-amber-500" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white text-sm truncate group-hover:text-amber-400">
              {doc.title}
            </h3>
            <p className="text-xs text-zinc-500 truncate mt-1">{doc.file_name}</p>

            {doc.description && (
              <p className="text-xs text-zinc-600 line-clamp-2 mt-1">{doc.description}</p>
            )}

            <div className="flex gap-2 flex-wrap mt-2">
              {doc.category && (
                <Badge variant="outline" className="bg-zinc-800 border-zinc-700 text-[10px]">
                  {doc.category}
                </Badge>
              )}
              {doc.version > 1 && (
                <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">
                  v{doc.version}
                </Badge>
              )}
              {doc.status && (
                <Badge className="bg-amber-500/10 text-amber-400 text-[10px]">
                  {doc.status}
                </Badge>
              )}
            </div>

            <p className="text-[10px] text-zinc-600 mt-2">
              {format(new Date(doc.created_date), 'MMM d, yyyy')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {doc.file_url && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const { data } = await apiClient.functions.invoke('validateFileAccess', {
                      document_id: doc.id
                    });
                    if (data.allowed) {
                      window.open(data.file_url || doc.file_url, '_blank');
                    } else {
                      toast.error('Access denied');
                    }
                  } catch (error) {
                    toast.error('Failed to access file');
                  }
                }}
                className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                title="View"
              >
                <Eye size={14} />
              </Button>
            )}
            {doc.file_url && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const { data } = await apiClient.functions.invoke('validateFileAccess', {
                      document_id: doc.id
                    });
                    if (data.allowed) {
                      const a = document.createElement('a');
                      a.href = data.file_url || doc.file_url;
                      a.download = doc.file_name;
                      a.click();
                    } else {
                      toast.error('Access denied');
                    }
                  } catch (error) {
                    toast.error('Failed to download file');
                  }
                }}
                className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                title="Download"
              >
                <Download size={14} />
              </Button>
            )}
            {doc.version > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewVersions(doc);
                }}
                className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300"
                title="Versions"
              >
                <History size={14} />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(doc);
              }}
              className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
              title="Delete"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}