import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default function DocumentVersionHistory({ document, onClose }) {
  const [versions, setVersions] = useState([]);

  // Fetch all versions of this document
  useEffect(() => {
    const fetchVersions = async () => {
      if (!document.parent_document_id && !document.id) return;
      
      // Get the parent ID or use current doc ID
      const parentId = document.parent_document_id || document.id;
      
      try {
        const allVersions = await base44.entities.Document.filter({ 
          parent_document_id: parentId 
        });
        
        // Include current document
        const allDocs = [document, ...allVersions].sort((a, b) => 
          (b.version || 1) - (a.version || 1)
        );
        
        setVersions(allDocs);
      } catch (error) {
        console.error('Error fetching versions:', error);
      }
    };

    fetchVersions();
  }, [document]);

  const handleDownload = (doc) => {
    const link = document.createElement('a');
    link.href = doc.file_url;
    link.download = `${doc.file_name || 'document'}_v${doc.version || 1}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Document Version History</DialogTitle>
          <p className="text-gray-400 text-sm mt-1">{document.title}</p>
        </DialogHeader>

        <div className="space-y-4">
          {versions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No version history available</p>
            </div>
          ) : (
            versions.map((version, idx) => (
              <div 
                key={version.id} 
                className="border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
              >
                {/* Version Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-medium">Version {version.version || 1}</h4>
                        {version.is_current && (
                          <Badge variant="default" className="bg-green-600">Current</Badge>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm">
                        {version.created_date ? format(new Date(version.created_date), 'MMM d, yyyy HH:mm') : 'Date unknown'}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(version)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>

                {/* Version Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>File:</span>
                    <span className="text-gray-300">{version.file_name}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Size:</span>
                    <span className="text-gray-300">{formatFileSize(version.file_size || 0)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Status:</span>
                    <Badge className="bg-blue-900 text-blue-200 text-xs">
                      {version.status || 'draft'}
                    </Badge>
                  </div>
                  {version.revision_notes && (
                    <div className="pt-2 border-t border-gray-700 mt-2">
                      <p className="text-gray-400 text-xs mb-1">Notes:</p>
                      <p className="text-gray-300 italic text-xs">{version.revision_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
          <Button variant="outline" onClick={onClose} className="border-gray-600 text-gray-300">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}