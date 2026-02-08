import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, X, Loader2, Lock, AlertCircle } from 'lucide-react';
import { apiClient } from '@/api/client';
import { Document, Page, pdfjs } from 'react-pdf';
import { toast } from '@/components/ui/notifications';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function DocumentPreview({ document, open, onClose, currentUser }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState(null);

  useEffect(() => {
    if (open && document) {
      checkAccess();
    }
  }, [open, document, currentUser]);

  const checkAccess = async () => {
    setLoading(true);
    setAccessError(null);
    
    try {
      // Check user access based on role and project assignment
      if (!currentUser) {
        setHasAccess(false);
        setAccessError('You must be logged in to view documents');
        setLoading(false);
        return;
      }

      // Admin has full access
      if (currentUser.role === 'admin') {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // Check if user is assigned to the document's project
      if (document.project_id) {
        try {
          const { data: projects } = await apiClient.functions.invoke('listProjects', {});
          const project = projects?.find(p => p.id === document.project_id);
          
          if (project && Array.isArray(project.assigned_users)) {
            const isAssigned = project.assigned_users.includes(currentUser.email);
            setHasAccess(isAssigned);
            if (!isAssigned) {
              setAccessError('You are not assigned to this project');
            }
          } else {
            // If no project assignment info, allow access for regular users
            setHasAccess(true);
          }
        } catch (error) {
          console.error('Error checking project access:', error);
          // Default to allowing access on error
          setHasAccess(true);
        }
      } else {
        // Documents without project assignment are accessible to all users
        setHasAccess(true);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Access check failed:', error);
      setAccessError('Failed to verify access');
      setHasAccess(false);
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!hasAccess) {
      toast.error('You do not have permission to download this document');
      return;
    }
    
    const a = window.document.createElement('a');
    a.href = document.file_url;
    a.download = document.file_name || 'document';
    a.click();
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const isPDF = document?.file_name?.toLowerCase().endsWith('.pdf');
  const isImage = document?.file_name?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] bg-zinc-900 border-zinc-800 text-white p-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex-1">
            <DialogTitle className="text-white mb-1">{document?.title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs capitalize">
                {document?.category}
              </Badge>
              {document?.version && (
                <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                  v{document.version}
                </Badge>
              )}
              {document?.status && (
                <Badge variant="outline" className="text-xs">
                  {document.status}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasAccess && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  className="border-zinc-700"
                >
                  <Download size={16} className="mr-2" />
                  Download
                </Button>
                {document?.file_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(document.file_url, '_blank')}
                    className="border-zinc-700"
                  >
                    <Eye size={16} className="mr-2" />
                    Open
                  </Button>
                )}
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-zinc-950 p-6">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 size={48} className="animate-spin text-amber-500 mx-auto mb-4" />
                <p className="text-zinc-400">Checking access...</p>
              </div>
            </div>
          ) : !hasAccess ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <Lock size={64} className="text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
                <p className="text-zinc-400 mb-4">
                  {accessError || 'You do not have permission to view this document'}
                </p>
                <Button onClick={onClose} variant="outline" className="border-zinc-700">
                  Close
                </Button>
              </div>
            </div>
          ) : !document?.file_url ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
                <p className="text-zinc-400">No file attached to this document</p>
              </div>
            </div>
          ) : isPDF ? (
            <div className="flex flex-col items-center">
              <Document
                file={document.file_url}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="text-center py-12">
                    <Loader2 size={48} className="animate-spin text-amber-500 mx-auto mb-4" />
                    <p className="text-zinc-400">Loading PDF...</p>
                  </div>
                }
                error={
                  <div className="text-center py-12">
                    <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                    <p className="text-red-400">Failed to load PDF</p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-2xl"
                  width={800}
                />
              </Document>
              
              {numPages && numPages > 1 && (
                <div className="mt-4 flex items-center gap-3 bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-800">
                  <Button
                    size="sm"
                    disabled={pageNumber <= 1}
                    onClick={() => setPageNumber(pageNumber - 1)}
                    variant="outline"
                    className="border-zinc-700"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-zinc-400">
                    Page {pageNumber} of {numPages}
                  </span>
                  <Button
                    size="sm"
                    disabled={pageNumber >= numPages}
                    onClick={() => setPageNumber(pageNumber + 1)}
                    variant="outline"
                    className="border-zinc-700"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          ) : isImage ? (
            <div className="flex justify-center">
              <img
                src={document.file_url}
                alt={document.title}
                className="max-w-full h-auto rounded-lg shadow-2xl"
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Eye size={48} className="text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400 mb-4">Preview not available for this file type</p>
                <Button
                  onClick={handleDownload}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  <Download size={16} className="mr-2" />
                  Download to View
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}