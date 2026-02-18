import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function DrawingSetForm({ projects, projectId, drawingSet, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    project_id: drawingSet?.project_id || projectId || '',
    title: drawingSet?.title || '',
    set_number: drawingSet?.set_number || '',
    status: drawingSet?.status || 'IFA',
    discipline: drawingSet?.discipline || 'structural',
    submitted_date: drawingSet?.submitted_date || '',
    approved_date: drawingSet?.approved_date || '',
    notes: drawingSet?.notes || '',
  });

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFilesDrop = async (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer?.files || e.target?.files || []);
    const pdfFiles = droppedFiles.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    
    if (pdfFiles.length !== droppedFiles.length) {
      alert('Only PDF files are allowed');
    }
    
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const setData = {
      ...formData,
      sheet_count: files.length,
    };

    // Just pass the data up - let parent handle creation
    onSubmit(setData);
  };

  const queueAIReview = async (setId, fileUrl, fileName) => {
    // Run AI review asynchronously (doesn't block)
    try {
      const prompt = `Review this construction drawing and provide a brief summary of:
1. Drawing type and purpose
2. Key dimensions or specifications
3. Any notable callouts or details
4. Potential issues or areas needing clarification

Keep the summary concise (2-3 sentences).`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [fileUrl],
      });

      // Update the sheet with AI findings
      const sheets = await base44.entities.DrawingSheet.filter({ 
        drawing_set_id: setId,
        file_name: fileName 
      });

      if (sheets.length > 0) {
        await base44.entities.DrawingSheet.update(sheets[0].id, {
          ai_reviewed: true,
          ai_findings: response,
        });
      }
    } catch (error) {
      console.error('AI review failed for', fileName, error);
      // Don't fail the whole operation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        {!projectId && (
          <div className="space-y-2">
            <Label>Project *</Label>
            <Select value={formData.project_id} onValueChange={(v) => handleChange('project_id', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Set Number *</Label>
          <Input
            value={formData.set_number}
            onChange={(e) => handleChange('set_number', e.target.value)}
            placeholder="e.g., S-100"
            required
            className="bg-zinc-800 border-zinc-700 font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label>Title *</Label>
          <Input
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g., Structural Steel - Level 1"
            required
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IFA">IFA - Issued for Approval</SelectItem>
                <SelectItem value="BFA">BFA - Back from Approval</SelectItem>
                <SelectItem value="BFS">BFS - Back from Shop</SelectItem>
                <SelectItem value="FFF">FFF - Fit for Fabrication</SelectItem>
                <SelectItem value="As-Built">As-Built</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Discipline</Label>
            <Select value={formData.discipline} onValueChange={(v) => handleChange('discipline', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="structural">Structural</SelectItem>
                <SelectItem value="architectural">Architectural</SelectItem>
                <SelectItem value="mechanical">Mechanical</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="civil">Civil</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Key Dates */}
      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">Key Dates</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Submitted Date</Label>
            <Input
              type="date"
              value={formData.submitted_date}
              onChange={(e) => handleChange('submitted_date', e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>Approved Date</Label>
            <Input
              type="date"
              value={formData.approved_date}
              onChange={(e) => handleChange('approved_date', e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
        </div>
      </div>

      {/* File Upload (only for new sets) */}
      {!drawingSet && (
        <div className="border-t border-zinc-800 pt-4">
          <Label className="mb-2 block">Upload Drawing Sheets (PDF)</Label>
          <div
            onDrop={handleFilesDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-amber-500/50 transition-colors cursor-pointer"
          >
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFilesDrop}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload size={32} className="mx-auto text-zinc-500 mb-2" />
              <p className="text-sm text-zinc-400">
                Drag & drop PDF files here, or click to browse
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Multiple files supported
              </p>
            </label>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-zinc-800 rounded">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-amber-500" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-zinc-500">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                    {uploadProgress[index] && (
                      <Badge variant="outline" className={
                        uploadProgress[index].status === 'done' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        uploadProgress[index].status === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }>
                        {uploadProgress[index].status === 'uploading' && <Loader2 size={10} className="animate-spin mr-1" />}
                        {uploadProgress[index].status}
                      </Badge>
                    )}
                  </div>
                  {!uploading && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6"
                    >
                      <X size={14} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel} className="border-zinc-700" disabled={uploading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || uploading} className="bg-amber-500 hover:bg-amber-600 text-black">
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Uploading...
            </>
          ) : isLoading ? (
            'Saving...'
          ) : drawingSet ? (
            'Update Set'
          ) : (
            'Create Set'
          )}
        </Button>
      </div>
    </form>
  );
}