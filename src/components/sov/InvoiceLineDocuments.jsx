import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Download, X } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { format, parseISO } from 'date-fns';
import DocumentUploader from '@/components/documents/DocumentUploader';

export default function InvoiceLineDocuments({ invoiceLine, onUpdate }) {
  const [showDialog, setShowDialog] = useState(false);
  const [documents, setDocuments] = useState(invoiceLine.attachments || []);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.InvoiceLine.update(invoiceLine.id, data),
    onSuccess: () => {
      toast.success('Documents updated');
      setShowDialog(false);
      onUpdate?.();
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

  const handleDocumentsAdded = async (newDocs) => {
    const updated = [...documents, ...newDocs];
    setDocuments(updated);
    updateMutation.mutate({ attachments: updated });
  };

  const removeDocument = (index) => {
    const updated = documents.filter((_, i) => i !== index);
    setDocuments(updated);
    updateMutation.mutate({ attachments: updated });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="border-zinc-700 text-xs"
      >
        <FileText size={12} className="mr-1" />
        {documents.length > 0 ? `${documents.length} Doc(s)` : 'Add Docs'}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Line Documents</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <DocumentUploader onDocumentsAdded={handleDocumentsAdded} maxFiles={10} />

            {documents.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm">Attachments ({documents.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-zinc-800 p-3 rounded">
                      <div className="flex items-center gap-2 flex-1">
                        <FileText size={14} className="text-amber-400" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-white truncate">{doc.file_name}</p>
                          {doc.uploaded_date && (
                            <p className="text-xs text-zinc-500">{format(parseISO(doc.uploaded_date), 'MMM d, yyyy')}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-white">
                            <Download size={12} />
                          </Button>
                        </a>
                        <button
                          onClick={() => removeDocument(idx)}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}