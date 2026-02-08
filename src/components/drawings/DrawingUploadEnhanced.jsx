import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { apiClient } from '@/api/client';
import { toast } from '@/components/ui/notifications';

export default function DrawingUploadEnhanced({ 
  drawingSetId, 
  onUploadComplete 
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const progressItems = files.map(f => ({
      name: f.name,
      status: 'uploading',
      metadata: null
    }));
    setUploadProgress(progressItems);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Upload file
        setUploadProgress(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'uploading' } : item
        ));

        const { file_url } = await apiClient.integrations.Core.UploadFile({ file });

        // Create drawing sheet
        const sheet = await apiClient.entities.DrawingSheet.create({
          drawing_set_id: drawingSetId,
          sheet_number: `SHEET-${i + 1}`,
          sheet_name: file.name.replace(/\.[^/.]+$/, ''),
          file_url,
          file_name: file.name,
          file_size: file.size,
          uploaded_date: new Date().toISOString()
        });

        // Extract metadata with AI
        setUploadProgress(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'extracting' } : item
        ));

        const { metadata } = await apiClient.functions.invoke('extractDrawingMetadata', {
          file_url,
          drawing_set_id: drawingSetId
        });

        // Update sheet with extracted metadata
        if (metadata.drawing_number) {
          await apiClient.entities.DrawingSheet.update(sheet.id, {
            sheet_number: metadata.drawing_number,
            sheet_name: metadata.title || sheet.sheet_name,
            ai_metadata: JSON.stringify({
              extracted_at: new Date().toISOString(),
              referenced_drawings: metadata.referenced_drawings || [],
              issue_date: metadata.issue_date,
              revision: metadata.revision
            })
          });
        }

        setUploadProgress(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'complete', metadata } : item
        ));

      } catch (error) {
        console.error('Upload error:', error);
        setUploadProgress(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'error' } : item
        ));
      }
    }

    setUploading(false);
    toast.success(`${files.length} drawing(s) uploaded and analyzed`);
    if (onUploadComplete) onUploadComplete();
  };

  const allComplete = uploadProgress.length > 0 && 
    uploadProgress.every(p => p.status === 'complete' || p.status === 'error');

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Upload size={16} />
          Upload & Analyze Drawings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <input
            type="file"
            id="drawing-upload"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <label htmlFor="drawing-upload">
            <Button
              asChild
              disabled={uploading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black"
            >
              <span>
                {uploading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload size={16} className="mr-2" />
                    Select Drawing Files
                  </>
                )}
              </span>
            </Button>
          </label>
          <p className="text-xs text-zinc-500 mt-2">
            AI will auto-extract sheet numbers, titles, revisions, and references
          </p>
        </div>

        {uploadProgress.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-zinc-400 uppercase">
              Processing {uploadProgress.length} file(s)
            </div>
            {uploadProgress.map((item, idx) => (
              <Card key={idx} className="bg-zinc-950 border-zinc-800">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={14} className="text-zinc-400 flex-shrink-0" />
                        <p className="text-xs font-medium text-white truncate">{item.name}</p>
                      </div>
                      
                      {item.status === 'uploading' && (
                        <div className="space-y-1">
                          <Progress value={50} className="h-1" />
                          <p className="text-xs text-zinc-500">Uploading...</p>
                        </div>
                      )}
                      
                      {item.status === 'extracting' && (
                        <div className="space-y-1">
                          <Progress value={75} className="h-1" />
                          <p className="text-xs text-zinc-500">Analyzing with AI...</p>
                        </div>
                      )}
                      
                      {item.status === 'complete' && item.metadata && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            {item.metadata.drawing_number && (
                              <Badge className="bg-green-500/20 text-green-400 text-xs">
                                {item.metadata.drawing_number}
                              </Badge>
                            )}
                            {item.metadata.revision && (
                              <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                                {item.metadata.revision}
                              </Badge>
                            )}
                            {item.metadata.referenced_drawings?.length > 0 && (
                              <span className="text-purple-400">
                                {item.metadata.referenced_drawings.length} refs
                              </span>
                            )}
                          </div>
                          {item.metadata.title && (
                            <p className="text-xs text-zinc-500 truncate">{item.metadata.title}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      {item.status === 'uploading' && (
                        <Loader2 size={16} className="text-amber-500 animate-spin" />
                      )}
                      {item.status === 'extracting' && (
                        <Loader2 size={16} className="text-purple-500 animate-spin" />
                      )}
                      {item.status === 'complete' && (
                        <CheckCircle2 size={16} className="text-green-500" />
                      )}
                      {item.status === 'error' && (
                        <AlertTriangle size={16} className="text-red-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {allComplete && (
          <Button
            onClick={() => setUploadProgress([])}
            variant="outline"
            className="w-full border-zinc-700"
            size="sm"
          >
            Clear
          </Button>
        )}
      </CardContent>
    </Card>
  );
}