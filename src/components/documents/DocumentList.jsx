import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { File, Download, Clock, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  draft: 'bg-blue-900 text-blue-200',
  issued: 'bg-green-900 text-green-200',
  for_review: 'bg-yellow-900 text-yellow-200',
  approved: 'bg-emerald-900 text-emerald-200',
  void: 'bg-red-900 text-red-200',
  superseded: 'bg-gray-900 text-gray-200',
};

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default function DocumentList({ documents, onSelectDocument, onDelete }) {
  const handleDownload = (doc) => {
    const link = document.createElement('a');
    link.href = doc.file_url;
    link.download = doc.file_name || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      {documents.map(doc => (
        <Card 
          key={doc.id} 
          className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors p-4"
        >
          <div className="flex items-start justify-between gap-4">
            {/* File Info */}
            <div className="flex-1 flex gap-4">
              <div className="flex-shrink-0 pt-1">
                <File className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">{doc.title}</h3>
                <p className="text-gray-400 text-sm truncate">{doc.file_name}</p>
                <div className="flex gap-3 mt-2 flex-wrap">
                  <Badge className={STATUS_COLORS[doc.status] || STATUS_COLORS.draft}>
                    {doc.status}
                  </Badge>
                  {doc.version && doc.version > 1 && (
                    <Badge variant="outline" className="border-gray-600 text-gray-300">
                      <Clock className="w-3 h-3 mr-1" />
                      v{doc.version}
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatFileSize(doc.file_size)}
                  </span>
                  {doc.created_date && (
                    <span className="text-xs text-gray-500">
                      {format(new Date(doc.created_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-shrink-0">
              {doc.version && doc.version > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSelectDocument(doc)}
                  className="text-gray-400 hover:text-white"
                  title="View version history"
                >
                  <Clock className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDownload(doc)}
                className="text-gray-400 hover:text-white"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(doc.id)}
                className="text-gray-400 hover:text-red-400"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          {doc.description && (
            <p className="text-gray-400 text-sm mt-3 pl-9">{doc.description}</p>
          )}

          {/* Tags */}
          {doc.tags && doc.tags.length > 0 && (
            <div className="flex gap-2 mt-3 ml-9 flex-wrap">
              {doc.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}