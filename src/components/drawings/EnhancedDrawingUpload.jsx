import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function EnhancedDrawingUpload({ projectId, onComplete }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    set_number: '',
    title: '',
    discipline: 'structural',
    status: 'IFA',
    spec_section: ''
  });
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const handleFilesDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer?.files || e.target?.files || []);
    const pdfFiles = droppedFiles.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    
    if (pdfFiles.length !== droppedFiles.length) {
      toast.error('Only PDF files allowed');
      return;
    }
    
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!formData.set_number || !formData.title) {
      toast.error('Set number and title required');
      return;
    }

    if (files.length === 0) {
      toast.error('Add at least one drawing sheet');
      return;
    }

    setUploading(true);

    try {
      // Create drawing set
      const drawingSet = await base44.entities.DrawingSet.create({
        project_id: projectId,
        set_number: formData.set_number,
        title: formData.title,
        discipline: formData.discipline,
        spec_section: formData.spec_section,
        status: formData.status,
        submitted_date: new Date().toISOString().split('T')[0],
        sheet_count: files.length,
        total_revision_count: 1
      });

      // Create initial revision
      const revision = await base44.entities.DrawingRevision.create({
        project_id: projectId,
        drawing_set_id: drawingSet.id,
        revision_number: 'Rev 0',
        revision_date: new Date().toISOString().split('T')[0],
        description: 'Initial upload',
        status: formData.status,
        is_current: true
      });

      // Link revision back to drawing set
      await base44.entities.DrawingSet.update(drawingSet.id, {
        current_revision_id: revision.id
      });

      // Upload sheets
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({ ...prev, [i]: { status: 'uploading', progress: 0 } }));

        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        await base44.entities.DrawingSheet.create({
          project_id: projectId,
          drawing_set_id: drawingSet.id,
          sheet_number: file.name.replace('.pdf', ''),
          sheet_name: file.name.replace('.pdf', ''),
          file_url,
          file_name: file.name,
          file_size: file.size,
          uploaded_date: new Date().toISOString()
        });

        setUploadProgress(prev => ({ ...prev, [i]: { status: 'done', progress: 100 } }));
      }

      setUploading(false);
      setAnalyzing(true);
      toast.success('Upload complete. Running AI analysis...');

      // Run AI analysis
      const analysisResponse = await base44.functions.invoke('analyzeDrawingSetAI', {
        drawing_set_id: drawingSet.id,
        project_id: projectId
      });

      setAnalyzing(false);

      if (analysisResponse.data?.success) {
        const counts = analysisResponse.data.counts;
        toast.success(
          `Analysis complete: ${counts.conflicts} conflicts, ${counts.erection_issues} erection risks, ${counts.rfi_suggestions} RFI suggestions`
        );
      }

      queryClient.invalidateQueries(['drawing-sets']);
      queryClient.invalidateQueries(['drawing-sheets']);
      onComplete?.();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed');
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Set Info */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-200">Set Number *</Label>
            <Input
              value={formData.set_number}
              onChange={(e) => setFormData({ ...formData, set_number: e.target.value })}
              placeholder="S-100"
              className="bg-zinc-800 border-zinc-700 text-white font-mono"
              disabled={uploading || analyzing}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-200">Discipline</Label>
            <Select 
              value={formData.discipline} 
              onValueChange={(v) => setFormData({ ...formData, discipline: v })}
              disabled={uploading || analyzing}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="structural">Structural</SelectItem>
                <SelectItem value="architectural">Architectural</SelectItem>
                <SelectItem value="mechanical">Mechanical</SelectItem>
                <SelectItem value="civil">Civil</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-200">Title *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Structural Steel - Level 1"
            className="bg-zinc-800 border-zinc-700 text-white"
            disabled={uploading || analyzing}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-200">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(v) => setFormData({ ...formData, status: v })}
              disabled={uploading || analyzing}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IFA">IFA - Issued for Approval</SelectItem>
                <SelectItem value="BFA">BFA - Back from Approval</SelectItem>
                <SelectItem value="FFF">FFF - Fit for Fabrication</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-200">Spec Section</Label>
            <Input
              value={formData.spec_section}
              onChange={(e) => setFormData({ ...formData, spec_section: e.target.value })}
              placeholder="05 12 00"
              className="bg-zinc-800 border-zinc-700 text-white font-mono"
              disabled={uploading || analyzing}
            />
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="space-y-3">
        <Label className="text-zinc-200">Drawing Sheets (PDF)</Label>
        <div
          onDrop={handleFilesDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            uploading || analyzing ? "border-zinc-700 bg-zinc-900/30 cursor-not-allowed" : "border-zinc-700 hover:border-amber-500/50 bg-zinc-900/20"
          )}
        >
          <input
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFilesDrop}
            className="hidden"
            id="file-upload"
            disabled={uploading || analyzing}
          />
          <label htmlFor="file-upload" className={cn("cursor-pointer", (uploading || analyzing) && "cursor-not-allowed")}>
            <Upload size={40} className="mx-auto text-zinc-500 mb-3" />
            <p className="text-sm text-zinc-300 font-medium">
              Drag & drop PDF files here, or click to browse
            </p>
            <p className="text-xs text-zinc-600 mt-2">
              Supports multiple sheets • AI analysis will run automatically
            </p>
          </label>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded border border-zinc-700">
                <div className="flex items-center gap-3 flex-1">
                  <FileText size={16} className="text-amber-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{file.name}</div>
                    <div className="text-xs text-zinc-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  {uploadProgress[index] && (
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      uploadProgress[index].status === 'done' && "bg-green-500/10 text-green-400 border-green-500/20",
                      uploadProgress[index].status === 'uploading' && "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    )}>
                      {uploadProgress[index].status === 'uploading' && <Loader2 size={10} className="animate-spin mr-1" />}
                      {uploadProgress[index].status === 'done' && <CheckCircle2 size={10} className="mr-1" />}
                      {uploadProgress[index].status}
                    </Badge>
                  )}
                </div>
                {!uploading && !analyzing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    className="h-7 w-7 text-zinc-500 hover:text-red-400"
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Status */}
      {analyzing && (
        <Card className="bg-blue-900/20 border-blue-700/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-blue-400" />
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-300">Running AI Analysis...</div>
                <div className="text-xs text-zinc-400 mt-1">
                  Detecting conflicts, erection risks, and generating RFI suggestions
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={() => onComplete?.()}
          disabled={uploading || analyzing}
          className="border-zinc-700"
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={uploading || analyzing || files.length === 0 || !formData.set_number || !formData.title}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
        >
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Uploading {files.length} sheets...
            </>
          ) : analyzing ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Analyzing...
            </>
          ) : (
            <>
              <Upload size={16} className="mr-2" />
              Upload & Analyze
            </>
          )}
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="bg-zinc-800/30 border-zinc-700/50">
        <CardContent className="p-3">
          <div className="text-xs text-zinc-400 leading-relaxed">
            <strong className="text-zinc-300">AI Analysis will detect:</strong> Dimension conflicts (pit depths, elevations), 
            erection risks (anchor issues, access problems), missing specs, connection improvement opportunities, 
            and design intent changes requiring PM review.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}