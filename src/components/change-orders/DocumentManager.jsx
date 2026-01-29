import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Download, Trash2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DocumentManager({ changeOrder, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const attachments = changeOrder.attachments || [];
  const currentVersionDocs = attachments.filter(a => a.version === changeOrder.version);
  const previousVersionDocs = attachments.filter(a => a.version < changeOrder.version);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      
      const newAttachment = {
        file_url: data.file_url,
        file_name: file.name,
        file_type: file.type,
        version: changeOrder.version,
        uploaded_by: (await base44.auth.me()).email,
        uploaded_at: new Date().toISOString(),
        is_signed: false
      };

      const updatedAttachments = [...attachments, newAttachment];
      
      await base44.entities.ChangeOrder.update(changeOrder.id, {
        attachments: updatedAttachments
      });

      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      toast.success('Document uploaded');
      onUpdate();
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (index) => {
    const updatedAttachments = attachments.filter((_, i) => i !== index);
    
    await base44.entities.ChangeOrder.update(changeOrder.id, {
      attachments: updatedAttachments
    });

    queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
    toast.success('Document deleted');
    onUpdate();
  };

  const toggleSigned = async (index) => {
    const updatedAttachments = [...attachments];
    updatedAttachments[index].is_signed = !updatedAttachments[index].is_signed;
    
    await base44.entities.ChangeOrder.update(changeOrder.id, {
      attachments: updatedAttachments
    });

    queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
    toast.success(updatedAttachments[index].is_signed ? 'Marked as signed' : 'Unmarked as signed');
    onUpdate();
  };

  const renderDocumentList = (docs, title) => {
    if (docs.length === 0) return null;

    return (
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-zinc-400 mb-3">{title}</h4>
        <div className="space-y-2">
          {docs.map((doc, idx) => (
            <div 
              key={idx}
              className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <FileText size={20} className="text-zinc-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-zinc-500">
                      {doc.uploaded_by} • {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      v{doc.version}
                    </Badge>
                    {doc.is_signed && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        <CheckCircle2 size={10} className="mr-1" />
                        Signed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSigned(attachments.indexOf(doc))}
                  className="text-zinc-400 hover:text-green-400"
                >
                  {doc.is_signed ? 'Unsign' : 'Mark Signed'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(doc.file_url, '_blank')}
                  className="text-zinc-400 hover:text-white"
                >
                  <Download size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(attachments.indexOf(doc))}
                  className="text-zinc-400 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Documents</CardTitle>
          <Button
            onClick={() => document.getElementById('co-file-upload')?.click()}
            disabled={uploading}
            className="bg-amber-500 hover:bg-amber-600 text-black"
            size="sm"
          >
            <Upload size={14} className="mr-2" />
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
          <input
            id="co-file-upload"
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={32} className="mx-auto text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500">No documents uploaded</p>
          </div>
        ) : (
          <>
            {renderDocumentList(currentVersionDocs, `Current Version (v${changeOrder.version})`)}
            {renderDocumentList(previousVersionDocs, 'Previous Versions')}
          </>
        )}
      </CardContent>
    </Card>
  );
}