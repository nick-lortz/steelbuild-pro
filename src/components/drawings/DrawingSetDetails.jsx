import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DrawingSetForm from './DrawingSetForm';
import AIDrawingProcessor from './AIDrawingProcessor';
import { FileText, History, Brain, ExternalLink, Download, Sparkles, Trash2, Upload, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { base44 } from '@/api/base44Client';

export default function DrawingSetDetails({ 
  drawingSet, 
  sheets, 
  revisions, 
  projects, 
  onClose, 
  onUpdate,
  onDelete,
  isUpdating 
}) {
  const [editMode, setEditMode] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [uploadingSheets, setUploadingSheets] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const project = projects.find(p => p.id === drawingSet.project_id);

  const handleSubmit = (data) => {
    onUpdate(data);
    setEditMode(false);
  };

  const handleFilesDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer?.files || e.target?.files || []);
    const pdfFiles = droppedFiles.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    
    if (pdfFiles.length !== droppedFiles.length) {
      alert('Only PDF files are allowed');
    }
    
    setUploadFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleUploadSheets = async () => {
    if (uploadFiles.length === 0) return;
    
    setUploadingSheets(true);
    try {
      for (const file of uploadFiles) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const sheetNumber = file.name.replace('.pdf', '');
        
        await base44.entities.DrawingSheet.create({
          drawing_set_id: drawingSet.id,
          sheet_number: sheetNumber,
          sheet_name: file.name,
          file_url,
          file_name: file.name,
          file_size: file.size,
          uploaded_date: new Date().toISOString(),
          ai_reviewed: false,
        });
      }
      
      // Update sheet count
      await onUpdate({ sheet_count: sheets.length + uploadFiles.length });
      
      setUploadFiles([]);
      alert('Sheets uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload sheets');
    } finally {
      setUploadingSheets(false);
    }
  };

  return (
    <Sheet open={!!drawingSet} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-white text-xl">{drawingSet.set_name}</SheetTitle>
              <p className="text-sm text-zinc-400 mt-1">
                {project?.project_number} • {drawingSet.set_number}
              </p>
            </div>
            {!editMode && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-zinc-400 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </Button>
                <Button
                  size="sm"
                  onClick={() => setEditMode(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  Edit Set
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        {editMode ? (
          <div className="mt-6">
            <DrawingSetForm
              projects={projects}
              drawingSet={drawingSet}
              onSubmit={handleSubmit}
              onCancel={() => setEditMode(false)}
              isLoading={isUpdating}
            />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="bg-zinc-900 border border-zinc-800 w-full">
              <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
              <TabsTrigger value="sheets" className="flex-1">
                <FileText size={14} className="mr-2" />
                Sheets ({sheets.length})
              </TabsTrigger>
              <TabsTrigger value="revisions" className="flex-1">
                <History size={14} className="mr-2" />
                History
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex-1">
                <Sparkles size={14} className="mr-2" />
                AI Analysis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-6">
              {/* Status & Discipline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Status</p>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                    {drawingSet.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Discipline</p>
                  <p className="text-sm capitalize">{drawingSet.discipline?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Revision</p>
                  <p className="text-sm font-mono text-amber-500">{drawingSet.current_revision || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Reviewer</p>
                  <p className="text-sm">{drawingSet.reviewer || '-'}</p>
                </div>
              </div>

              {/* Milestone Timeline */}
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-sm">Milestone Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">IFA - Issued for Approval</span>
                      {drawingSet.ifa_date ? (
                        <span className="text-sm">{format(new Date(drawingSet.ifa_date), 'MMM d, yyyy')}</span>
                      ) : (
                        <span className="text-xs text-zinc-600">Not set</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">BFA - Back from Approval</span>
                      {drawingSet.bfa_date ? (
                        <span className="text-sm">{format(new Date(drawingSet.bfa_date), 'MMM d, yyyy')}</span>
                      ) : (
                        <span className="text-xs text-zinc-600">Not set</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">BFS - Back from Scrub</span>
                      {drawingSet.bfs_date ? (
                        <span className="text-sm">{format(new Date(drawingSet.bfs_date), 'MMM d, yyyy')}</span>
                      ) : (
                        <span className="text-xs text-zinc-600">Not set</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-700 pt-3">
                      <span className="text-sm font-medium text-green-400">Released for Fabrication</span>
                      {drawingSet.released_for_fab_date ? (
                        <span className="text-sm font-medium">{format(new Date(drawingSet.released_for_fab_date), 'MMM d, yyyy')}</span>
                      ) : (
                        <span className="text-xs text-zinc-600">Not released</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Due Date */}
              {drawingSet.due_date && (
                <Card className="bg-zinc-800/50 border-zinc-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Due Date</span>
                      <span className="text-sm font-medium">{format(new Date(drawingSet.due_date), 'MMM d, yyyy')}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Summary */}
              {drawingSet.ai_summary && (
                <Card className="bg-blue-500/10 border-blue-500/20">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2 text-blue-400">
                      <Brain size={16} />
                      AI Review Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-zinc-300">{drawingSet.ai_summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {drawingSet.notes && (
                <Card className="bg-zinc-800/50 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-sm">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-zinc-300">{drawingSet.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="sheets" className="space-y-3 mt-6">
              {/* Upload New Sheets */}
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div
                      onDrop={handleFilesDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center hover:border-amber-500/50 transition-colors cursor-pointer"
                    >
                      <input
                        type="file"
                        multiple
                        accept=".pdf"
                        onChange={handleFilesDrop}
                        className="hidden"
                        id="sheet-upload"
                      />
                      <label htmlFor="sheet-upload" className="cursor-pointer">
                        <Upload size={24} className="mx-auto text-zinc-500 mb-2" />
                        <p className="text-xs text-zinc-400">Add more sheets (PDF)</p>
                      </label>
                    </div>
                    
                    {uploadFiles.length > 0 && (
                      <div className="space-y-2">
                        {uploadFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-zinc-900 rounded text-xs">
                            <span>{file.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setUploadFiles(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <X size={12} />
                            </Button>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          onClick={handleUploadSheets}
                          disabled={uploadingSheets}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                        >
                          {uploadingSheets ? (
                            <>
                              <Loader2 size={14} className="animate-spin mr-2" />
                              Uploading...
                            </>
                          ) : (
                            `Upload ${uploadFiles.length} Sheet${uploadFiles.length !== 1 ? 's' : ''}`
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {sheets.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No sheets uploaded yet</p>
                </div>
              ) : (
                sheets.map(sheet => (
                  <Card key={sheet.id} className="bg-zinc-800/50 border-zinc-700">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText size={16} className="text-amber-500" />
                            <span className="font-mono text-sm text-amber-500">{sheet.sheet_number}</span>
                            {sheet.ai_reviewed && (
                              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">
                                AI Reviewed
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-zinc-300">{sheet.sheet_name}</p>
                          {sheet.ai_findings && (
                            <p className="text-xs text-zinc-500 mt-2">{sheet.ai_findings}</p>
                          )}
                          {sheet.uploaded_date && (
                            <p className="text-xs text-zinc-600 mt-1">
                              Uploaded {format(new Date(sheet.uploaded_date), 'MMM d, yyyy h:mm a')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(sheet.file_url, '_blank')}
                          >
                            <ExternalLink size={14} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="revisions" className="space-y-3 mt-6">
              {revisions.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <History size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No revision history</p>
                </div>
              ) : (
                revisions.map(rev => (
                  <Card key={rev.id} className="bg-zinc-800/50 border-zinc-700">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-amber-500">{rev.revision_number}</span>
                            <Badge variant="outline" className="text-xs">
                              {rev.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-zinc-300">{rev.description || 'No description'}</p>
                          {rev.submitted_by && (
                            <p className="text-xs text-zinc-500 mt-1">Submitted by {rev.submitted_by}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-zinc-500">
                            {format(new Date(rev.revision_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="ai" className="mt-6">
              <AIDrawingProcessor
                drawingSet={drawingSet}
                sheets={sheets}
                revisions={revisions}
                onUpdate={onUpdate}
              />
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Drawing Set?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete "{drawingSet.set_name}"? This will also delete all associated sheets and revisions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.();
                setShowDeleteDialog(false);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}